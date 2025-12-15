import React, { useState, useEffect, useRef } from 'react';
import { MessageTemplate, LogEntry, ApiNode, UserProfile } from '../types';
import { Zap, StopCircle, Terminal, Server, CloudLightning, Wifi } from 'lucide-react';
import { addDoc, doc, updateDoc, onSnapshot } from "firebase/firestore"; 
import { db, collections } from '../firebase';

interface SenderProps {
  templates: MessageTemplate[];
  onSend: (log: LogEntry) => void;
  protectedNumbers: string[];
  activeNodes: ApiNode[];
  currentUser: UserProfile | null;
}

const Sender: React.FC<SenderProps> = ({ templates, onSend, protectedNumbers, activeNodes, currentUser }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ success: 0, fail: 0 });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Cleanup on unmount
  useEffect(() => {
     return () => {
         // No local abort needed anymore, but we clear the ref
         activeSessionId.current = null;
     };
  }, []); 

  const addLog = (msg: string) => {
    setConsoleLogs(prev => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`];
      return newLogs.length > 50 ? newLogs.slice(newLogs.length - 50) : newLogs;
    });
  };

  // --- Start Attack (Cloud Only) ---
  const handleStart = async () => {
    if (isRunning) return;
    if (!phoneNumber) { addLog(">> ERROR: TARGET REQUIRED"); return; }
    if (!amount) { addLog(">> ERROR: AMOUNT REQUIRED"); return; }
    
    const count = parseInt(amount);
    if (isNaN(count) || count <= 0) { addLog(">> ERROR: INVALID AMOUNT"); return; }

    if (protectedNumbers.includes(phoneNumber)) {
        addLog(">> BLOCKED: TARGET IN PROTECTOR DB");
        return;
    }

    // Strict Cloud Requirement
    if (!db || !currentUser || currentUser.uid.startsWith('guest_')) {
        addLog(">> ACCESS DENIED: LOGIN REQUIRED FOR SERVER REQUESTS.");
        return;
    }

    setIsRunning(true);
    setProgress(0);
    setConsoleLogs([]);
    setStats({ success: 0, fail: 0 });
    
    addLog(`>> CONNECTING TO SERVER...`);
    addLog(`>> TARGET: ${phoneNumber} | AMOUNT: ${count}`);

    try {
        addLog(">> QUEUING TASK...");
        const docRef = await addDoc(collections.sessions(db), {
            userId: currentUser.uid,
            username: currentUser.username,
            target: phoneNumber,
            amount: count,
            sent: 0,
            failed: 0,
            status: 'queued', 
            mode: 'cloud',
            startTime: new Date(),
            lastUpdate: new Date()
        });
        activeSessionId.current = docRef.id;
        addLog(`>> TASK ID: ${docRef.id.slice(0,8)}`);
        addLog(">> WAITING FOR ENGINE...");

        // Listen to progress updates from the Server
        const unsubscribe = onSnapshot(doc(db, 'active_sessions', docRef.id), (docSnap) => {
            const data = docSnap.data();
            if (data) {
                setStats({ success: data.sent, fail: data.failed });
                const total = data.sent + data.failed;
                const pct = Math.min((total / data.amount) * 100, 100);
                setProgress(pct);
                
                if (data.status === 'running') {
                    // Update UI to show it's picked up
                    if (progress === 0 && total === 0) addLog(">> SERVER: PROCESSING...");
                }
                
                if (data.status === 'completed' || data.status === 'stopped') {
                    addLog(`>> FINISHED: ${data.status.toUpperCase()}`);
                    setIsRunning(false);
                    activeSessionId.current = null;
                    unsubscribe();
                }
            }
        });

    } catch (e) {
        console.error(e);
        addLog(">> CONNECTION FAILED. CHECK NETWORK.");
        setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (activeSessionId.current && db) {
        try {
            await updateDoc(doc(db, 'active_sessions', activeSessionId.current), { status: 'stopped' });
            addLog(">> CANCELLING REQUEST...");
        } catch (e) {
            addLog(">> ERROR STOPPING TASK");
        }
    }
  };

  const buttonClass = `w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
    isRunning 
    ? 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border border-red-900/50' 
    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
  }`;

  const buttonContent = isRunning ? (
    <><StopCircle className="w-5 h-5" /> Cancel Request</>
  ) : (
    <><Zap className="w-5 h-5 fill-current" /> Send Request</>
  );

  return (
    <div className="p-5 pb-10 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
                <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">SMS Bomber</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-zinc-500 font-mono-code uppercase">Server Engine Ready</p>
                </div>
            </div>
          </div>
          {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
                  <CloudLightning className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
              </div>
          )}
      </div>

      <div className="space-y-4">
        
        {/* Inputs */}
        <div className="space-y-1.5">
           <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Target Number</label>
           <input
             disabled={isRunning}
             type="text"
             inputMode="numeric"
             value={phoneNumber}
             onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
             placeholder="017xxxxxxxx"
             className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-lg font-mono-code focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-zinc-700"
           />
        </div>

        <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Amount</label>
            <input
            disabled={isRunning}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Maximum 500"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-lg font-mono-code focus:border-red-500 outline-none transition-all text-center"
            />
        </div>

        {/* Info Box Simplified */}
        <div className="p-3 border rounded-lg flex items-start gap-2 text-[10px] bg-emerald-500/5 border-emerald-500/20 text-emerald-500">
           <Wifi className="w-4 h-4 mt-0.5 shrink-0" />
           <p className="leading-relaxed">
             <strong>Server-Side Execution:</strong> Requests are processed by our cloud engine. You can close this app or turn off your internet after the task is queued.
           </p>
        </div>

        {/* Action Button */}
        <button
          onClick={isRunning ? () => handleStop() : handleStart}
          className={buttonClass}
        >
          {buttonContent}
        </button>
      </div>

      {/* Terminal */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-inner">
         <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
              <Terminal className="w-3 h-3" /> Console
            </span>
            <div className="flex gap-3 text-[10px] font-mono-code">
               <span className="text-emerald-500">SENT:{stats.success}</span>
               <span className="text-red-500">FAIL:{stats.fail}</span>
            </div>
         </div>
         
         <div 
           ref={scrollRef}
           className="h-40 overflow-y-auto p-4 font-mono-code text-[10px] text-zinc-400 space-y-1 scroll-smooth"
         >
            {consoleLogs.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                  <Server className="w-6 h-6" />
                  <span>Ready to queue</span>
               </div>
            ) : (
               consoleLogs.map((l, i) => (
                 <div key={i} className={`border-l-2 pl-2 py-0.5 ${l.includes('FAILED') || l.includes('ERR') || l.includes('STOPPED') ? 'border-red-500 text-red-400' : 'border-zinc-800'}`}>
                   {l}
                 </div>
               ))
            )}
            {isRunning && <div className="animate-pulse text-emerald-500">_</div>}
         </div>
         
         {/* Progress Bar */}
         {isRunning && (
            <div className="h-1 bg-zinc-900 w-full">
               <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
         )}
      </div>
    </div>
  );
};

export default Sender;