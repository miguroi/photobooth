import type { ServerWebSocket } from "bun";

type Socket = ServerWebSocket<{ roomCode: string | null }>;

const rooms = new Map<string, Set<Socket>>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

export function createRoom(socket: Socket): string {
  const code = generateCode();
  rooms.set(code, new Set([socket]));
  socket.data.roomCode = code;
  return code;
}

export function joinRoom(socket: Socket, code: string): boolean {
  const room = rooms.get(code);
  if (!room || room.size >= 2) return false;
  room.add(socket);
  socket.data.roomCode = code;
  return true;
}

export function leaveRoom(socket: Socket): void {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  room.delete(socket);
  if (room.size === 0) rooms.delete(code);
}

export function getPeer(socket: Socket): Socket | null {
  const code = socket.data.roomCode;
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  for (const peer of room) {
    if (peer !== socket) return peer;
  }
  return null;
}
