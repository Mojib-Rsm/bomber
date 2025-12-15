import React from 'react';
import { ActiveSession } from '../types';
import { CheckCircle2, XCircle, Clock, StopCircle, CloudLightning, MonitorSmartphone, AlertTriangle } from 'lucide-react';

interface HistoryLogProps {
  sessions: ActiveSession[];
  onStopSession: (id: string) => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ sessions, onStopSession }) => {
  // Sort handled by parent query, but double check
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'running': return 'text-red-500 animate-pulse';
          case 'queued': return 'text-amber-500';
          case 'completed': return 'text-emerald-500';
          case 'stopped': return 'text-zinc-500';
          default: return 'text-zinc-500';
      }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
        case 'running': return <AlertTriangle className="w-4 h-4" />;
        case 'queued': return <Clock className="w-4 h-4" />;
        case 'completed': return <CheckCircle2 className="w-4 h-4" />;
        case 'stopped': return <XCircle className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-5 pb-10 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pl-1 border-b border-zinc-800 pb-2">
         <h2 className="text-lg font-bold text-white uppercase tracking-wide">Attack History</h2>
         <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 font-mono-code">{sessions.length} OPS</span>
      </div>

      <div className="space-y-3">
        {sortedSessions.length === 0 ? (
           <div className="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
              <p className="text-xs uppercase tracking-widest">No bombing operations found</p>
           </div>
        ) : (
           sortedSessions.map(session => {
             const progress = Math.min(((session.sent + session.failed) / session.amount) * 100, 100);
             const isActive = session.status === 'running' || session.status === 'queued';

             return (
             <div key={session.id} className={`bg-zinc-900 border rounded-xl p-4 transition-all ${isActive ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 hover:border-zinc-700'}`}>
                
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-zinc-950 border border-zinc-800 ${getStatusColor(session.status)}`}>
                            {getStatusIcon(session.status)}
                        </div>
                        <div>
                            <h3 className="font-mono-code text-lg font-bold text-white leading-none">{session.target}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">{session.mode === 'cloud' ? 'Cloud Server' : 'Browser Local'}</span>
                                {session.mode === 'cloud' ? <CloudLightning className="w-3 h-3 text-blue-500" /> : <MonitorSmartphone className="w-3 h-3 text-zinc-600" />}
                            </div>
                        </div>
                    </div>
                    
                    {isActive && (
                        <button 
                          onClick={() => onStopSession(session.id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-colors shadow-lg shadow-red-900/20"
                        >
                            <StopCircle className="w-3 h-3" /> Stop
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono-code text-zinc-400">
                        <span>REQ: {session.amount}</span>
                        <span>SENT: <span className="text-emerald-500">{session.sent}</span> / FAIL: <span className="text-red-500">{session.failed}</span></span>
                    </div>
                    
                    <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                        <div 
                            className={`h-full transition-all duration-500 ${isActive ? 'bg-red-500 animate-pulse' : (session.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-600')}`} 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 ${getStatusColor(session.status)}`}>
                            {session.status}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono-code">
                            {new Date(session.lastUpdate).toLocaleString()}
                        </span>
                    </div>
                </div>
             </div>
             );
           })
        )}
      </div>
    </div>
  );
};

export default HistoryLog;