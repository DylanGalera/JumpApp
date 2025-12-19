import { PVerifyCodeParams, RVerifyCodeResult } from "@financial-ai/types";
import { User } from "../../models/users";
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { LOGIN_COOCKIE_PARAMS } from "./login";

export async function authLogout(req: Request, res: Response) {
    try {
        res.clearCookie('session_token', LOGIN_COOCKIE_PARAMS);
        res.status(200).json(true);
    } catch (error) {
        console.log(">>>", error)
        res.status(400).json({ error: 'Authentication failed' });
    }
}