import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { useToast } from '../hooks/useToast';
import { useDMs } from '../hooks/useDMs';
import { getFriendStatus, requestFriend, acceptFriend, removeFriend } from '../services/friendService';
import type { User } from '../types/user';
import { generateSlug } from '../utils/slug';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onMessageClick?: (u: { id: string; username: string; avatar_url?: string | null }) => Promise<void> | void;
}

export default function MemberProfileModal({ isOpen, onClose, user, onMessageClick }: MemberProfileModalProps) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { createDM } = useDMs();
  const [friendStatus, setFriendStatus] = useState<'friends' | 'request_sent' | 'request_received' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const checkFriendStatus = async () => {
        setIsCheckingStatus(true);
        try {
          const status = await getFriendStatus(user.id);
          setFriendStatus(status as 'friends' | 'request_sent' | 'request_received' | 'none');
        } catch (error) {
          console.error('Failed to check friend status:', error);
        } finally {
          setIsCheckingStatus(false);
        }
      };
      
      checkFriendStatus();
    }
  }, [isOpen, user]);

  if (!user) return null;

  const handleToggleFriend = async () => {
    setIsLoading(true);
    try {
      if (friendStatus === 'friends') {
        await removeFriend(user.id);
        setFriendStatus('none');
        addToast(`Removed ${user.username} from your friends`, 'info');
      } else if (friendStatus === 'request_sent') {
        await removeFriend(user.id);
        setFriendStatus('none');
        addToast(`Cancelled friend request to ${user.username}`, 'info');
      } else if (friendStatus === 'request_received') {
        await acceptFriend(user.id);
        setFriendStatus('friends');
        addToast(`You and ${user.username} are now friends!`, 'success');
      } else {
        await requestFriend(user.id);
        setFriendStatus('request_sent');
        addToast(`Friend request sent to ${user.username}!`, 'success');
      }
    } catch (error: unknown) {
      const err = error as Error;
      addToast(err.message || 'Failed to update friend status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    setIsMessageLoading(true);
    try {
      if (onMessageClick) {
        await onMessageClick({ id: user.id, username: user.username, avatar_url: user.avatar_url });
        onClose();
        return;
      }

      const result = await createDM(user.id);
      if (result) {
        onClose();
        navigate(`/${generateSlug(result.room.name)}/${generateSlug('chat')}`, { 
          state: { roomId: result.room.id, channelId: result.channelId } 
        });
      } else {
        addToast('Failed to start conversation.', 'error');
      }
    } catch {
      addToast('An error occurred.', 'error');
    } finally {
      setIsMessageLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (friendStatus) {
      case 'friends':
        return {
          text: 'Unfriend',
          className: 'bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-500/20 dark:text-slate-300 dark:hover:text-red-400'
        };
      case 'request_sent':
        return {
          text: 'Cancel Request',
          className: 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
        };
      case 'request_received':
        return {
          text: 'Accept Request',
          className: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
        };
      default:
        return {
          text: 'Add Friend',
          className: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30'
        };
    }
  };

  const btnConfig = getButtonConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      maxWidth="max-w-sm"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/20 overflow-hidden shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span>{user.username.substring(0, 1).toUpperCase()}</span>
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{user.username}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ID: {user.id.substring(0, 8)}...</p>
        </div>

        {isCheckingStatus ? (
          <div className="w-full space-y-2">
             <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
             <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <AsyncButton
              onClick={handleMessage}
              isLoading={isMessageLoading}
              className="w-full py-3 rounded-xl font-bold shadow-lg transition-all duration-300 bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30 cursor-pointer"
            >
              Message
            </AsyncButton>
            <AsyncButton
              onClick={handleToggleFriend}
              isLoading={isLoading}
              className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all duration-300 ${btnConfig.className} cursor-pointer`}
            >
              {btnConfig.text}
            </AsyncButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
