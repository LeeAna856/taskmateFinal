<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TaskCommentController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TrashController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TaskMate API routes
|--------------------------------------------------------------------------
| Consumed by the Vite + React front-end. All task routes are protected
| with Sanctum and scoped to the authenticated user's own records.
*/

Route::prefix('auth')->group(function () {
    // Guest routes.
    Route::post('register', [AuthController::class, 'register'])->name('api.auth.register');
    Route::post('login', [AuthController::class, 'login'])->name('api.auth.login');

    Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink'])->name('api.auth.forgot-password');
    Route::post('reset-password', [PasswordResetController::class, 'resetPassword'])->name('api.auth.reset-password');

    // Authenticated routes.
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('api.auth.logout');
        Route::get('me', [AuthController::class, 'me'])->name('api.auth.me');
        Route::put('profile', [AuthController::class, 'updateProfile'])->name('api.auth.profile');
        Route::post('profile/photo', [AuthController::class, 'uploadPhoto'])->name('api.auth.profile.photo');
        Route::delete('profile/photo', [AuthController::class, 'deletePhoto'])->name('api.auth.profile.photo.destroy');
        Route::put('password', [AuthController::class, 'updatePassword'])->name('api.auth.password');
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('api.dashboard');
    Route::get('search', [SearchController::class, 'index'])->name('api.search');
    Route::get('members', [MemberController::class, 'index'])->name('api.members');

    // Task resource routes (index, store, show, update, destroy).
    Route::apiResource('tasks', TaskController::class)->names('api.tasks');

    // Extra task actions.
    Route::patch('tasks/{task}/toggle', [TaskController::class, 'toggle'])->name('api.tasks.toggle');
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('api.tasks.status');
    Route::get('tasks/{task}/comments', [TaskCommentController::class, 'index'])->name('api.tasks.comments.index');
    Route::post('tasks/{task}/comments', [TaskCommentController::class, 'store'])->name('api.tasks.comments.store');

    // Notifications.
    Route::get('notifications', [NotificationController::class, 'index'])->name('api.notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('api.notifications.unread-count');
    Route::patch('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('api.notifications.read-all');
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('api.notifications.read');
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('api.notifications.destroy');

    // Trash (soft deleted tasks).
    Route::get('trash', [TrashController::class, 'index'])->name('api.trash.index');
    Route::post('trash/restore-all', [TrashController::class, 'restoreAll'])->name('api.trash.restore-all');
    Route::post('trash/empty', [TrashController::class, 'emptyTrash'])->name('api.trash.empty');
    Route::patch('trash/{trashedTask}/restore', [TrashController::class, 'restore'])->name('api.trash.restore');
    Route::delete('trash/{trashedTask}', [TrashController::class, 'forceDestroy'])->name('api.trash.force-destroy');
});
