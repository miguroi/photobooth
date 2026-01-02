import type { ServerWebSocket } from "bun";
import { createRoom, joinRoom, leaveRoom, getPeer } from "./rooms";
import type { ClientMessage, ServerMessage } from "../shared/types";

type Socket = ServerWebSocket<{ roomCode: string | null }>;

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};

function send(socket: Socket, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}

export function startServer(port: number) {
  return Bun.serve({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      if (server.upgrade(req, { data: { roomCode: null } })) {
        return;
      }

      let path = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(`./client${path}`);
      if (!(await file.exists())) return new Response("Not found", { status: 404 });
      const ext = path.substring(path.lastIndexOf("."));
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": contentType } });
    },
    websocket: {
      open(ws: Socket) {},
      close(ws: Socket) {
        const peer = getPeer(ws);
        leaveRoom(ws);
        if (peer) send(peer, { type: "peer-left" });
      },
      message(ws: Socket, raw: string) {
        const msg: ClientMessage = JSON.parse(raw);

        switch (msg.type) {
          case "create-room": {
            const code = createRoom(ws);
            send(ws, { type: "room-created", roomCode: code });
            break;
          }
          case "join-room": {
            if (joinRoom(ws, msg.roomCode)) {
              send(ws, { type: "room-joined", roomCode: msg.roomCode, isInitiator: false });
              const peer = getPeer(ws);
              if (peer) {
                send(peer, { type: "peer-joined" });
              }
            } else {
              send(ws, { type: "error", message: "Room not found or full" });
            }
            break;
          }
          case "offer":
          case "answer":
          case "ice-candidate":
          case "take-photo": {
            const peer = getPeer(ws);
            if (peer) send(peer, msg as ServerMessage);
            break;
          }
        }
      },
    },
  });
}
