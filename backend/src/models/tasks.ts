import { TTask } from '@financial-ai/types';
import { Schema, model } from 'mongoose';

const TaskSchema = new Schema<TTask>({
  userId: { type: String, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  details: { type: String },
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  source: { type: String, default: 'manual' },
  createdAt: { type: Date, default: Date.now }
});

export const Task = model<TTask>('Tasks', TaskSchema);