// server/utils/presence.ts
export const onlineUsers = new Map<string, number>();

export const addUser = (userId: string) => {
  const currentCount = onlineUsers.get(userId) || 0;
  onlineUsers.set(userId, currentCount + 1);
  return currentCount === 0; // True if this is the first connection
};

export const removeUser = (userId: string) => {
  const currentCount = onlineUsers.get(userId) || 0;
  if (currentCount <= 1) {
    onlineUsers.delete(userId);
    return true; // True if this was the last connection
  } else {
    onlineUsers.set(userId, currentCount - 1);
    return false;
  }
};

export const isUserOnline = (userId: string) => {
  return onlineUsers.has(userId) && (onlineUsers.get(userId) || 0) > 0;
};
