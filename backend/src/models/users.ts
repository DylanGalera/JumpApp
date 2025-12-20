import { TUser } from '@financial-ai/types';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema<TUser>({
  email: { type: String, required: true, unique: true },
  googleId: String,
  accessToken: String,
  refreshToken: String, // Critical for background AI tasks
  expiryDate: Number,
  lastSyncedAt: Number
});

export const User = mongoose.model<TUser>('Users', userSchema);