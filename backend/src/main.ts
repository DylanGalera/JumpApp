import express, { Request } from 'express';
import { ROUTES_NAMES } from '@financial-ai/types'
import auth from './routes/auth'
import ai from './routes/ai'
import cors from 'cors'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { User } from './models/users';
import { Server } from 'socket.io'
import http from 'http';

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
          { $or: [{ hubspotSynching: true }, { gmailSyncing: true }] },
          { $set: { hubspotSynching: false, gmailSyncing: false } }
        );
        console.log(`Startup cleanup: Reset ${result.modifiedCount} zombie locks.`);
      } catch (err) {
        console.error("Startup query failed:", err);
      }
      //console.log("--->",await askAiAgent('6946e5c1272dd15620a4049d','Always start all response emails with Hello'))
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
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cookieParser());

app.use((req: CustomRequest, res, next) => {
  req.io = io;
  next();
});

app.use(cors({
  origin: process.env.FRONT_URL, // Your exact frontend URL
  credentials: true,                // Required to allow the browser to receive/send cookies
  //exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json({ limit: '600kb' }))

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

server.listen(3000, () => {
  console.log(`[ ready ] http://localhost:3000`);
});

app.use(ROUTES_NAMES.AUTH.name, auth)
app.use(ROUTES_NAMES.AI.name, ai)

io.on('connection', (socket) => {

  console.log('User connected via socket');

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected. Reason: ${reason}`);
  });

  socket.on('send', (msg) => {
    socket.emit('receive', msg)
  })
});