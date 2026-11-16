<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\TaskNotification;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'taskmate:send-reminders';

    protected $description = 'Create TaskMate reminder notifications for tasks that are due soon.';

    public function handle(): int
    {
        $created = 0;

        $tasks = Task::query()
            ->whereNotNull('due_date')
            ->whereDate('due_date', today()->addDay())
            ->where('status', '!=', 'Completed')
            ->with(['user', 'assignees'])
            ->get();

        foreach ($tasks as $task) {
            $recipients = collect([$task->user])
                ->merge($task->assignees)
                ->filter()
                ->unique('id');

            foreach ($recipients as $recipient) {
                $alreadyNotified = TaskNotification::where('user_id', $recipient->id)
                    ->where('task_id', $task->id)
                    ->where('type', 'reminder')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadyNotified) {
                    continue;
                }

                TaskNotification::send(
                    $recipient,
                    'reminder',
                    'Reminder: '.$task->title,
                    $task->title.' is due tomorrow.',
                    $task,
                    ['due_date' => $task->due_date?->format('Y-m-d')]
                );

                $created++;
            }
        }

        $this->info($created.' reminder notification(s) created.');

        return self::SUCCESS;
    }
}
