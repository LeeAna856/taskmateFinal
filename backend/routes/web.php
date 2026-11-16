<?php

use Illuminate\Support\Facades\Route;

Route::view('/{any}', 'app')->where('any', '^(?!api|sanctum|build|storage).*$');

/*
|--------------------------------------------------------------------------
| Web routes
|--------------------------------------------------------------------------
| The TaskMate front-end is a Vite + React single page application. The
| web routes simply serve the SPA shell (resources/views/app.blade.php)
| and keep the password reset route reachable for the notification link.
*/

// Guest screens. These are named because Laravel's auth middleware
// redirects unauthenticated visitors to route('login').
Route::get('/login', function () {
    return view('app');
})->name('login');

Route::get('/register', function () {
    return view('app');
})->name('register');

Route::get('/forgot-password', function () {
    return view('app');
})->name('forgot-password');

// Password reset link target (the notification points here, React reads the token).
Route::get('/reset-password/{token}', function (string $token) {
    return view('app');
})->name('password.reset');

// The React router decides where "/" lands (dashboard when signed in, login otherwise).
Route::get('/', function () {
    return view('app');
})->name('welcome');

// Catch-all: serve the React SPA shell for every other front-end route.
Route::get('/{path}', function (string $path = '') {
    return view('app');
})->where('path', '^(?!api|up|storage|build|assets).*$')->name('spa');

