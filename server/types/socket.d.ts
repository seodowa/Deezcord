export interface SendMessagePayload {
  room_id: string;
  content: string;
}

export interface ReceiveMessagePayload {
  id: string;
  room_id: string;
  content: string;
  username: string;
  created_at: string;
}
