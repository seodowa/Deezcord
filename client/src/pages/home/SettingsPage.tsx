import { useOutletContext, Navigate } from 'react-router-dom';
import RoomSettings from '../../components/RoomSettings';
import { generateSlug } from '../../utils/slug';

export default function SettingsPage() {
  const { currentRoom, members, fetchMembers, setRooms, navigate } = useOutletContext<any>();

  if (!currentRoom || !currentRoom.isMember) {
    return <Navigate to={currentRoom ? `/${generateSlug(currentRoom.name)}` : '/'} replace state={currentRoom ? { roomId: currentRoom.id } : undefined} />;
  }

  const handleRoomUpdate = (updatedRoom: any) => {
    setRooms((prev: any) => prev.map((r: any) => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
  };

  const handleLeaveRoom = () => {
    setRooms((prev: any) => prev.filter((r: any) => r.id !== currentRoom.id));
    navigate('/');
  };

  return (
    <RoomSettings 
      room={currentRoom} 
      members={members} 
      onRoomUpdate={handleRoomUpdate}
      onMemberChange={() => fetchMembers(currentRoom.id)}
      onLeave={handleLeaveRoom}
    />
  );
}
