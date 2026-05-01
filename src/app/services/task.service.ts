import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly STORAGE_KEY = 'wevy_tasks';
  private tasksSubject: BehaviorSubject<Task[]>;
  private readonly colors = ['#FFB088', '#FF8B94', '#FFC75F', '#A8D5BA', '#F9AF9F'];
  
  // Mock data initial pour le MVP
  private defaultTasks: Task[] = [
    {
      id: '1',
      title: 'Faire la vaisselle',
      assignedTo: 'user1',
      assignedToName: 'Sophie',
      isCompleted: false,
      householdId: 'household1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      title: 'Sortir les poubelles',
      assignedTo: 'user2',
      assignedToName: 'Marc',
      isCompleted: false,
      householdId: 'household1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      title: 'Passer l\'aspirateur',
      assignedTo: 'user1',
      assignedToName: 'Sophie',
      isCompleted: true,
      completedAt: new Date(Date.now() - 86400000), // Yesterday
      householdId: 'household1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  constructor() {
    const storedTasks = this.loadFromStorage();
    // loadFromStorage() retourne déjà les tâches enrichies
    this.tasksSubject = new BehaviorSubject<Task[]>(storedTasks);
    
    // Si pas de données en storage, sauvegarder les données par défaut
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      this.saveToStorage(storedTasks);
    }
  }

  private loadFromStorage(): Task[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const tasks = JSON.parse(stored) as Task[];
        // Convert date strings back to Date objects and add colors
        return tasks.map((task) => this.enrichTask({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
    }
    // Retourner une copie des données par défaut
    return this.defaultTasks.map(task => this.enrichTask(task));
  }

  private enrichTask(task: Task): Task {
    // Créer une copie pour éviter les mutations
    const enrichedTask: Task = { ...task };
    
    // Toujours calculer et assigner la couleur
    if (task.assignedToName && task.assignedToName.trim()) {
      const index = task.assignedToName.charCodeAt(0) % this.colors.length;
      enrichedTask.avatarColor = this.colors[index];
    } else {
      enrichedTask.avatarColor = this.colors[0];
    }
    
    return enrichedTask;
  }

  private saveToStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  private updateTasks(tasks: Task[]): void {
    console.log('updateTasks() called with', tasks.length, 'tasks');
    const enrichedTasks = tasks.map(task => this.enrichTask(task));
    this.saveToStorage(enrichedTasks);
    console.log('Emitting new tasks via BehaviorSubject:', enrichedTasks);
    this.tasksSubject.next(enrichedTasks);
  }

  /**
   * Observable de toutes les tâches
   */
  get tasks$(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  /**
   * Observable des tâches à faire aujourd'hui (non complétées)
   */
  get todayTasks$(): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(task => !task.isCompleted))
    );
  }

  /**
   * Observable des tâches complétées
   */
  get completedTasks$(): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(task => task.isCompleted))
    );
  }

  /**
   * Récupère toutes les tâches (snapshot)
   */
  getTasks(): Task[] {
    return this.tasksSubject.value;
  }

  /**
   * Récupère les tâches à faire (snapshot)
   */
  getTodayTasks(): Task[] {
    return this.tasksSubject.value.filter(task => !task.isCompleted);
  }

  /**
   * Récupère les tâches complétées (snapshot)
   */
  getCompletedTasks(): Task[] {
    return this.tasksSubject.value.filter(task => task.isCompleted);
  }

  /**
   * Change l'état de complétion d'une tâche
   */
  toggleTask(taskId: string): void {
    const tasks = [...this.tasksSubject.value];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.isCompleted = !task.isCompleted;
      task.completedAt = task.isCompleted ? new Date() : undefined;
      task.updatedAt = new Date();
      this.updateTasks(tasks);
    }
  }

  /**
   * Créer une nouvelle tâche
   */
  createTask(input: { title: string; assignedTo: string; assignedToName: string; householdId: string }): Task {
    console.log('TaskService.createTask() called with:', input);
    
    const task: Task = {
      id: `task-${Date.now()}`,
      title: input.title,
      assignedTo: input.assignedTo,
      assignedToName: input.assignedToName,
      isCompleted: false,
      householdId: input.householdId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Enrichir la tâche avec la couleur
    const enrichedTask = this.enrichTask(task);
    
    const tasks = [...this.tasksSubject.value, enrichedTask];
    console.log('Updated tasks array:', tasks);
    
    this.updateTasks(tasks);
    return enrichedTask;
  }

  /**
   * Mettre à jour une tâche
   */
  updateTask(taskId: string, updates: Partial<Task>): void {
    const tasks = [...this.tasksSubject.value];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date() });
      this.updateTasks(tasks);
    }
  }

  /**
   * Réassigner une tâche à quelqu'un d'autre
   */
  reassignTask(taskId: string, assignedTo: string, assignedToName: string): void {
    this.updateTask(taskId, { assignedTo, assignedToName });
  }

  /**
   * Récupérer les tâches assignées à un utilisateur
   */
  getTasksForUser(userId: string): Task[] {
    return this.tasksSubject.value.filter(task => task.assignedTo === userId);
  }

  /**
   * Récupérer les tâches assignées à un utilisateur (observable)
   */
  getTasksForUser$(userId: string): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(task => task.assignedTo === userId))
    );
  }

  /**
   * Supprimer une tâche
   */
  deleteTask(taskId: string): void {
    const tasks = this.tasksSubject.value.filter(t => t.id !== taskId);
    this.updateTasks(tasks);
  }

  /**
   * Récupérer les tâches pour un foyer
   */
  getTasksForHousehold(householdId: string): Task[] {
    return this.tasksSubject.value.filter(task => task.householdId === householdId);
  }

  /**
   * Récupérer les tâches pour un foyer (observable)
   */
  getTasksForHousehold$(householdId: string): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(task => task.householdId === householdId))
    );
  }

  /**
   * Réinitialise toutes les tâches aux valeurs par défaut
   */
  resetToDefault(): void {
    this.updateTasks([...this.defaultTasks]);
  }

  /**
   * Efface toutes les tâches
   */
  clearAll(): void {
    this.updateTasks([]);
  }
}
