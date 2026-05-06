import { useState, useEffect } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import MemberProfileModal from '../../components/MemberProfileModal';
import { useToast } from '../../hooks/useToast';
import { generateSlug } from '../../utils/slug';

export default function ChatPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { addToast } = useToast();

  const {
    currentRoom,
    currentChannel,
    messages,
    members,
    user,
    typingUsers,
    isLoadingMessages,
    toggleReaction,
    sendMessage,
    unsendMessage,
    startTyping,
    stopTyping
  } = useOutletContext<any>();

  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragging(false);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          addToast('File size must be less than 5MB', 'error');
          return;
        }
        setDroppedFile(file);
      }
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [addToast]);

  if (!currentRoom || !currentRoom.isMember || !currentChannel) {
    return <Navigate to={currentRoom ? `/${generateSlug(currentRoom.name)}` : '/'} replace state={currentRoom ? { roomId: currentRoom.id } : undefined} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500/50 m-4 rounded-[2rem] pointer-events-none animate-fade-in">
          <div className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl flex flex-col items-center gap-4 scale-110">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-xl font-bold">Drop anywhere to upload</span>
            <p className="text-sm opacity-80 font-medium">Sending to #{currentChannel?.name}</p>
          </div>
        </div>
      )}
      
      <MessageList 
        messages={messages} 
        members={members}
        currentUser={user} 
        typingUsers={typingUsers} 
        isLoadingMessages={isLoadingMessages}
        onToggleReaction={toggleReaction}
        onDeleteMessage={unsendMessage}
        onReplyMessage={(msg) => setReplyTo({ id: msg.id, username: msg.username, content: msg.content })}
        onUserClick={(clickedUser) => {
          if (clickedUser.id !== user?.id) {
            setSelectedUser(clickedUser);
            setIsProfileModalOpen(true);
          }
        }}
      />
      <MessageInput 
        onSendMessage={(content, fileUrl, fileName, parentId) => {
          sendMessage(content, fileUrl, fileName, parentId);
          setReplyTo(null);
        }} 
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        roomId={currentRoom.id}
        channelId={currentChannel.id}
        externalFile={droppedFile}
        onClearExternalFile={() => setDroppedFile(null)}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />

      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
