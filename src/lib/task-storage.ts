import type { Task } from '@/types';

/**
 * Normalizes task data received from Firestore or other sources
 * to ensure it matches the Task type.
 */
export function normalizeStoredTasks(rawValue: unknown): Task[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((task) => task as Partial<Task>)
    .filter((task) => {
      const hasName = typeof task.name === 'string' && task.name.trim().length > 0;
      const hasId = typeof task.id === 'string' || typeof task.id === 'number';
      return hasName && hasId;
    })
    .map((task) => ({
      id: String(task.id),
      name: String(task.name).trim(),
      description: typeof task.description === 'string' ? task.description : undefined,
      dueDate: typeof task.dueDate === 'string' ? task.dueDate : undefined,
      priority: task.priority === 'low' || task.priority === 'medium' || task.priority === 'high' ? task.priority : undefined,
      status:
        task.status === 'todo' || task.status === 'inprogress' || task.status === 'done' || task.status === 'blocked'
          ? task.status
          : 'todo',
      category: typeof task.category === 'string' ? task.category : undefined,
      subTasks: Array.isArray(task.subTasks) ? task.subTasks : undefined,
      startTime: typeof task.startTime === 'string' ? task.startTime : undefined,
      endTime: typeof task.endTime === 'string' ? task.endTime : undefined,
    }));
}
