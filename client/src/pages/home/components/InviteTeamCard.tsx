interface InviteTeamCardProps {
  onAction: () => void;
}

export default function InviteTeamCard({ onAction }: InviteTeamCardProps) {
  return (
    <div className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20 flex flex-col justify-center">
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
      <div className="relative z-10 space-y-3">
        <div className="space-y-1">
          <h4 className="text-xl md:text-2xl font-extrabold tracking-tight">Invite your team</h4>
          <p className="text-slate-400 text-sm font-medium max-w-xs">
            Every community starts with a single room. Create yours today and start collaborating.
          </p>
        </div>
        <button 
          onClick={onAction}
          className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
        >
          Create a Room
        </button>
      </div>
    </div>
  );
}
