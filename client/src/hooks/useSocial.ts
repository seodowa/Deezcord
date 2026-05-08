import { useState, useEffect } from 'react';
import type { User } from '../types/user';
import * as friendService from '../services/friendService';
import * as userService from '../services/userService';

export const useSocial = () => {
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [pendingList, setPendingList] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(null);
  const [isFriendProfileOpen, setIsFriendProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'friends' | 'search'>('friends');

  useEffect(() => {
    const fetchFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const [friendsData, pendingData] = await Promise.all([
          friendService.getFriendsList(),
          friendService.getPendingFriends()
        ]);
        setFriendsList(friendsData);
        setPendingList(pendingData);
      } catch (error) {
        console.error("Failed to load friends", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    fetchFriends();
  }, []);

  const handleUserSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await userService.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search users', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      await friendService.acceptFriend(requesterId);
      const acceptedFriend = pendingList.find(p => p.id === requesterId);
      if (acceptedFriend) {
        setPendingList(prev => prev.filter(p => p.id !== requesterId));
        setFriendsList(prev => [...prev, { ...acceptedFriend, status: 'friends', isOnline: false }]);
      }
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    try {
      await friendService.removeFriend(requesterId);
      setPendingList(prev => prev.filter(p => p.id !== requesterId));
    } catch (err) {
      console.error('Failed to decline friend request', err);
    }
  };

  const handleUserClick = (u: { id: string; username: string; avatar_url?: string | null }) => {
    setSelectedFriendProfile(u);
    setIsFriendProfileOpen(true);
  };

  const handleRefreshFriends = async () => {
    try {
      const friendsData = await friendService.getFriendsList();
      setFriendsList(friendsData);
    } catch (error) {
      console.error("Failed to refresh friends", error);
    }
  };

  return {
    friendsList,
    pendingList,
    isLoadingFriends,
    selectedFriendProfile,
    isFriendProfileOpen,
    setIsFriendProfileOpen,
    isUserProfileOpen,
    setIsUserProfileOpen,
    searchResults,
    isSearching,
    searchQuery,
    activeSidebarTab,
    setActiveSidebarTab,
    handleUserSearch,
    handleAcceptRequest,
    handleDeclineRequest,
    handleUserClick,
    handleRefreshFriends
  };
};
