import { Request, Response } from 'express';
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