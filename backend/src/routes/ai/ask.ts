import { PAskAI, PVerifyCodeParams, RAskAI, RVerifyCodeResult } from "@financial-ai/types";
import { CookieOptions, Request, Response, urlencoded } from 'express';
import jwt from 'jsonwebtoken'
import { askAiAgent } from "../../services/ai.ask";


export async function askAI(req: Request, res: Response) {
    const { question } = req.body as PAskAI
    try {
        const token = req.cookies?.session_token || req.headers?.authorization?.split(' ')[1];
        if (!token) {
            return res.status(200).json({ success: false, user: null, name: '' } as RVerifyCodeResult);
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };


        const response = await askAiAgent(decoded.userId, question)

        res.status(200).json({ response } as RAskAI);
    } catch (error) {
        console.log(">>>", error)
        res.status(400).json({ error: 'Authentication failed' });
    }
}