import express, { Request, Response } from 'express';
import crypto from 'crypto';
import supabase from '../config/supabaseClient';

const router = express.Router();

// GET /health - Lightweight system check (Best for automated uptime monitors)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('rooms').select('id').limit(1);

    if (error) {
       res.status(503).json({
         status: "degraded",
         server: "online",
         database: "disconnected",
         details: error.message,
         timestamp: new Date().toISOString()
       });
       return;
    }

    res.status(200).json({
      status: "healthy",
      server: "online",
      database: "connected",
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    res.status(500).json({
      status: "down",
      server: "error",
      details: err.message
    });
  }
});

// GET /health/integration - Deep Database CRUD Test (Best for manual developer testing)
router.get('/integration', async (req: Request, res: Response) => {
  let createdRoomId: string | null = null;

  try {
    // 1. Generate a unique room name to avoid UNIQUE constraint errors
    const testHash = crypto.randomBytes(4).toString('hex');
    const roomName = `System_Test_Room_${testHash}`;

    // 2. Test INSERT (Room)
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert([{ name: roomName }])
      .select()
      .single();

    if (roomError) throw new Error(`Failed to create test room: ${roomError.message}`);
    createdRoomId = roomData.id;

    // 3. Test INSERT (Channel)
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert([{ room_id: createdRoomId, name: 'general', type: 'text' }])
      .select()
      .single();

    if (channelError) throw new Error(`Failed to create test channel: ${channelError.message}`);
    const createdChannelId = channelData.id;

    // 4. Test INSERT (Message)
    const { error: msgError } = await supabase
      .from('messages')
      .insert([{
        room_id: createdRoomId,
        channel_id: createdChannelId,
        username: 'health_bot',
        content: 'Automated integration test message.'
      }]);

    if (msgError) throw new Error(`Failed to insert test message: ${msgError.message}`);

    // ==========================================
    // ⏳ DELAY FOR MANUAL INSPECTION
    // ==========================================
    console.log(`\n[Integration Test] 🟢 Created room: ${roomName}`);
    console.log(`[Integration Test] ⏳ Pausing for 10 seconds. Check Supabase now!`);
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log(`[Integration Test] 🧹 10 seconds up! Executing cleanup...`);
    // ==========================================

    // 4. Test DELETE (Room & Cascading Messages)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', createdRoomId);

    if (deleteError) throw new Error(`Failed to clean up test room: ${deleteError.message}`);

    // 5. Success
    res.status(200).json({
      status: "healthy",
      integration_test: "passed",
      details: "Successfully created room, sent message, paused, and executed cascading deletion.",
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    // Attempt emergency cleanup if something failed midway through
    if (createdRoomId) {
      console.log(`[Integration Test] ⚠️ Error caught, attempting emergency cleanup...`);
      await supabase.from('rooms').delete().eq('id', createdRoomId);
    }

    res.status(500).json({
      status: "degraded",
      integration_test: "failed",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;