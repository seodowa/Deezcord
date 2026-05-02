export interface SendMessagePayload {
  room_id: string;
  channel_id: string;
  content: string;
}

export interface ReceiveMessagePayload {
  id: string;
  user_id: string | null;
  room_id: string;
  channel_id: string;
  content: string;
  username: string;
  created_at: string;
  avatar_url?: string | null;
}
