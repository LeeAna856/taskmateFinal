<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TrashController extends Controller
{
    /**
     * List the soft deleted tasks for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 10), 1), 50);

        $trashed = Task::onlyTrashed()
            ->where('user_id', Auth::id())
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->input('search'));
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->orderByDesc('deleted_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $trashed->items(),
            'meta' => [
                'current_page' => $trashed->currentPage(),
                'last_page' => $trashed->lastPage(),
                'per_page' => $trashed->perPage(),
                'total' => $trashed->total(),
                'from' => $trashed->firstItem(),
                'to' => $trashed->lastItem(),
            ],
        ]);
    }

    /**
     * Restore a single task from the trash.
     */
    public function restore(Task $trashedTask): JsonResponse
    {
        $this->authorize('restore', $trashedTask);

        $trashedTask->restore();

        return response()->json([
            'message' => 'Task restored successfully.',
            'task' => $trashedTask->fresh(),
        ]);
    }

    /**
     * Restore every trashed task for the authenticated user.
     */
    public function restoreAll(): JsonResponse
    {
        $count = Task::onlyTrashed()->where('user_id', Auth::id())->restore();

        return response()->json([
            'message' => $count === 0
                ? 'There are no tasks in the trash to restore.'
                : $count.' task(s) restored successfully.',
        ]);
    }

    /**
     * Permanently delete a single task.
     */
    public function forceDestroy(Task $trashedTask): JsonResponse
    {
        $this->authorize('forceDelete', $trashedTask);

        $trashedTask->forceDelete();

        return response()->json([
            'message' => 'Task permanently deleted.',
        ]);
    }

    /**
     * Permanently delete every trashed task for the authenticated user.
     */
    public function emptyTrash(): JsonResponse
    {
        $count = Task::onlyTrashed()->where('user_id', Auth::id())->forceDelete();

        return response()->json([
            'message' => $count === 0
                ? 'The trash is already empty.'
                : $count.' task(s) permanently deleted.',
        ]);
    }
}
