<?php

namespace App\Providers;

use App\Models\Task;
use App\Policies\TaskPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Explicitly bind the task policy so ownership checks always run.
        Gate::policy(Task::class, TaskPolicy::class);

        // Trash routes operate on soft deleted tasks, which the default
        // route model binding cannot resolve. Bind them explicitly.
        Route::bind('trashedTask', function ($value) {
            return Task::withTrashed()->findOrFail($value);
        });
    }
}
