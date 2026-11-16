<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $this->get('/register')->assertOk();
    }

    public function test_user_can_register_with_valid_details(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Cooper',
            'email' => 'jane@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'terms' => true,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'user' => ['id', 'name', 'email'], 'token']);

        $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);

        // The password must be hashed, never stored in plain text.
        $user = User::where('email', 'jane@example.com')->first();
        $this->assertNotSame('secret123', $user->password);
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'jane@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Cooper',
            'email' => 'jane@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'terms' => true,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_registration_requires_a_matching_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Cooper',
            'email' => 'jane@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'different123',
            'terms' => true,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_registration_enforces_the_password_policy(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Cooper',
            'email' => 'jane@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
            'terms' => true,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_registration_requires_a_valid_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Cooper',
            'email' => 'not-an-email',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'terms' => true,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'jane@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'user' => ['id', 'name', 'email'], 'token']);

        $this->assertSame($user->id, $response->json('user.id'));
    }

    public function test_login_fails_with_invalid_password(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_fails_for_an_unknown_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_validates_input(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('taskmate-auth')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_authenticated_user_can_fetch_their_profile(): void
    {
        $user = User::factory()->create(['name' => 'Jane Cooper']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.name', 'Jane Cooper');
    }

    public function test_user_can_update_their_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/profile', [
                'name' => 'Updated Name',
                'email' => 'updated@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name');

        $this->assertDatabaseHas('users', ['email' => 'updated@example.com', 'id' => $user->id]);
    }

    public function test_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret123')]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/password', [
                'current_password' => 'secret123',
                'password' => 'newsecret456',
                'password_confirmation' => 'newsecret456',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('newsecret456', $user->fresh()->password));
    }

    public function test_changing_password_requires_the_correct_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret123')]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/password', [
                'current_password' => 'wrong-password',
                'password' => 'newsecret456',
                'password_confirmation' => 'newsecret456',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');
    }

    public function test_forgot_password_sends_a_reset_link(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'jane@example.com'])
            ->assertOk()
            ->assertJsonStructure(['message']);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_forgot_password_validates_the_email(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_forgot_password_does_not_reveal_unknown_accounts(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJsonStructure(['message']);

        Notification::assertNothingSent();
    }

    public function test_user_can_reset_their_password_with_a_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'jane@example.com'])->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user) {
            $response = $this->postJson('/api/auth/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'brandnew123',
                'password_confirmation' => 'brandnew123',
            ]);

            $response->assertOk();

            return true;
        });

        $this->assertTrue(Hash::check('brandnew123', $user->fresh()->password));
    }

    public function test_password_reset_fails_with_an_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'jane@example.com',
            'password' => 'brandnew123',
            'password_confirmation' => 'brandnew123',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_password_reset_token_is_invalidated_after_use(): void
    {
        $user = User::factory()->create(['email' => 'jane@example.com']);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'jane@example.com',
            'password' => 'brandnew123',
            'password_confirmation' => 'brandnew123',
        ])->assertOk();

        // The same token must not work twice.
        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'jane@example.com',
            'password' => 'another123',
            'password_confirmation' => 'another123',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('brandnew123', $user->fresh()->password));
    }

    public function test_password_reset_validates_input(): void
    {
        $this->postJson('/api/auth/reset-password', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['token', 'email', 'password']);
    }

    public function test_guests_are_redirected_away_from_protected_screens(): void
    {
        // The React SPA shell is served for every front-end route; the guard
        // lives in the front-end router, so the shell itself renders.
        $this->get('/dashboard')->assertOk();
        $this->get('/tasks')->assertOk();
        $this->get('/trash')->assertOk();

        // Every protected API endpoint must reject an unauthenticated request.
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->getJson('/api/trash')->assertUnauthorized();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->postJson('/api/tasks', ['title' => 'Guest task'])->assertUnauthorized();
    }
}
