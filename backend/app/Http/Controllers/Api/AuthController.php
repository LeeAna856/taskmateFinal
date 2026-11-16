<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user, log them in and return an auth token.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'terms' => ['required', 'accepted'],
        ], [
            'name.required' => 'Your full name is required.',
            'email.required' => 'The email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'An account with this email already exists.',
            'password.required' => 'The password is required.',
            'password.confirmed' => 'The password confirmation does not match.',
            'password.min' => 'The password must be at least 8 characters long.',
            'terms.required' => 'You must agree to the Terms of Service to create an account.',
            'terms.accepted' => 'You must agree to the Terms of Service to create an account.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        TaskNotification::send(
            $user,
            'system',
            'Welcome to TaskMate',
            'Your workspace is ready. Create your first task to get started.',
        );

        return response()->json([
            'message' => 'Your account has been created successfully.',
            'user' => $this->userPayload($user),
            'token' => $this->issueToken($user, false),
        ], 201);
    }

    /**
     * Authenticate a user and issue an auth token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ], [
            'email.required' => 'The email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'The password is required.',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Invalidate previous sessions/tokens for a clean device list.
        $user->tokens()->where('name', 'taskmate-auth')->delete();

        return response()->json([
            'message' => 'Welcome back, '.$user->name.'!',
            'user' => $this->userPayload($user),
            'token' => $this->issueToken($user, (bool) ($credentials['remember'] ?? false)),
            'remember' => (bool) ($credentials['remember'] ?? false),
        ]);
    }

    /**
     * Log the current user out and revoke their tokens.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'message' => 'You have been logged out successfully.',
        ]);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
        ], [
            'name.required' => 'Your full name is required.',
            'email.required' => 'The email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'An account with this email already exists.',
        ]);

        $user->fill($validated)->save();

        return response()->json([
            'message' => 'Your profile has been updated.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    /**
     * Upload or replace the authenticated user's avatar.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'photo.required' => 'Choose an image to upload.',
            'photo.image' => 'The profile photo must be an image.',
            'photo.mimes' => 'Use a JPG, PNG or WebP image.',
            'photo.max' => 'The profile photo may not be larger than 2 MB.',
        ]);

        $user = $request->user();

        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        $user->forceFill(['profile_photo' => $path])->save();

        return response()->json([
            'message' => 'Profile photo updated.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    /**
     * Remove the authenticated user's avatar.
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
            $user->forceFill(['profile_photo' => null])->save();
        }

        return response()->json([
            'message' => 'Profile photo removed.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], [
            'current_password.required' => 'Please enter your current password.',
            'password.required' => 'The new password is required.',
            'password.confirmed' => 'The password confirmation does not match.',
            'password.min' => 'The password must be at least 8 characters long.',
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password you entered is incorrect.',
            ]);
        }

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        $request->user()->tokens()->where('name', 'taskmate-auth')->delete();

        return response()->json([
            'message' => 'Your password has been changed successfully.',
            'token' => $this->issueToken($request->user(), true),
        ]);
    }

    /**
     * Issue a Sanctum token. Remembered sessions live longer than normal ones.
     */
    private function issueToken(User $user, bool $remember): string
    {
        $token = $user->createToken('taskmate-auth');

        $token->accessToken->forceFill([
            'expires_at' => $remember ? now()->addDays(30) : now()->addDay(),
        ])->save();

        return $token->plainTextToken;
    }

    /**
     * Shape the user resource returned to the front-end.
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'profile_photo' => $user->profile_photo,
            'profile_photo_url' => $user->profile_photo_url,
            'initials' => $user->initials,
            'created_at' => optional($user->created_at)->toDateTimeString(),
        ];
    }
}
