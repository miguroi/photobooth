export type ClientMessage =
  | { type: "create-room" }
  | { type: "join-room"; roomCode: string }
  | { type: "offer"; offer: RTCSessionDescriptionInit }
  | { type: "answer"; answer: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit }
  | { type: "take-photo" };

export type ServerMessage =
  | { type: "room-created"; roomCode: string }
  | { type: "room-joined"; roomCode: string; isInitiator: boolean }
  | { type: "peer-joined" }
  | { type: "peer-left" }
  | { type: "offer"; offer: RTCSessionDescriptionInit }
  | { type: "answer"; answer: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit }
  | { type: "take-photo" }
  | { type: "error"; message: string };
