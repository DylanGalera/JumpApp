import { PVerifyCodeParams, RVerifyCodeResult } from "@financial-ai/types";
import { User } from "../../models/users";
import { CookieOptions, Request, Response, urlencoded } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken'
import { syncUserGmail } from "../../services/gmail.service";
import { syncHubspotData } from "../../services/hubspot.sync";

export const LOGIN_COOCKIE_PARAMS: CookieOptions = {
    httpOnly: true,     // Prevents JS access (XSS protection)
    secure: false,       // Ensures it's only sent over HTTPS (use false for localhost)
    sameSite: 'lax',    // Helps with cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

export async function authLogin(req: Request, res: Response) {
    const { code } = req.body as PVerifyCodeParams
    try {
        // Exchange the auth code for tokens
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        // Get user profile info
        const ticket = await client.verifyIdToken({
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

        syncUserGmail(user._id.toString(), tokens).catch(err =>
            console.error("Initial sync failed:", err)
        );

        syncHubspotData(user._id.toString())

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