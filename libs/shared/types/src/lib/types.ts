import { TUser } from "../models";

export interface PVerifyCodeParams {
  code: string
}

export interface RVerifyCodeResult {
  success: boolean
  user: TUser
  name: string
}

export interface PAskAI {
  question: string
}

export interface RAskAI {
  response: string
}