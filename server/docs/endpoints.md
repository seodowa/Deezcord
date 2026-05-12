Deezcord Backend API Documentation

Base URL: http://localhost:3001 (or your configured PORT environment variable).
Authentication Method: Most protected endpoints require a JWT token passed in the Authorization header as Bearer <token>. The backend relies on Supabase for Auth.
1. Authentication Endpoints (/auth)
Register a New User

Creates a new user account via Supabase auth.

    Endpoint: POST /auth/register

    Authentication: None

    Request Body (application/json):
    JSON

    {
      "username": "johndoe",
      "email": "johndoe@example.com",
      "password": "securepassword123"
    }

    Responses:

        201 Created: Successful registration. Returns the new user data.

        400 Bad Request: Missing fields, weak password, or duplicate credentials.

Get Current User Info

Checks if the current authentication token is valid and returns the user's data.

    Endpoint: GET /auth/me

    Authentication: Required (Bearer <token>)

    Responses:

        200 OK:
        JSON

        {
          "status": "authenticated",
          "message": "Your token is valid!",
          "user": {
            "id": "uuid...",
            "email": "johndoe@example.com",
            "role": "authenticated",
            "last_sign_in": "2023-11-20T12:00:00Z"
          }
        }

        401 Unauthorized: Token missing or invalid.

2. Room Endpoints (/rooms)
Get All Rooms

Fetches a list of all chat rooms for the sidebar, ordered by creation date.

    Endpoint: GET /rooms

    Authentication: Required (Bearer <token>)

    Responses:

        200 OK: Returns an array of Room objects.

        401 Unauthorized: Token missing or invalid.

        500 Internal Server Error: Database failure.

Create a New Room

Creates a new chat room.

    Endpoint: POST /rooms

    Authentication: Required (Bearer <token>)

    Request Body (application/json):
    JSON

    {
      "name": "General Chat"
    }

    Responses:

        201 Created: Returns the newly created room object (including its generated id).

        400 Bad Request: Room name is missing, empty, or exceeds 100 characters.

        409 Conflict: A room with this name already exists.

        500 Internal Server Error: Database failure.

Get Room Messages

Fetches the message history for a specific room, ordered chronologically.

    Endpoint: GET /rooms/:roomId/messages

    Authentication: Required (Bearer <token>)

    Path Parameters:

        roomId (string): The UUID of the room.

    Responses:

        200 OK: Returns an array of Message objects.

        401 Unauthorized: Token missing or invalid.

        500 Internal Server Error: Database failure.

3. Health & Monitoring Endpoints (/health)
System Health Check

Lightweight system check, ideal for automated uptime monitoring.

    Endpoint: GET /health

    Authentication: None

    Responses:

        200 OK: Server and DB are healthy.

        503 Service Unavailable: Database disconnected.

        500 Internal Server Error: Overall service down.

Integration Test Health Check

Deep Database CRUD Test (Best for manual developer testing). It creates a dummy room, sends a message, pauses for 10 seconds, and executes cascading DB deletions to ensure full functionality.

    Endpoint: GET /health/integration

    Authentication: None

    Responses:

        200 OK: Integration test completely successful.

        500 Internal Server Error: Test failed, cleanup executed.

4. Socket.io Events

The realtime chat system relies on Socket.IO running on the same port.
Authentication

The client must pass their JWT token upon connection initialization to bypass the bouncer:
JavaScript

const socket = io("http://localhost:3001", {
  auth: { token: "user_jwt_token_here" }
});

If unauthorized, the socket connection will be rejected.
Emitted Events (Client -> Server)

    join_room

        Payload: room_id (string)

        Description: Subscribes the user to the specified room. The backend checks the DB to ensure the room exists before permitting the join.

    send_message

        Payload: ```json
        {
        "room_id": "uuid...",
        "content": "Hello everyone!"
        }

        Description: Saves a new message to the database and broadcasts it to all other users in that room. The sender's username is automatically extrapolated and secured by the server based on the user's JWT token.

Received Events (Server -> Client)

    receive_message

        Payload:
        JSON

        {
          "room_id": "uuid...",
          "content": "Hello everyone!",
          "username": "johndoe"
        }

        Description: Triggered whenever another user successfully sends a message to a room you have joined.