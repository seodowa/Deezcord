"""
Deezcord WebSocket Stress Test — Locust
========================================
Faithful port of the k6 script. Replicates:
  - Same load shape  (30s → 100 VUs, 60s → 500 VUs, 30s → 0)
  - Auth token on namespace connect
  - join_room on connect
  - send_message every 5 s with an embedded user ID + timestamp
  - RTT measured by matching receive_message back to this user's sent timestamp
  - Same metric categories surfaced via Locust's request event

Prerequisites:
    pip install locust "python-socketio[msgpack]"

Run:
    locust -f <filename>.py \\
        --headless \\
        -e TOKEN=<token> \\
        -e ROOM_ID=<uuid> \\
        -e CHANNEL_ID=<uuid> \\
        -e BASE_URL=http://localhost:3001

Or open the web UI (omit --headless) and start from http://localhost:8089
"""

import os
import time
import threading
from dotenv import load_dotenv

import socketio
from locust import User, task, constant, events, LoadTestShape
from locust.exception import StopUser

load_dotenv()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fire(environment, name: str, response_time_ms: float, exception=None):
    """Emit a Locust request event — shows up in the live stats table."""
    environment.events.request.fire(
        request_type="WS",
        name=name,
        response_time=response_time_ms,
        response_length=0,
        exception=exception,
        context={},
    )


# ---------------------------------------------------------------------------
# Virtual user
# ---------------------------------------------------------------------------

class ChatUser(User):
    """
    One Locust user ≈ one k6 VU.

    wait_time = constant(5) means Locust waits 5 s between task executions,
    which mirrors k6's setInterval(..., 5000) for send_message.
    """

    wait_time = constant(5)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def on_start(self):
        self._user_id  = id(self)          # unique per user object, like __VU
        self._iter     = 0
        self._sent_at  = {}                # iter → epoch_ms, for RTT lookup
        self._lock     = threading.Lock()
        self._running  = True

        token      = os.getenv("TOKEN")
        room_id    = os.getenv("ROOM_ID")
        channel_id = os.getenv("CHANNEL_ID")
        base_url   = os.getenv("BASE_URL", "http://localhost:3001")

        if not all([token, room_id, channel_id]):
            raise StopUser("Missing TOKEN, ROOM_ID, or CHANNEL_ID env vars")

        self._room_id    = room_id
        self._channel_id = channel_id

        # ---- Create Socket.IO client with msgpack serializer ----
        self._sio = socketio.Client(logger=False, engineio_logger=False, serializer="msgpack")
        self._register_handlers()

        # ---- Connect and measure handshake time ----
        t0 = time.perf_counter()
        try:
            self._sio.connect(
                base_url,
                transports=["websocket"],
                auth={"token": token},      # mirrors: socket.send(`40{"token":"..."}`)
                namespaces=["/"],
                wait_timeout=10,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            _fire(self.environment, "ws_connect + handshake", elapsed_ms)
        except Exception as exc:
            _fire(self.environment, "ws_connect + handshake", 0, exception=exc)
            raise StopUser()

        # ---- Join room (mirrors the '40' handler in k6) ----
        try:
            self._sio.emit("join_room", {
                "room_id":    self._room_id,
                "channel_id": self._channel_id,
            })
        except Exception as exc:
            _fire(self.environment, "join_room", 0, exception=exc)

        # ---- Auto-disconnect after 110 s (mirrors socket.setTimeout 110 000 ms) ----
        self._stop_timer = threading.Timer(110, self._shutdown)
        self._stop_timer.daemon = True
        self._stop_timer.start()

    def on_stop(self):
        self._running = False
        if hasattr(self, "_stop_timer"):
            self._stop_timer.cancel()
        try:
            self._sio.disconnect()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Socket.IO event handlers
    # ------------------------------------------------------------------

    def _register_handlers(self):

        @self._sio.on("receive_message")
        def on_receive_message(data):
            # Count every received message  (mirrors: messagesReceived.add(1))
            _fire(self.environment, "ws_messages_received", 0)

            # RTT: only for messages sent by *this* user
            content = (data or {}).get("content", "")
            if f"UID={self._user_id}" not in content:
                return

            try:
                iter_part = content.split("Iter=")[1].split(" ")[0]
                iter_num  = int(iter_part)
            except (IndexError, ValueError):
                return

            with self._lock:
                sent_ms = self._sent_at.pop(iter_num, None)

            if sent_ms is not None:
                rtt_ms = (time.perf_counter() * 1000) - sent_ms
                # Surfaces as "ws_message_rtt" in Locust's stats table,
                # equivalent to k6's messageRTT Trend.
                _fire(self.environment, "ws_message_rtt", rtt_ms)

        @self._sio.on("connect_error")
        def on_connect_error(data):
            _fire(
                self.environment,
                "ws_connect_error",
                0,
                exception=Exception(str(data)),
            )

        @self._sio.on("disconnect")
        def on_disconnect():
            self._running = False

    # ------------------------------------------------------------------
    # Task — runs every 5 s (matches k6 setInterval 5000)
    # ------------------------------------------------------------------

    @task
    def send_message(self):
        if not self._running or not self._sio.connected:
            raise StopUser()

        self._iter += 1
        now_ms = time.perf_counter() * 1000

        with self._lock:
            self._sent_at[self._iter] = now_ms

        # Content format matches k6:
        # `STRESS_TEST: VU=${__VU} Iter=${__ITER} Time=${timestamp}`
        # __VU → UID=<user_id>  (per-process unique, like k6 VU id)
        content = (
            f"STRESS_TEST: UID={self._user_id} "
            f"Iter={self._iter} "
            f"Time={int(now_ms)}"
        )

        try:
            self._sio.emit("send_message", {
                "room_id":    self._room_id,
                "channel_id": self._channel_id,
                "content":    content,
            })
            # mirrors: messagesSent.add(1)
            _fire(self.environment, "ws_messages_sent", 0)
        except Exception as exc:
            with self._lock:
                self._sent_at.pop(self._iter, None)
            # mirrors: errors.add(1)
            _fire(self.environment, "ws_send_error", 0, exception=exc)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _shutdown(self):
        """Called by the 110-second timer — mirrors socket.setTimeout in k6."""
        self._running = False
        try:
            self._sio.disconnect()
        except Exception:
            pass
        raise StopUser()


# ---------------------------------------------------------------------------
# Load shape — mirrors k6 stages exactly
#
#   { duration: '30s', target: 100 }   ramp up
#   { duration: '1m',  target: 500 }   hold / ramp up
#   { duration: '30s', target: 0   }   ramp down
# ---------------------------------------------------------------------------

class DeezcordShape(LoadTestShape):
    """
    Locust shapes work on cumulative elapsed time.
    spawn_rate is users/second added (or removed) to reach the target.
    """

    stages = [
        # (cumulative end time s, target users, spawn_rate users/s)
        (30,  100, 100 / 30),   # 0–30 s:   ramp 0 → 100
        (90,  500, 400 / 60),   # 30–90 s:  ramp 100 → 500
        (120,   0, 500 / 30),   # 90–120 s: ramp 500 → 0
    ]

    def tick(self):
        elapsed = self.get_run_time()
        for end_time, users, rate in self.stages:
            if elapsed <= end_time:
                return (users, rate)
        return None   # stop the test