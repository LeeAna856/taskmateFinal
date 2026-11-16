<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Lightweight global search used by the top navigation bar.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $term = trim((string) ($validated['q'] ?? ''));

        if ($term === '') {
            return response()->json([
                'query' => '',
                'results' => [],
                'total' => 0,
            ]);
        }

        $query = Task::query()
            ->where('user_id', $request->user()->id)
            ->where(function ($q) use ($term) {
                $q->where('title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            })
            ->orderByDesc('created_at');

        $total = (clone $query)->count();

        $results = $query->limit(8)->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'due_date' => $task->due_date?->format('Y-m-d'),
        ]);

        return response()->json([
            'query' => $term,
            'results' => $results,
            'total' => $total,
        ]);
    }
}
