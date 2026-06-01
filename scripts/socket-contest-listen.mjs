#!/usr/bin/env node
/**
 * Listen for contest-standings on the /contests Socket.io namespace.
 * Usage: CONTEST_ID=<mongoId> npm run smoke:socket
 */
import { io } from 'socket.io-client';

const contestId = process.env.CONTEST_ID ?? process.argv[2];
const base = (process.env.BASE ?? 'http://localhost:3000').replace(/\/$/, '');

if (!contestId) {
  console.error('Usage: CONTEST_ID=<id> npm run smoke:socket');
  process.exit(1);
}

const socket = io(`${base}/contests`, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log(`Connected to ${base}/contests`);
  socket.emit('join-contest', { contestId }, (ack) => {
    console.log('join-contest ack:', ack);
    console.log(
      'Waiting for contest-standings… (submit a solution in another terminal)',
    );
  });
});

socket.on('contest-standings', (payload) => {
  console.log('\n--- contest-standings ---');
  console.log(JSON.stringify(payload, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('connect_error:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  socket.close();
  process.exit(0);
});
