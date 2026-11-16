<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    /* -----------------------------------------------------------------
     | Create
     * ----------------------------------------------------------------- */

    public function test_user_can_create_a_task(): void
    {
        $user = $this->actingAsUser();

        $response = $this->postJson('/api/tasks', [
            'title' => 'Write the quarterly report',
            'description' => 'Include the revenue numbers.',
            'due_date' => '2030-05-01',
            'priority' => 'High',
            'status' => 'Not Started',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'task' => ['id', 'title', 'description', 'due_date', 'priority', 'status']]);

        $this->assertDatabaseHas('tasks', [
            'user_id' => $user->id,
            'title' => 'Write the quarterly report',
            'priority' => 'High',
            'status' => 'Not Started',
        ]);
    }

    public function test_created_task_is_associated_with_the_authenticated_user(): void
    {
        $user = $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title' => 'Owned task',
            'priority' => 'Low',
            'status' => 'In Progress',
        ])->assertCreated();

        $this->assertSame($user->id, Task::first()->user_id);
    }

    public function test_creating_a_task_requires_a_title(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title' => '',
            'priority' => 'Low',
            'status' => 'Not Started',
        ])->assertStatus(422)->assertJsonValidationErrors('title');
    }

    public function test_creating_a_task_validates_priority_and_status(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title' => 'Invalid task',
            'priority' => 'Urgent',
            'status' => 'Doing',
        ])->assertStatus(422)->assertJsonValidationErrors(['priority', 'status']);
    }

    public function test_due_date_is_optional(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title' => 'No due date',
            'priority' => 'Low',
            'status' => 'Not Started',
        ])->assertCreated()->assertJsonPath('task.due_date', null);
    }

    public function test_a_user_id_cannot_be_injected_when_creating_a_task(): void
    {
        $other = User::factory()->create();
        $this->actingAsUser();

        $this->postJson('/api/tasks', [
            'title' => 'Injected task',
            'user_id' => $other->id,
            'priority' => 'Low',
            'status' => 'Not Started',
        ])->assertCreated();

        $this->assertDatabaseMissing('tasks', ['title' => 'Injected task', 'user_id' => $other->id]);
    }

    /* -----------------------------------------------------------------
     | Read
     * ----------------------------------------------------------------- */

    public function test_user_sees_only_their_own_tasks(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'My task']);
        Task::factory()->create(['title' => 'Someone elses task']);

        $response = $this->getJson('/api/tasks')->assertOk();

        $titles = array_column($response->json('data'), 'title');
        $this->assertContains('My task', $titles);
        $this->assertNotContains('Someone elses task', $titles);
        $this->assertSame(1, $response->json('meta.total'));
    }

    public function test_user_can_view_a_single_task(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create(['title' => 'Readable task']);

        $this->getJson('/api/tasks/'.$task->id)
            ->assertOk()
            ->assertJsonPath('task.title', 'Readable task');
    }

    public function test_task_list_is_paginated(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(12)->forUser($user)->create();

        $response = $this->getJson('/api/tasks?per_page=5')->assertOk();

        $this->assertCount(5, $response->json('data'));
        $this->assertSame(12, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
    }

    /* -----------------------------------------------------------------
     | Update
     * ----------------------------------------------------------------- */

    public function test_user_can_update_a_task(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create([
            'title' => 'Old title',
            'priority' => 'Low',
            'status' => 'Not Started',
        ]);

        $this->putJson('/api/tasks/'.$task->id, [
            'title' => 'New title',
            'description' => 'Updated description',
            'due_date' => '2030-06-15',
            'priority' => 'High',
            'status' => 'In Progress',
        ])->assertOk()
            ->assertJsonPath('task.title', 'New title')
            ->assertJsonPath('task.priority', 'High')
            ->assertJsonPath('task.status', 'In Progress');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'New title',
            'priority' => 'High',
            'status' => 'In Progress',
        ]);
    }

    public function test_updating_a_task_validates_the_payload(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create();

        $this->putJson('/api/tasks/'.$task->id, [
            'title' => '',
            'priority' => 'Nope',
            'status' => 'Nope',
        ])->assertStatus(422)->assertJsonValidationErrors(['title', 'priority', 'status']);
    }

    public function test_user_can_toggle_a_task_between_completed_and_in_progress(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create(['status' => 'In Progress']);

        $this->patchJson('/api/tasks/'.$task->id.'/toggle')
            ->assertOk()
            ->assertJsonPath('task.status', 'Completed');

        $this->assertSame('Completed', $task->fresh()->status);

        $this->patchJson('/api/tasks/'.$task->id.'/toggle')
            ->assertOk()
            ->assertJsonPath('task.status', 'In Progress');
    }

    public function test_user_can_update_only_the_status(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create(['status' => 'Not Started']);

        $this->patchJson('/api/tasks/'.$task->id.'/status', ['status' => 'Completed'])
            ->assertOk()
            ->assertJsonPath('task.status', 'Completed');
    }

    public function test_status_update_validates_the_status(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create();

        $this->patchJson('/api/tasks/'.$task->id.'/status', ['status' => 'Invalid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    /* -----------------------------------------------------------------
     | Delete
     * ----------------------------------------------------------------- */

    public function test_deleting_a_task_moves_it_to_the_trash(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create();

        $this->deleteJson('/api/tasks/'.$task->id)
            ->assertOk()
            ->assertJsonStructure(['message']);

        // Soft deleted: still in the table but excluded from the active list.
        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id, 'deleted_at' => null]);

        $response = $this->getJson('/api/tasks')->assertOk();
        $this->assertSame(0, $response->json('meta.total'));
    }

    /* -----------------------------------------------------------------
     | Search, filter, sort
     * ----------------------------------------------------------------- */

    public function test_tasks_can_be_searched_by_title(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Write documentation']);
        Task::factory()->forUser($user)->create(['title' => 'Buy groceries']);

        $response = $this->getJson('/api/tasks?search=documentation')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Write documentation', $response->json('data.0.title'));
    }

    public function test_tasks_can_be_searched_by_description(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Task A', 'description' => 'invoice the client']);
        Task::factory()->forUser($user)->create(['title' => 'Task B', 'description' => 'water the plants']);

        $response = $this->getJson('/api/tasks?search=invoice')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Task A', $response->json('data.0.title'));
    }

    public function test_tasks_can_be_filtered_by_status(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Active', 'status' => 'In Progress']);
        Task::factory()->forUser($user)->create(['title' => 'Done', 'status' => 'Completed']);
        Task::factory()->forUser($user)->create(['title' => 'Fresh', 'status' => 'Not Started']);

        $response = $this->getJson('/api/tasks?status=In Progress')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Active', $response->json('data.0.title'));
    }

    public function test_tasks_can_be_filtered_by_priority(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Urgent', 'priority' => 'High']);
        Task::factory()->forUser($user)->create(['title' => 'Chill', 'priority' => 'Low']);

        $response = $this->getJson('/api/tasks?priority=High')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Urgent', $response->json('data.0.title'));
    }

    public function test_tasks_can_be_filtered_by_due_date(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Overdue', 'due_date' => now()->subWeek(), 'status' => 'Not Started']);
        Task::factory()->forUser($user)->create(['title' => 'Today', 'due_date' => today()]);
        Task::factory()->forUser($user)->create(['title' => 'No date', 'due_date' => null]);

        $this->assertSame(1, $this->getJson('/api/tasks?due=today')->assertOk()->json('meta.total'));
        $this->assertSame(1, $this->getJson('/api/tasks?due=overdue')->assertOk()->json('meta.total'));
        $this->assertSame(1, $this->getJson('/api/tasks?due=no_due_date')->assertOk()->json('meta.total'));
    }

    public function test_search_and_filters_work_together(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Report draft', 'status' => 'In Progress', 'priority' => 'High']);
        Task::factory()->forUser($user)->create(['title' => 'Report final', 'status' => 'In Progress', 'priority' => 'Low']);
        Task::factory()->forUser($user)->create(['title' => 'Report notes', 'status' => 'Completed', 'priority' => 'High']);

        $response = $this->getJson('/api/tasks?search=report&status=In Progress&priority=High')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Report draft', $response->json('data.0.title'));
    }

    public function test_tasks_can_be_sorted_by_title(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Banana']);
        Task::factory()->forUser($user)->create(['title' => 'Apple']);
        Task::factory()->forUser($user)->create(['title' => 'Cherry']);

        $asc = $this->getJson('/api/tasks?sort=title&direction=asc')->assertOk();
        $this->assertSame('Apple', $asc->json('data.0.title'));
        $this->assertSame('Cherry', $asc->json('data.2.title'));

        $desc = $this->getJson('/api/tasks?sort=title&direction=desc')->assertOk();
        $this->assertSame('Cherry', $desc->json('data.0.title'));
    }

    public function test_tasks_can_be_sorted_by_due_date(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Later', 'due_date' => '2030-12-01']);
        Task::factory()->forUser($user)->create(['title' => 'Sooner', 'due_date' => '2030-01-01']);

        $asc = $this->getJson('/api/tasks?sort=due_date&direction=asc')->assertOk();
        $this->assertSame('Sooner', $asc->json('data.0.title'));

        $desc = $this->getJson('/api/tasks?sort=due_date&direction=desc')->assertOk();
        $this->assertSame('Later', $desc->json('data.0.title'));
    }

    public function test_tasks_can_be_sorted_by_priority(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Low', 'priority' => 'Low']);
        Task::factory()->forUser($user)->create(['title' => 'High', 'priority' => 'High']);
        Task::factory()->forUser($user)->create(['title' => 'Medium', 'priority' => 'Medium']);

        $response = $this->getJson('/api/tasks?sort=priority&direction=desc')->assertOk();

        $this->assertSame('High', $response->json('data.0.title'));
        $this->assertSame('Medium', $response->json('data.1.title'));
        $this->assertSame('Low', $response->json('data.2.title'));
    }

    public function test_tasks_can_be_sorted_by_creation_date(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Older', 'created_at' => now()->subDays(2)]);
        Task::factory()->forUser($user)->create(['title' => 'Newer', 'created_at' => now()]);

        $asc = $this->getJson('/api/tasks?sort=created_at&direction=asc')->assertOk();
        $this->assertSame('Older', $asc->json('data.0.title'));

        $desc = $this->getJson('/api/tasks?sort=created_at&direction=desc')->assertOk();
        $this->assertSame('Newer', $desc->json('data.0.title'));
    }

    public function test_an_invalid_sort_column_falls_back_to_the_default(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create();

        $this->getJson('/api/tasks?sort=drop_table&direction=asc')->assertOk()->assertJsonStructure(['data', 'meta']);
    }
}
