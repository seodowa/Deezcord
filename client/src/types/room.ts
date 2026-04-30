export interface Room {
  id: string;
  name: string;
  room_profile?: string;
  isMember?: boolean;
  role?: string | null;
}

export interface Member {
  role: string;
  user_id: string;
  profiles: {
    username: string;
    email: string;
  };
}
