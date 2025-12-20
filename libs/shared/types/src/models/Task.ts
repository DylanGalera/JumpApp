export type TTask = {
    userId: string;
    title: string;
    details?: string;
    dueDate?: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    source: 'email' | 'manual' | 'hubspot'; // Where the task came from
    createdAt: Date;
}