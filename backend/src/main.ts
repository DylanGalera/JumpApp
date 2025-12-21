import express, { Request } from 'express';
import { IChatHistory, ROUTES_NAMES } from '@financial-ai/types'
import auth from './routes/auth'
import cors from 'cors'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { User } from './models/users';
import { Server } from 'socket.io'
import http from 'http';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken'
import { askAiAgent } from './services/ai.ask';

const PORT = process.env.PORT || '4000';

export interface CustomRequest extends Request {
  io: Server;
}

dotenv.config();

const connectDB = async () => {
  try {
    mongoose.connection.once('open', async () => {
      console.log('Running startup database queries...');
      try {
        const result = await User.updateMany(
          { $or: [{ hubspotSynching: true }, { gmailSyncing: true }, { calendarSyncing: true }] },
          { $set: { hubspotSynching: false, gmailSyncing: false, calendarSyncing: false } }
        );
        console.log(`Startup cleanup: Reset ${result.modifiedCount} zombie locks.`);
      } catch (err) {
        console.error("Startup query failed:", err);
      }
    });
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

const app = express();
const server = http.createServer(app); // The shared server

const allowedOrigins = [
  "http://localhost:4200",       // Nx default for many apps
  "https://jumpapp-zeta.vercel.app",
  process.env.FRONT_URL          // Good practice to keep this variable too
].filter(Boolean);               // Removes undefined values

const io = new Server(server, {
  cors: {
    origin: allowedOrigins, credentials: true,
    methods: ["GET", "POST"]
  }
});
app.set("socketio", io);
app.use(cookieParser());

app.use((req: CustomRequest, res, next) => {
  req.io = io;
  next();
});

app.use(cors({
  origin: process.env.FRONT_URL,
  credentials: true,
  //exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json({ limit: '600kb' }))

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

server.listen(parseInt(PORT), '0.0.0.0', () => {
  // Use 0.0.0.0 so Render's internal network can route to it
  console.log(`[ ready ] Listening on port ${PORT}`);
});

app.use(ROUTES_NAMES.AUTH.name, auth)

io.on('connection', async (socket) => {

  const cookies = cookie.parse(socket.handshake.headers.cookie || '');
  const token = cookies.session_token
  const history: IChatHistory[] = []
  if (!token) {
    console.log("invalid token kick out user!")
    return socket.emit('exit')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
  const userId = decoded.userId
  socket.join(userId);
  console.log('User connected via socket', userId);

  setTimeout(async () => {
    const user = await User.findById(userId)

    if (user.hubspotSynching || user.gmailSyncing) {
      socket.emit('message', 'Financial AI App is fetching your data, please wait until finishing this process and then you can ask any question related to your google email/hubspot')
    }
  }, 1000);

  socket.on('disconnect', (reason) => {
    while (history.length) history.splice(0)
    console.log(`User ${userId} socket id:${socket.id} disconnected. Reason: ${reason}`);
  });

  socket.on('send', async (msg) => {
    history.push({
      content: msg,
      role: 'user',
    })
    if (history.length > 5) history.shift()
    const response = await askAiAgent(userId, history)
    history.push({
      content: response,
      role: 'assistant',
    })
    if (history.length > 5) history.shift()
    socket.emit('receive', response)
  })
});