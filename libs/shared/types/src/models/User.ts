export type TUser = {
  email: string,
  googleId: string,
  accessToken: string,
  refreshToken: string, // Critical for background AI tasks
  expiryDate: number,
  lastSyncedAt: number
}