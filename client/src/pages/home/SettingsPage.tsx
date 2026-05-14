import { useOutletContext, Navigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import RoomSettings from '../../components/RoomSettings';
import { generateSlug } from '../../utils/slug';
import type { Room, Member } from '../../types/room';

interface HomeContextType {
  currentRoom: Room;
  members: Member[];
  fetchMembers: (roomId: string) => Promise<void>;
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  navigate: NavigateFunction;
  handleDeleteDM: (roomId: string) => Promise<boolean>;
}

export default function SettingsPage() {
  const { currentRoom, members, fetchMembers, setRooms, navigate, handleDeleteDM } = useOutletContext<HomeContextType>();

  if (!currentRoom || !currentRoom.isMember) {
    return <Navigate to={currentRoom ? `/${generateSlug(currentRoom.name)}` : '/'} replace state={currentRoom ? { roomId: currentRoom.id } : undefined} />;
  }

  const handleRoomUpdate = (updatedRoom: Room) => {
    setRooms((prev) => prev.map((r) => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
  };

  const handleLeaveRoom = () => {
    setRooms((prev) => prev.filter((r) => r.id !== currentRoom.id));
    navigate('/');
  };

  return (
    <RoomSettings 
      room={currentRoom} 
      members={members} 
      onRoomUpdate={handleRoomUpdate}
      onMemberChange={() => fetchMembers(currentRoom.id)}
      onLeave={handleLeaveRoom}
      onDeleteDM={handleDeleteDM}
    />
  );
}



