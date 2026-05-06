import type { MessageReaction } from '../types/message';

interface ReactionListProps {
  reactions: MessageReaction[];
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
}

export default function ReactionList({ 
  reactions, 
  currentUserId, 
  onToggleReaction 
}: ReactionListProps) {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {Object.entries(groupedReactions).map(([emoji, reactions]) => {
        const hasReacted = currentUserId && reactions.some(r => r.user_id === currentUserId);
        
        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(emoji);
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer ${
              hasReacted
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
            title={reactions.map(r => r.username || 'Unknown').join(', ')}
          >
            <span>{emoji}</span>
            <span>{reactions.length}</span>
          </button>
        );
      })}
    </div>
  );
}
