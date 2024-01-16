import express from 'express';
import { createServer } from 'node:http';
import { configDotenv } from 'dotenv';
import { Server } from 'socket.io';
import cors from 'cors';
import socket from './src/socket.js';

configDotenv();

const app = express();
const server = createServer(app);

app.use(
    cors({
        origin: 'http://localhost:8000',
        credentials: true,
    })
);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:8000',
        credentials: true,
    },
});

socket(io);

server.listen(process.env.SERVER_PORT, () => {
    console.log(`server running at ${process.env.SERVER_PORT}`);
});
