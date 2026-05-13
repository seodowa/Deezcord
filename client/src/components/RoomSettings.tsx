import { useState, useRef } from 'react';
import type { Room, Member } from '../types/room';
import AsyncButton from './AsyncButton';
import Modal from './Modal';
import MemberProfileModal from './MemberProfileModal';
import MFAChallengeModal from './MFAChallengeModal';
import { useToast } from '../hooks/useToast';
import MfaTransactionModal from './MfaTransactionModal';
import { updateRoom, addMember, kickMember, leaveRoom, deleteRoom } from '../services/roomService';
import { useAuth } from '../hooks/useAuth';
import { useMFAChallenge } from '../hooks/useMFAChallenge';

interface RoomSettingsProps {
  room: Room;
  members: Member[];
  onRoomUpdate: (updatedRoom: Room) => void;
  onMemberChange: () => void;
  onLeave: () => void;
  onDeleteDM?: (roomId: string) => Promise<boolean>;
  onMessageClick?: (u: { id: string; username: string; avatar_url?: string | null }) => Promise<void> | void;
}

export default function RoomSettings({ room, members, onRoomUpdate, onMemberChange, onLeave, onDeleteDM, onMessageClick }: RoomSettingsProps) {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState(room.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(room.room_profile || null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMfaTransaction, setShowMfaTransaction] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'delete_room' | 'leave_room' | 'kick_member' | null>(null);
  const [targetMember, setTargetMember] = useState<{ id: string; username: string } | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { isChallengeOpen, factorId, startChallenge, closeChallenge, handleVerified } = useMFAChallenge();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const isOwner = room.role === 'owner';
  const isDM = room.is_dm;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpdateRoom = async () => {
    if (!roomName.trim()) {
      addToast('Room name cannot be empty', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateRoom(room.id, roomName, selectedFile);
      onRoomUpdate(updated);
      addToast('Room settings updated!', 'success');
      setSelectedFile(null);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update room', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await addMember(room.id, inviteEmail);
      addToast(`Added ${inviteEmail} to the room`, 'success');
      setInviteEmail('');
      onMemberChange();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to add member', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleKickMember = async () => {
    if (!targetMember) return;

    setKickingId(targetMember.id);
    try {
      await kickMember(room.id, targetMember.id);
      addToast(`Removed ${targetMember.username}`, 'info');
      setConfirmAction(null);
      setTargetMember(null);
      onMemberChange();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    } finally {
      setKickingId(null);
    }
  };

  const handleLeaveRoom = async () => {
    if (isOwner && !isDM) {
      addToast('Owners cannot leave. Transfer ownership first (coming soon).', 'error');
      return;
    }

    setIsLeaving(true);
    try {
      if (isDM && onDeleteDM) {
        const success = await onDeleteDM(room.id);
        if (success) {
          addToast('Left conversation successfully', 'info');
          setConfirmAction(null);
          onLeave();
        }
      } else {
        await leaveRoom(room.id);
        addToast('You have left the room', 'info');
        setConfirmAction(null);
        onLeave();
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : (isDM ? 'Failed to leave conversation' : 'Failed to leave room'), 'error');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteRoom = async (mfaCode?: string) => {
    if (!isOwner) return;
    setIsDeleting(true);
    try {
      await deleteRoom(room.id, mfaCode);
      addToast('Room deleted successfully', 'success');
      setConfirmAction(null);
      setShowMfaTransaction(false);
      onLeave(); // We can reuse onLeave to navigate away
    } catch (err: any) {
      if (err.code === 'MFA_REQUIRED_TRANSACTIONAL') {
        setConfirmAction(null); // Close the initial confirm modal
        setShowMfaTransaction(true);
      } else if (err.message === 'MFA_REQUIRED') {
        // Fallback for old session-level MFA if still used
        startChallenge(() => handleDeleteRoom());
      } else {
        addToast(err instanceof Error ? err.message : 'Failed to delete room', 'error');
        // Re-throw so the AsyncButton in the transaction modal can handle error state
        if (mfaCode) throw err;
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Room Settings</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your community and room preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Room Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center text-sm">📝</span>
                General Details
              </h3>
              
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div 
                    onClick={() => isOwner && fileInputRef.current?.click()}
                    className={`relative w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-300 overflow-hidden shrink-0 ${
                      isOwner 
                        ? 'cursor-pointer hover:border-blue-500 group border-slate-300 dark:border-slate-700' 
                        : 'border-transparent'
                    }`}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">#</span>
                    )}
                    
                    {isOwner && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                  
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Room Name</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        disabled={!isOwner}
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50"
                        placeholder="Room Name"
                      />
                    </div>
                    {isOwner && (
                      <AsyncButton
                        onClick={handleUpdateRoom}
                        isLoading={isUpdating}
                        className="w-full md:w-auto px-8 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5 font-bold shadow-lg shadow-blue-500/30 transition-all duration-300 cursor-pointer"
                      >
                        Save Changes
                      </AsyncButton>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Member List */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center text-sm">👥</span>
                Members ({members.length})
              </h3>
              
              <div className="space-y-3">
                {members.map((member) => {
                  // Defensive check: Supabase joins can sometimes return an array or object
                  const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                  if (!profile) return null;

                  return (
                    <div 
                      key={member.user_id} 
                      className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 transition-all hover:shadow-sm ${member.user_id !== user?.id ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50' : ''}`}
                      onClick={() => {
                        if (member.user_id !== user?.id) {
                          setSelectedProfile({
                            id: member.user_id,
                            username: profile.username || 'Unknown User',
                            avatar_url: profile.avatar_url
                          });
                          setIsProfileModalOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 overflow-hidden">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                              (profile.username || 'U').substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 ${
                              member.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                            title={member.isOnline ? 'Online' : 'Offline'}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-50 truncate">{profile.username || 'Unknown User'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email || 'No email provided'}</p>
                        </div>
                        {member.role === 'owner' && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-tight">Owner</span>
                        )}
                      </div>
                      
                      {isOwner && member.role !== 'owner' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetMember({ id: member.user_id, username: profile.username || 'this user' });
                            setConfirmAction('kick_member');
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Invite */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm sticky top-8">
              <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center text-sm">✉️</span>
                Invite People
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {isOwner 
                  ? "Directly add new members to your community by entering their registered email address."
                  : "Only the room owner can invite new members."}
              </p>
              
              <form onSubmit={handleAddMember} className="space-y-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!isOwner || isInviting}
                  placeholder="user@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 disabled:opacity-50"
                />
                <AsyncButton
                  type="submit"
                  isLoading={isInviting}
                  disabled={!isOwner || !inviteEmail.trim()}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-purple-500/30 transition-all duration-300 disabled:opacity-50"
                >
                  Add Member
                </AsyncButton>
              </form>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-red-200/50 dark:border-red-500/20 rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-red-600 dark:text-red-500 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center text-sm">⚠️</span>
            Danger Zone
          </h3>
          
          <div className="space-y-6">
            {!isOwner || isDM ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-50">{isDM ? 'Leave Conversation' : 'Leave Room'}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isDM 
                      ? 'This conversation will be hidden from your list until you receive a new message or search for the user again.' 
                      : 'You will no longer be able to see messages or participate in this community.'}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmAction('leave_room')}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-8 py-2.5 font-bold shadow-lg shadow-red-500/30 transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  {isDM ? 'Leave Conversation' : 'Leave Room'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-50">Delete Room</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Permanently delete this room, all channels, and all messages. This cannot be undone.</p>
                </div>
                <button
                  onClick={() => setConfirmAction('delete_room')}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-8 py-2.5 font-bold shadow-lg shadow-red-500/30 transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  Delete Room
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Room Modal */}
      <Modal
        isOpen={confirmAction === 'delete_room'}
        onClose={() => setConfirmAction(null)}
        title="Delete Room"
        description={`Are you sure you want to delete "${room.name}"?`}
        maxWidth="max-w-md"
        isLoading={isDeleting}
        footer={
          <>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={isDeleting}
              className="px-6 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              onClick={() => handleDeleteRoom()}
              isLoading={isDeleting}
              loadingText="Deleting..."
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all cursor-pointer"
            >
              Delete Permanently
            </AsyncButton>
          </>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl">
            🗑️
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            This action is irreversible. You will lose all member history, media, and configurations. All members will be removed instantly.
          </p>
        </div>
      </Modal>

      {/* Leave Room/Conversation Modal */}
      <Modal
        isOpen={confirmAction === 'leave_room'}
        onClose={() => setConfirmAction(null)}
        title={isDM ? 'Leave Conversation' : 'Leave Room'}
        description={`Are you sure you want to leave ${isDM ? 'the conversation with ' + room.name : '"' + room.name + '"'}?`}
        maxWidth="max-w-md"
        isLoading={isLeaving}
        footer={
          <>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={isLeaving}
              className="px-6 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              onClick={handleLeaveRoom}
              isLoading={isLeaving}
              loadingText={isDM ? 'Leaving...' : 'Leaving...'}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all cursor-pointer"
            >
              {isDM ? 'Leave Conversation' : 'Leave Room'}
            </AsyncButton>
          </>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl">
            {isDM ? '💬' : '🚪'}
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {isDM 
              ? 'This will hide the conversation from your sidebar. It will reappear if you receive a new message or search for the user again.'
              : "You will lose access to all channels and messages in this room. You'll need an invite or find the room in discovery to join again."}
          </p>
        </div>
      </Modal>

      {/* Kick Member Modal */}
      <Modal
        isOpen={confirmAction === 'kick_member'}
        onClose={() => { setConfirmAction(null); setTargetMember(null); }}
        title="Remove Member"
        description={targetMember ? `Are you sure you want to remove ${targetMember.username}?` : ''}
        maxWidth="max-w-md"
        isLoading={!!kickingId}
        footer={
          <>
            <button
              onClick={() => { setConfirmAction(null); setTargetMember(null); }}
              disabled={!!kickingId}
              className="px-6 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              onClick={handleKickMember}
              isLoading={!!kickingId}
              loadingText="Removing..."
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all cursor-pointer"
            >
              Remove Member
            </AsyncButton>
          </>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl">
            👤
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            The user will be immediately disconnected from all channels in this room and will no longer see its content.
          </p>
        </div>
      </Modal>

      {/* Member Profile Modal */}
      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={selectedProfile}
        onMessageClick={onMessageClick}
      />

      {/* MFA Transaction Modal for Room Deletion */}
      <MfaTransactionModal
        isOpen={showMfaTransaction}
        onClose={() => setShowMfaTransaction(false)}
        onConfirm={handleDeleteRoom}
        title="Confirm Room Deletion"
        description={`Please enter your 6-digit security code to permanently delete "${room.name}".`}
        actionLabel="Verify & Delete Room"
      />

      {/* MFA Challenge Modal */}
      {factorId && (
        <MFAChallengeModal
          isOpen={isChallengeOpen}
          factorId={factorId}
          onClose={closeChallenge}
          onSuccess={handleVerified}
        />
      )}

    </div>
  );
}
