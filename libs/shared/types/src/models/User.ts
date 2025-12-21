export type TUser = {
  email: string,
  googleId: string,
  accessToken: string,
  refreshToken: string, // Critical for background AI tasks
  expiryDate: number,
  hubspotTokens: {
    access_token: string,
    refresh_token: string,
    expiresAt: number
  },
  hubspotSynching: boolean,
  gmailSyncing: boolean
  calendarSyncing: boolean
}