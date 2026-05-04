import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import http from 'k6/http';

/**
 * Deezcord WebSocket Stress Test
 * 
 * This script simulates multiple users connecting to the Socket.io server,
 * joining a room/channel, and sending messages.
 * 
 * Prerequisites:
 * 1. Install k6: https://k6.io/docs/getting-started/installation/
 * 2. Have a valid Supabase user token, Room ID, and Channel ID.
 * 
 * Run with:
 * k6 run -e TOKEN=<your_token> -e ROOM_ID=<room_uuid> -e CHANNEL_ID=<channel_uuid> websocket-stress-test.js
 */

// Custom Metrics
const connectionTime = new Trend('ws_connection_time');
const handshakeLatency = new Trend('ws_handshake_latency');
const messageRTT = new Trend('ws_message_rtt');
const messagesSent = new Counter('ws_messages_sent');
const messagesReceived = new Counter('ws_messages_received');
const errors = new Counter('ws_errors');

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 20 users
    { duration: '1m', target: 500 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'ws_connection_time': ['p(95)<500'], // 95% of connections should be < 500ms
    'ws_message_rtt': ['p(95)<1000'],    // 95% of messages should have RTT < 1s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = BASE_URL.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';

export default function () {
  const token = __ENV.TOKEN;
  const roomId = __ENV.ROOM_ID;
  const channelId = __ENV.CHANNEL_ID;

  if (!token || !roomId || !channelId) {
    console.error('Missing required environment variables: TOKEN, ROOM_ID, CHANNEL_ID');
    return;
  }

  const params = { tags: { my_tag: 'deezcord-stress' } };

  const res = ws.connect(WS_URL, params, function (socket) {
    let connectTime;
    let handshakeStart;

    socket.on('open', function () {
      connectTime = Date.now();
      connectionTime.add(0); // Marker
      handshakeStart = Date.now();
    });

    socket.on('message', function (data) {
      // Engine.IO protocol handling
      
      // 0: Handshake
      if (data.startsWith('0')) {
        handshakeLatency.add(Date.now() - handshakeStart);
        
        // Send Socket.io CONNECT packet with auth token
        // 40 is CONNECT, / is namespace, then auth object
        socket.send(`40{"token":"${token}"}`);
      } 
      
      // 2: PING from server
      else if (data === '2') {
        // Respond with 3 (PONG)
        socket.send('3');
      }

      // 40: Namespace CONNECTED
      else if (data.startsWith('40')) {
        // Join room and channel
        const joinPayload = JSON.stringify({ room_id: roomId, channel_id: channelId });
        socket.send(`42["join_room",${joinPayload}]`);

        // Start sending messages periodically
        socket.setInterval(function () {
          const timestamp = Date.now();
          const msgPayload = JSON.stringify({
            room_id: roomId,
            channel_id: channelId,
            content: `STRESS_TEST: VU=${__VU} Iter=${__ITER} Time=${timestamp}`
          });
          socket.send(`42["send_message",${msgPayload}]`);
          messagesSent.add(1);
        }, 5000); // Send message every 5 seconds
      }

      // 42: EVENT
      else if (data.startsWith('42')) {
        const payload = JSON.parse(data.substring(2));
        const event = payload[0];
        const body = payload[1];

        if (event === 'receive_message') {
          messagesReceived.add(1);
          
          // If it's a message from THIS VU, calculate RTT
          if (body.content && body.content.includes(`VU=${__VU}`)) {
            const sentTimeStr = body.content.split('Time=')[1];
            if (sentTimeStr) {
              const rtt = Date.now() - parseInt(sentTimeStr);
              messageRTT.add(rtt);
            }
          }
        }
      }
    });

    socket.on('close', function () {
      // console.log('Disconnected');
    });

    socket.on('error', function (e) {
      errors.add(1);
      console.error('WS Error: ' + e.error());
    });

    // Run for a specific amount of time then close
    socket.setTimeout(function () {
      socket.close();
    }, 110000); // Slightly less than total duration
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
