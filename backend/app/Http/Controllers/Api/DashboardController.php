<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Live summary counters, completion progress, upcoming work and recent tasks.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today = today();

        $allTasks = Task::where('user_id', $userId)->count();
        $inProgress = Task::where('user_id', $userId)->where('status', 'In Progress')->count();
        $notStarted = Task::where('user_id', $userId)->where('status', 'Not Started')->count();
        $completed = Task::where('user_id', $userId)->where('status', 'Completed')->count();
        $overdue = Task::where('user_id', $userId)->overdue()->count();
        $trashed = Task::onlyTrashed()->where('user_id', $userId)->count();

        $percent = fn (int $count): float => $allTasks === 0
            ? 0.0
            : round(($count / $allTasks) * 100, 1);

        $upcoming = Task::where('user_id', $userId)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today)
            ->where('status', '!=', 'Completed')
            ->with('assignees:id,name,email,profile_photo')
            ->orderBy('due_date', 'asc')
            ->limit(5)
            ->get();

        $recent = Task::where('user_id', $userId)
            ->with('assignees:id,name,email,profile_photo')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'stats' => [
                'all' => $allTasks,
                'in_progress' => $inProgress,
                'not_started' => $notStarted,
                'completed' => $completed,
                'overdue' => $overdue,
                'trashed' => $trashed,
            ],
            'progress' => [
                'percent' => $percent($completed),
                'in_progress_percent' => $percent($inProgress),
                'not_started_percent' => $percent($notStarted),
                'completed_percent' => $percent($completed),
            ],
            'upcoming' => $upcoming,
            'recent' => $recent,
        ]);
    }
}
