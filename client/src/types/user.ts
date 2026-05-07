export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
  isOnline?: boolean;
  status?: 'friends' | 'request_sent' | 'request_received' | 'none';
}
