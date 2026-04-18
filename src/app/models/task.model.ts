export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  assignedToName: string;
  isCompleted: boolean;
  completedAt?: Date;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  avatarColor?: string;
}

export interface CreateTaskInput {
  title: string;
  assignedTo: string;
  householdId: string;
}
