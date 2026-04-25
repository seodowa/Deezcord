export interface SendMessagePayload {
  room_id: string;
  content: string;
}

export interface ReceiveMessagePayload {
  room_id: string;
  content: string;
  username: string;
}
