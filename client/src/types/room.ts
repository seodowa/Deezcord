export interface Channel {
  id: string;
  room_id: string;
  name: string;
  type: string;
  created_at: string;
  isNew?: boolean;
}

export interface Room {
  id: string;
  name: string;
  room_profile?: string;
  isMember?: boolean;
  role?: string | null;
  isNew?: boolean;
}

export interface Member {
  role: string;
  user_id: string;
  isOnline?: boolean;
  profiles: {
    username: string;
    email: string;
    avatar_url?: string | null;
  };
}
