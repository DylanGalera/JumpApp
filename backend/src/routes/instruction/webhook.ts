import { Instruction } from '../../models/instruction';
import { User } from '../../models/users';
import { Request, Response } from 'express';

export const webhook = async (req: Request, res: Response) => {
    if (!req.body.message || !req.body.message.data) {
        return res.status(400).send('Invalid webhook format');
    }

    const encodedData = req.body.message.data;
    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    const data = JSON.parse(decodedString);

    const userEmail = data.emailAddress; // Use this to find req.user.id in your DB
    const historyId = data.historyId;     // Use this to fetch the actual email content

    const { fromEmail, snippet } = req.body;

    const user = await User.findOne({ email: fromEmail })
    if (!user) return res.status(400).send('Invalid user');

    const rules = await Instruction.find({ userId: user._id.toString() });

}