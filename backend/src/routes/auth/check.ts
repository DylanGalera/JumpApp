import { PVerifyCodeParams, RVerifyCodeResult } from "@financial-ai/types";
import { User } from "../../models/users";
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken'


const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

export const authCheck = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.session_token || req.headers?.authorization?.split(' ')[1];

        if (!token) {
            return res.status(200).json({ success: false, user: null, name: '' } as RVerifyCodeResult);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

        const user = await User.findById(decoded.userId).select('-accessToken');

        if (!user) {
            return res.status(401).json({ authenticated: false, message: 'User no longer exists' });
        }
        return res.status(200).json({ success: true, user, name: '' } as RVerifyCodeResult);

    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ authenticated: false, message: 'Invalid or expired token' });
    }
};