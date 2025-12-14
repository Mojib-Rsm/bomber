import React from 'react';
import { AppView } from '../types';
import { Activity, ShieldCheck, Terminal, List, ArrowRight, Shield, Send, MessageCircle } from 'lucide-react';

interface HomeProps {
  onNavigate: (view: AppView) => void;
  nodeCount?: number;
}

const Home: React.FC<HomeProps> = ({ onNavigate, nodeCount = 0 }) => {
  
  const Widget = ({ title, icon: Icon, color, onClick, desc, active = true }: any) => (
    <button 
      onClick={active ? onClick : undefined}
      className={`relative w-full text-left p-5 rounded-xl border transition-all duration-200 group overflow-hidden ${
        active 
        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 active:scale-[0.99]' 
        : 'bg-zinc-900/50 border-zinc-800/50 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500`}>
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        
        <div>
           <h3 className="text-sm font-bold text-white font-display tracking-wide">{title}</h3>
           <p className="text-xs text-zinc-500 mt-1">{desc}</p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="p-5 space-y-6 animate-fade-in pb-10">
       
       {/* Status Header */}
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">System Status</h2>
            <p className="text-xs text-emerald-500 flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              All Systems Operational
            </p>
          </div>
          <div className="text-right">
             <div className="text-xs font-mono-code text-zinc-500">SERVER_TIME</div>
             <div className="text-sm font-mono-code text-zinc-300">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
       </div>

       {/* Quick Stats */}
       <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
             <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Api Nodes</div>
             <div className="text-lg font-mono-code text-white">{nodeCount}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
             <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Latency</div>
             <div className="text-lg font-mono-code text-emerald-500">12ms</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
             <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Success</div>
             <div className="text-lg font-mono-code text-blue-500">99%</div>
          </div>
       </div>

       {/* Main Actions */}
       <div className="grid grid-cols-2 gap-3">
          <Widget 
            title="Start Attack" 
            desc="Initialize SMS flood protocol"
            icon={Terminal} 
            color="bg-emerald-600"
            onClick={() => onNavigate(AppView.SEND)}
          />
          <Widget 
            title="Protector" 
            desc="Manage safe numbers list"
            icon={ShieldCheck} 
            color="bg-blue-600"
            onClick={() => onNavigate(AppView.PROTECTOR)}
          />
          <Widget 
            title="System Logs" 
            desc="View past operations"
            icon={List} 
            color="bg-amber-600"
            onClick={() => onNavigate(AppView.TEMPLATES)}
          />
          <Widget 
            title="Proxy Chain" 
            desc="Anonymize routing (Pro)"
            icon={Shield} 
            color="bg-red-600"
            active={false}
          />
       </div>

       {/* Recent Activity Mini-List */}
       <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-zinc-300">Recent Traffic</h3>
             <button onClick={() => onNavigate(AppView.TEMPLATES)} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
               View All <ArrowRight className="w-3 h-3" />
             </button>
          </div>
          
          <div className="space-y-3">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-zinc-700 w-3/4 animate-pulse"></div>
                </div>
                <span className="text-[10px] font-mono-code text-zinc-500">IDLE</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full"></div>
                <span className="text-[10px] font-mono-code text-zinc-600">OFF</span>
             </div>
          </div>
       </div>

       {/* Banner */}
       <div 
         onClick={() => onNavigate(AppView.PROFILE)}
         className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between relative overflow-hidden group cursor-pointer hover:border-zinc-700 transition-all"
       >
          <div className="flex items-center gap-3 relative z-10">
             <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-[#229ED9]/20 border border-[#229ED9] flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#229ED9]" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-[#25D366]/20 border border-[#25D366] flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                 </div>
             </div>
             <div>
                <h3 className="text-sm font-bold text-white">Community Hub</h3>
                <p className="text-[10px] text-zinc-500">Join our Telegram & WhatsApp</p>
             </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors relative z-10" />
       </div>

    </div>
  );
};

export default Home;