import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabaseClient';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: any;
}

const verifyUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

export default verifyUser;