export interface Message {
  id: string;
  room_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface SendMessagePayload {
  room_id: string;
  content: string;
}

export interface ReceiveMessagePayload {
  room_id: string;
  username: string;
  content: string;
  created_at?: string;
}
