import { PVerifyCodeParams, RVerifyCodeResult } from '@financial-ai/types';
import { Request, Response } from 'express';
import { Client } from '@hubspot/api-client';
import { User } from '../../models/users';
import jwt from 'jsonwebtoken'

export const hubspotExchangeToken = async (req: Request, res: Response) => {
    const { code } = req.body as PVerifyCodeParams
    const token = req.cookies?.session_token || req.headers?.authorization?.split(' ')[1];
    if (!token) {
        return res.status(400);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    try {
        const hubspotClient = new Client();
        const tokenResponse = await hubspotClient.oauth.tokensApi.create(
            'authorization_code',
            code,
            process.env.HUBSPOT_REDIRECT_URI,
            process.env.HUBSPOT_CLIENT_ID,
            process.env.HUBSPOT_CLIENT_SECRET
        );
        const { accessToken, refreshToken, expiresIn } = tokenResponse;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        await User.findByIdAndUpdate(decoded.userId, {
            hubspotTokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                expiresAt,
                lastSyncedAt: Date.now()
            }
        });
        res.status(200).json(true);
    } catch (error) {
        console.log(">>>", error)
        res.status(400).json({ error: 'Authentication failed' });
    }
}