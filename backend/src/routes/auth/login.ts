import { PVerifyCodeParams, RVerifyCodeResult } from "@financial-ai/types";
import { User } from "../../models/users";
import { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken'
import { syncUserData } from "../../tools/syncData";
import { Server } from "socket.io";
import { OAuth2Client } from 'google-auth-library';

export const LOGIN_COOCKIE_PARAMS: CookieOptions = {
    httpOnly: true,     // Prevents JS access (XSS protection)
    secure: true,       // Ensures it's only sent over HTTPS (use false for localhost)
    sameSite: 'none',    // Helps with cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

export async function authLogin(req: Request, res: Response) {
    const { code } = req.body as PVerifyCodeParams
    try {
        const googleClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'postmessage'
        );
        // Exchange the auth code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);
        // Get user profile info
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        // Save to MongoDB

        const user = await User.findOneAndUpdate(
            { email: payload.email },
            {
                googleId: payload.sub,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token, // Store this securely!
                expiryDate: tokens.expiry_date,
            },
            { upsert: true, new: true }
        );

        const io = req.app.get("socketio") as Server;
        syncUserData(user._id.toString(), io)

        const sessionToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.cookie('session_token', sessionToken, LOGIN_COOCKIE_PARAMS);

        delete user.accessToken
        delete user.refreshToken
        delete user.hubspotTokens?.access_token
        delete user.hubspotTokens?.refresh_token

        res.status(200).json({ success: true, user, name: payload.name || 'User' } as RVerifyCodeResult);
    } catch (error) {
        console.log(">>>", error)
        res.status(400).json({ error: 'Authentication failed' });
    }
}