import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabaseClient';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  // Check if the request has an Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  // Extract the token
  const token = authHeader.split(' ')[1];

  // Ask Supabase to verify the token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  // Token is valid! Attach the user info to the request so the next function can use it
  req.user = user;
  next(); // Proceed to the actual route (e.g., creating a room)
};


export const verifyRoomMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { roomId } = req.params;
  const userId = req.user?.id; // Guaranteed to exist because verifyUser runs first

  if (!roomId || !userId) {
    res.status(400).json({ error: "Missing room ID or user ID" });
    return;
  }

  // Check if a record exists in room_members for this user and room
  const { data, error } = await supabase
    .from('room_members')
    .select('role') // Selecting just the role is lightweight
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single(); // Use single() since they can only have one membership record

  if (error || !data) {
    // 403 Forbidden is the correct status code when a user is authenticated but lacks permission
    res.status(403).json({ error: "Forbidden: You are not a member of this room" });
    return;
  }

  // Attach the room role to the request in case downstream routes need it
  (req as any).roomRole = data.role; 

  next(); // User is a member! Proceed to the route handler.
};


