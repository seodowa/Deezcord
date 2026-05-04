export interface SendMessagePayload {
  room_id: string;
  channel_id: string;
  content: string;
  file_url?: string;
  file_name?: string;
  parent_id?: string | null;
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
  reactions?: MessageReaction[];
  file_url?: string;
  file_name?: string;
  parent_id?: string | null;
  parent_message?: {
    username: string;
    content: string;
  } | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  username?: string;
}

export interface ReactionPayload {
  message_id: string;
  channel_id: string;
  room_id: string;
  emoji: string;
}

export interface ReactionUpdatePayload {
  message_id: string;
  reactions: MessageReaction[];
}
