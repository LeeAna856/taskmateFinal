<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrashTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    public function test_trash_lists_only_soft_deleted_tasks_of_the_user(): void
    {
        $user = $this->actingAsUser();
        $trashed = Task::factory()->forUser($user)->create(['title' => 'Trashed one']);
        $trashed->delete();
        Task::factory()->forUser($user)->create(['title' => 'Still active']);
        Task::factory()->create(['title' => 'Other user trashed'])->delete();

        $response = $this->getJson('/api/trash')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Trashed one', $response->json('data.0.title'));
    }

    public function test_trash_search_filters_results(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->forUser($user)->create(['title' => 'Old report'])->delete();
        Task::factory()->forUser($user)->create(['title' => 'Old invoice'])->delete();

        $response = $this->getJson('/api/trash?search=invoice')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame('Old invoice', $response->json('data.0.title'));
    }

    public function test_trash_is_paginated(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(8)->forUser($user)->create()->each->delete();

        $response = $this->getJson('/api/trash?per_page=3')->assertOk();

        $this->assertCount(3, $response->json('data'));
        $this->assertSame(8, $response->json('meta.total'));
    }

    public function test_a_trashed_task_can_be_restored(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create(['title' => 'Bring it back']);
        $task->delete();

        $this->patchJson('/api/trash/'.$task->id.'/restore')
            ->assertOk()
            ->assertJsonPath('task.title', 'Bring it back');

        $this->assertNotSoftDeleted('tasks', ['id' => $task->id]);
        $this->assertSame(1, $this->getJson('/api/tasks')->assertOk()->json('meta.total'));
    }

    public function test_restore_all_returns_every_trashed_task_to_the_active_list(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(3)->forUser($user)->create()->each->delete();
        Task::factory()->create()->delete(); // Another user's task.

        $this->postJson('/api/trash/restore-all')
            ->assertOk()
            ->assertJsonPath('message', '3 task(s) restored successfully.');

        $this->assertSame(3, $this->getJson('/api/tasks')->assertOk()->json('meta.total'));
        $this->assertSame(0, $this->getJson('/api/trash')->assertOk()->json('meta.total'));
    }

    public function test_restore_all_on_an_empty_trash_reports_nothing_to_restore(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/trash/restore-all')
            ->assertOk()
            ->assertJsonPath('message', 'There are no tasks in the trash to restore.');
    }

    public function test_a_trashed_task_can_be_permanently_deleted(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create();
        $task->delete();

        $this->deleteJson('/api/trash/'.$task->id)
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_empty_trash_permanently_deletes_every_trashed_task(): void
    {
        $user = $this->actingAsUser();
        Task::factory()->count(4)->forUser($user)->create()->each->delete();
        $other = Task::factory()->create();
        $other->delete();

        $this->postJson('/api/trash/empty')
            ->assertOk()
            ->assertJsonPath('message', '4 task(s) permanently deleted.');

        $this->assertSoftDeleted('tasks', ['id' => $other->id]);
    }

    public function test_empty_trash_on_an_empty_trash_reports_it_is_already_empty(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/trash/empty')
            ->assertOk()
            ->assertJsonPath('message', 'The trash is already empty.');
    }

    public function test_a_deleted_task_is_hidden_from_the_active_task_list(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create(['title' => 'Hidden']);
        $task->delete();

        $response = $this->getJson('/api/tasks')->assertOk();

        $this->assertSame(0, $response->json('meta.total'));
        $this->assertNull($response->json('data.0') ?? null);
    }

    public function test_a_trashed_task_cannot_be_fetched_from_the_active_endpoints(): void
    {
        $user = $this->actingAsUser();
        $task = Task::factory()->forUser($user)->create();
        $task->delete();

        $this->getJson('/api/tasks/'.$task->id)->assertNotFound();
        $this->putJson('/api/tasks/'.$task->id, [
            'title' => 'Sneaky',
            'priority' => 'Low',
            'status' => 'Not Started',
        ])->assertNotFound();
    }

    public function test_guests_cannot_reach_the_trash_endpoints(): void
    {
        $this->getJson('/api/trash')->assertUnauthorized();
        $this->postJson('/api/trash/restore-all')->assertUnauthorized();
        $this->postJson('/api/trash/empty')->assertUnauthorized();
        $this->patchJson('/api/trash/1/restore')->assertUnauthorized();
        $this->deleteJson('/api/trash/1')->assertUnauthorized();
    }
}
