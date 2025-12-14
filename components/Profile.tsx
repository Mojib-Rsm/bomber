import React from 'react';
import { LogEntry, Contact, AppView } from '../types';
import { User, Trash2, Activity, Zap, Send, MessageCircle, ShieldAlert } from 'lucide-react';

interface ProfileProps {
  logs: LogEntry[];
  contacts: Contact[];
  onClearLogs: () => void;
  onClearContacts: () => void;
  onNavigate: (view: AppView) => void;
}

const Profile: React.FC<ProfileProps> = ({ logs, onClearLogs, onNavigate }) => {
  const totalAttacks = logs.length;
  const successful = logs.filter(l => l.status === 'sent').length;
  const rate = totalAttacks > 0 ? Math.round((successful / totalAttacks) * 100) : 0;
  
  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
       <div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</p>
          <p className="text-xl font-mono-code text-white font-bold">{value}</p>
       </div>
       <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
       </div>
    </div>
  );

  return (
    <div className="p-5 pb-20 space-y-6 animate-fade-in">
       
       {/* User Header */}
       <div className="flex items-center gap-4 py-2">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center relative">
             <User className="w-8 h-8 text-zinc-400" />
             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-zinc-800">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
             </div>
          </div>
          <div className="flex-1">
             <h2 className="text-xl font-bold text-white">Administrator</h2>
             <span className="text-xs text-zinc-500 font-mono-code">ID: 8823-ALPHA</span>
          </div>
          <button 
             onClick={() => onNavigate(AppView.ADMIN)}
             className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
             <ShieldAlert className="w-5 h-5" />
          </button>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Ops" value={totalAttacks} icon={Activity} color="bg-blue-500" />
          <StatCard label="Success Rate" value={`${rate}%`} icon={Zap} color="bg-emerald-500" />
       </div>

       {/* Official Channels */}
       <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Official Channels</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <a 
              href="https://t.me/YOUR_TELEGRAM_CHANNEL" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#229ED9]/10 border border-[#229ED9]/20 rounded-xl hover:bg-[#229ED9]/20 transition-all group"
            >
               <Send className="w-6 h-6 text-[#229ED9] group-hover:scale-110 transition-transform" />
               <span className="text-xs font-bold text-[#229ED9]">Telegram</span>
            </a>
            
            <a 
              href="https://whatsapp.com/channel/YOUR_WHATSAPP_CHANNEL" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-all group"
            >
               <MessageCircle className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform" />
               <span className="text-xs font-bold text-[#25D366]">WhatsApp</span>
            </a>
          </div>
       </div>

       {/* Settings */}
       <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Data Management</h3>
          
          <button 
             onClick={() => confirm('Clear all logs?') && onClearLogs()}
             className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-500 transition-all group"
          >
             <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-500" />
                <span className="text-sm font-medium">Clear History Logs</span>
             </div>
             <span className="text-xs text-zinc-600 font-mono-code">{logs.length} items</span>
          </button>
       </div>
       
       <div className="pt-8 text-center">
          <p className="text-[10px] text-zinc-600 font-mono-code">NETSTRIKE v2.0.5 // TACTICAL BUILD</p>
       </div>
    </div>
  );
};

export default Profile;