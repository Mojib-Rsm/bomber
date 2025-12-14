import React from 'react';
import { LogEntry } from '../types';
import { CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';

interface HistoryLogProps {
  logs: LogEntry[];
}

const HistoryLog: React.FC<HistoryLogProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="p-5 pb-10 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pl-1">
         <h2 className="text-lg font-bold text-white">Operation Logs</h2>
         <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{logs.length} entries</span>
      </div>

      <div className="space-y-3">
        {sortedLogs.length === 0 ? (
           <div className="text-center py-12 text-zinc-600">
              <p className="text-sm">No operations recorded yet.</p>
           </div>
        ) : (
           sortedLogs.map(log => (
             <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4 hover:border-zinc-700 transition-colors">
                <div className="mt-1">
                   {log.status === 'sent' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                   {log.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                   {log.status === 'queued' && <Clock className="w-5 h-5 text-amber-500" />}
                </div>
                
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-1">
                      <h3 className="font-mono-code text-sm font-bold text-zinc-200">{log.contactPhone}</h3>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                   </div>
                   <p className="text-xs text-zinc-400 truncate">{log.message}</p>
                </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
};

export default HistoryLog;