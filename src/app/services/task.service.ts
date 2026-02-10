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
        // Convert date strings back to Date objects
        return tasks.map((task) => ({
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
    return [...this.defaultTasks];
  }

  private saveToStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  private updateTasks(tasks: Task[]): void {
    this.saveToStorage(tasks);
    this.tasksSubject.next(tasks);
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
   * Crée une nouvelle tâche
   */
  createTask(
    title: string, 
    assignedTo: string, 
    assignedToName: string, 
  ): Task {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title,
      assignedTo,
      assignedToName,
      isCompleted: false,
      householdId: 'household1',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const tasks = [...this.tasksSubject.value, newTask];
    this.updateTasks(tasks);
    return newTask;
  }

  /**
   * Supprime une tâche
   */
  deleteTask(taskId: string): void {
    const tasks = this.tasksSubject.value.filter(t => t.id !== taskId);
    this.updateTasks(tasks);
  }

  /**
   * Met à jour une tâche existante
   */
  updateTask(taskId: string, updates: Partial<Task>): void {
    const tasks = [...this.tasksSubject.value];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: new Date()
      };
      this.updateTasks(tasks);
    }
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
