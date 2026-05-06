import { useOutletContext, Navigate } from 'react-router-dom';
import AsyncButton from '../../components/AsyncButton';
import type { Room } from '../../types/room';

interface HomeContextType {
  currentRoom: Room;
  isJoining: boolean;
  joinExistingRoom: (room: Room) => Promise<Room>;
}

export default function RoomPage() {
  const { currentRoom, isJoining, joinExistingRoom } = useOutletContext<HomeContextType>();

  if (!currentRoom) {
    return <Navigate to="/" replace />;
  }

  const handleJoinRoom = async () => {
    try {
      await joinExistingRoom(currentRoom);
      // Let the layout's useEffect handle redirecting to the first channel
    } catch {
      // Error handled in useRooms
    }
  };

  if (currentRoom.isMember) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-6">
        <div className="text-4xl mb-4">💬</div>
        <p>No channel selected or available.</p>
        {currentRoom.role === 'owner' && (
           <p className="text-sm mt-2">Create a new channel in the sidebar.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="min-h-full flex items-center justify-center">
        <div className="max-w-md w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 text-center shadow-xl animate-fade-in-up">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl">
            🔒
          </div>
          <h2 className="text-2xl font-extrabold mb-2 tracking-tight text-slate-900 dark:text-slate-50">Private Room</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            You are not a member of <strong>#{currentRoom.name}</strong>. Join the room to see messages and participate in the conversation.
          </p>
          <AsyncButton
            onClick={handleJoinRoom}
            isLoading={isJoining}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/30 transition-all duration-300"
          >
            Join Room
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
