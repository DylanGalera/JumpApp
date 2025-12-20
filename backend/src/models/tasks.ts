import { Schema, model } from 'mongoose';

const TaskSchema = new Schema({
  userId: String,
  status: { type: String, enum: ['PENDING', 'WAITING_FOR_REPLY', 'COMPLETED'] },
  type: String, // e.g., 'scheduling'
  metadata: {
    clientEmail: String,
    threadId: String,       // Gmail Thread ID to watch
    proposedTimes: [Date]
  },
  lastUpdated: { type: Date, default: Date.now }
});

export const Task = model('Task', TaskSchema);