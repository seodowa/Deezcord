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

/**
 * Middleware to enforce Authenticator Assurance Level 2 (AAL2).
 * This ensures the user has successfully completed an MFA challenge.
 */
export const verifyAAL2 = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check the Authenticator Assurance Level using Supabase
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token);

    if (error || !data) {
      res.status(401).json({ error: "Unauthorized: Failed to verify assurance level" });
      return;
    }

    const { currentLevel, nextLevel } = data;

    // If the user has MFA enrolled (nextLevel is aal2) but hasn't verified (currentLevel is aal1)
    // Or if we simply require aal2 for this route.
    if (currentLevel !== 'aal2') {
      res.status(403).json({ 
        error: "MFA_REQUIRED", 
        message: "This action requires secondary authentication.",
        nextLevel 
      });
      return;
    }

    next(); // AAL2 confirmed!
  } catch (err) {
    console.error("MFA Verification Error:", err);
    res.status(500).json({ error: "Internal server error during MFA verification" });
  }
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

export const verifyRoomOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  if (!roomId || !userId) {
    res.status(400).json({ error: "Missing room ID or user ID" });
    return;
  }

  const { data, error } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (error || !data || data.role !== 'owner') {
    res.status(403).json({ error: "Forbidden: Only room owners can perform this action" });
    return;
  }

  next();
};


