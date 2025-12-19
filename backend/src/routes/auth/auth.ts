import { PVerifyCodeParams, RVerifyCodeResult } from "@financial-ai/types";
import { User } from "../../models/users";
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

export async function authUser(req: Request, res: Response) {
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

        res.status(200).json({ success: true, user } as RVerifyCodeResult);
    } catch (error) {
        console.log(">>>", error)
        res.status(400).json({ error: 'Authentication failed' });
    }
}