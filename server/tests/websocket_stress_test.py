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
        -e DEVICE_ID=<device_id> \\
        -e ROOM_ID=<uuid> \\
        -e CHANNEL_ID=<uuid> \\
        -e BASE_URL=http://localhost:3001

Or open the web UI (omit --headless) and start from http://localhost:8089
"""

import os
import time
import threading
from dotenv import load_dotenv

import socketio # type: ignore
from locust import User, task, constant, events, LoadTestShape # type: ignore
from locust.exception import StopUser # type: ignore

load_dotenv()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fire(environment, name: str, response_time_ms: float, response_length: int = 0, exception=None):
    """Emit a Locust request event — shows up in the live stats table."""
    environment.events.request.fire(
        request_type="WS",
        name=name,
        response_time=response_time_ms,
        response_length=response_length,
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
        device_id  = os.getenv("DEVICE_ID")
        room_id    = os.getenv("ROOM_ID")
        channel_id = os.getenv("CHANNEL_ID")
        base_url   = os.getenv("BASE_URL", "http://localhost:3001")

        if not all([token, device_id, room_id, channel_id]):
            raise StopUser("Missing TOKEN, DEVICE_ID, ROOM_ID, or CHANNEL_ID env vars")

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
                auth={"token": token, "deviceId": device_id},      # mirrors: socket.send(`40{"token":"...", "deviceId":"..."}`)
                namespaces=["/"],
                wait_timeout=10,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            _fire(self.environment, "ws_connect", elapsed_ms)
        except Exception as exc:
            _fire(self.environment, "ws_connect", 0, exception=exc)
            raise StopUser()

        # ---- Join room (mirrors the '40' handler in k6) ----
        try:
            t0 = time.perf_counter()
            self._sio.emit("join_room", {
                "room_id":    self._room_id,
                "channel_id": self._channel_id,
            })
            _fire(self.environment, "join_room", (time.perf_counter() - t0) * 1000)
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
            # Calculate approx payload length for throughput tracking
            payload_len = len(str(data).encode("utf-8")) if data else 0

            content = (data or {}).get("content", "")
            
            # If not our own message, just log it as a general receive with 0 ms response time
            # This helps track overall throughput (messages per second)
            if f"UID={self._user_id}" not in content:
                _fire(self.environment, "receive_message (broadcast)", 0, response_length=payload_len)
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
                # Log RTT specifically for the message this user sent
                _fire(self.environment, "receive_message (own RTT)", rtt_ms, response_length=payload_len)

        @self._sio.on("connect_error")
        def on_connect_error(data):
            _fire(
                self.environment,
                "ws_error",
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

        content = (
            f"STRESS_TEST: UID={self._user_id} "
            f"Iter={self._iter} "
            f"Time={int(now_ms)}"
        )

        payload = {
            "room_id":    self._room_id,
            "channel_id": self._channel_id,
            "content":    content,
        }

        try:
            t0 = time.perf_counter()
            self._sio.emit("send_message", payload)
            # Emit send event to track outbound throughput (0 ms response time because it's fire-and-forget)
            _fire(self.environment, "send_message", (time.perf_counter() - t0) * 1000, response_length=len(str(payload).encode("utf-8")))
        except Exception as exc:
            with self._lock:
                self._sent_at.pop(self._iter, None)
            _fire(self.environment, "send_message", 0, exception=exc)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _shutdown(self):
        self._running = False
        try:
            self._sio.disconnect()
        except Exception:
            pass
        raise StopUser()


# ---------------------------------------------------------------------------
# Load shape — mirrors k6 stages exactly
# ---------------------------------------------------------------------------

class DeezcordShape(LoadTestShape):
    """
    Locust shapes work on cumulative elapsed time.
    """

    stages = [
        (30,  10, 10 / 30),   # 0–30 s:   ramp 0 → 10
        (90,  200, 40 / 60),   # 30–90 s:  ramp 10 → 200
        (120,   0, 50 / 30),   # 90–120 s: ramp 200 → 0
    ]

    def tick(self):
        elapsed = self.get_run_time()
        for end_time, users, rate in self.stages:
            if elapsed <= end_time:
                return (users, rate)
        return None   # stop the test