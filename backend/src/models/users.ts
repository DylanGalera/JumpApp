import { TUser } from '@financial-ai/types';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema<TUser>({
  email: { type: String, required: true, unique: true },
  googleId: String,
  accessToken: String,
  refreshToken: String, // Critical for background AI tasks
  expiryDate: Number,
});

export const User = mongoose.model<TUser>('User', UserSchema);