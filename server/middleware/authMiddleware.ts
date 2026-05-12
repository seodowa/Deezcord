import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabaseClient';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  // Check if the request has an Authorization header
  const authHeader = req.headers.authorization;
  const deviceId = req.headers['x-device-id'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  if (!deviceId) {
    res.status(401).json({ error: "Unauthorized: Missing device ID" });
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

  // Fingerprint Check: Verify the deviceId is registered for this user
  const registeredDevices = user.app_metadata?.devices || [];
  if (!registeredDevices.includes(deviceId)) {
    res.status(401).json({ error: "Unauthorized: Device not recognized" });
    return;
  }

  // Token is valid and device is recognized!
  req.user = user;
  next(); // Proceed to the actual route
};

/**
 * Middleware to enforce Authenticator Assurance Level 2 (AAL2).
 * This ensures the user has successfully completed an MFA challenge.
 * (Session-level MFA)
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

/**
 * Middleware to enforce Transactional MFA (Code-per-action).
 * This requires a fresh TOTP code to be verified for this specific request.
 */
export const verifyTransactionalMfa = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    return;
  }

  const token = authHeader.split(' ')[1];
  const mfaCode = req.headers['x-mfa-code'] as string;

  try {
    // Create a client authenticated as the user
    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // 1. Check if the user has a verified TOTP factor
    const { data: factors, error: factorsError } = await userClient.auth.mfa.listFactors();
    
    if (factorsError) throw factorsError;

    const totpFactor = factors.all.find(f => f.factor_type === 'totp' && f.status === 'verified');

    // If no MFA is enabled, allow the action
    if (!totpFactor) {
      return next();
    }

    // 2. If MFA is enabled, check for a valid code format
    if (!mfaCode || !/^\d{6}$/.test(mfaCode)) {
      res.status(403).json({ 
        error: "MFA_REQUIRED_TRANSACTIONAL", 
        message: "This action requires a fresh 6-digit verification code.",
        factorId: totpFactor.id
      });
      return;
    }

    // 3. Verify the code
    // challenge -> verify
    const { data: challenge, error: challengeError } = await userClient.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) throw challengeError;

    const { error: verifyError } = await userClient.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code: mfaCode
    });

    if (verifyError) {
      res.status(401).json({ error: "INVALID_MFA_CODE", message: "The verification code is incorrect or has expired." });
      return;
    }

    // Code verified successfully!
    next();
  } catch (err: any) {
    console.error("Transactional MFA Error:", err.message);
    res.status(500).json({ error: "Failed to verify transaction security" });
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
