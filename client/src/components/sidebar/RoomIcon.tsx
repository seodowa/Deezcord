import { useState, useRef } from 'react';
import AsyncButton from '../AsyncButton';
import Tooltip from './Tooltip';
import type { Room } from '../../types/room';

interface RoomIconProps {
  room: Room;
  isActive: boolean;
  onClick: () => void;
}

export default function RoomIcon({ room, isActive, onClick }: RoomIconProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    // Add a slight delay to prevent rapid-fire switches and show the loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    onClick();
  };

  return (
    <>
      <div className="relative flex items-center group w-full justify-center py-1.5">
        {/* Modern Indicator: Subtle background pill instead of side-stripe */}
        {isActive && (
          <div className="absolute inset-x-2 inset-y-0.5 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl transition-all duration-300" />
        )}
        
        <AsyncButton
          ref={ref}
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative w-11 h-11 shrink-0 flex items-center justify-center font-bold text-sm transition-all duration-300 overflow-hidden ${
                      isActive
                        ? 'rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-100'
                        : 'rounded-2xl bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-indigo-500 dark:hover:text-indigo-400'
                    } cursor-pointer`}
          aria-label={room.name}
        >
          {room.room_profile ? (
            <img src={room.room_profile} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base">{room.name.charAt(0).toUpperCase()}</span>
          )}
        </AsyncButton>
      </div>
      <Tooltip text={room.name} targetRef={ref} show={hovered} />
    </>
  );
}
