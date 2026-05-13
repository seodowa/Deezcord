export interface SendMessagePayload {
  room_id: string;
  channel_id: string;
  content: string;
  file_url?: string;
  file_name?: string;
  file_width?: number | null;
  file_height?: number | null;
  parent_id?: string | null;
  temp_id?: string;
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
  file_width?: number | null;
  file_height?: number | null;
  parent_id?: string | null;
  parent_message?: {
    username: string;
    content: string;
  } | null;
  temp_id?: string;
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

export interface ChannelDeletedPayload {
  roomId: string;
  channelId: string;
}
