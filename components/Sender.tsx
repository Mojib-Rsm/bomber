import React, { useState, useEffect, useRef } from 'react';
import { MessageTemplate, LogEntry, ApiNode, UserProfile } from '../types';
import { Zap, StopCircle, Terminal, Server, CloudLightning, Wifi, WifiOff, MonitorSmartphone } from 'lucide-react';
import { addDoc, doc, updateDoc, onSnapshot } from "firebase/firestore"; 
import { db, collections } from '../firebase';
import { executeAttackNode } from '../services/attackEngine';

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
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isRunning, setIsRunning] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false); // Cloud Mode State
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ success: 0, fail: 0 });
  
  // Refs for local execution
  const statsRef = useRef({ success: 0, fail: 0 }); 
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Cleanup on unmount (navigating away)
  useEffect(() => {
     return () => {
         if (abortControllerRef.current) {
             console.log("Component unmounting, aborting attack...");
             abortControllerRef.current.abort();
         }
         if (activeSessionId.current && !isCloudMode && db) {
             // Attempt to update status to stopped if we are leaving (local mode only)
             // Fire-and-forget update
             updateDoc(doc(db, 'active_sessions', activeSessionId.current), {
                 status: 'stopped',
                 lastUpdate: new Date()
             }).catch(err => console.error("Failed to update session status on unmount", err));
         }
     };
  }, [isCloudMode]); // specific to mode, though mostly for local

  const getDelay = () => {
    if (speed === 'slow') return 3000;
    if (speed === 'fast') return 800;
    return 1500;
  };

  const addLog = (msg: string) => {
    setConsoleLogs(prev => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`];
      return newLogs.length > 50 ? newLogs.slice(newLogs.length - 50) : newLogs;
    });
  };

  // --- Start Attack ---
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

    if (activeNodes.length === 0) {
        addLog(">> ERROR: NO ACTIVE GATEWAYS FOUND. CONTACT ADMIN.");
        return;
    }

    setIsRunning(true);
    setProgress(0);
    setConsoleLogs([]);
    setStats({ success: 0, fail: 0 });
    statsRef.current = { success: 0, fail: 0 };
    
    addLog(`>> INITIALIZING... TARGET: ${phoneNumber}`);
    addLog(`>> MODE: ${isCloudMode ? 'CLOUD (SERVER-SIDE)' : 'LOCAL (BROWSER)'}`);

    // --- CLOUD MODE LOGIC ---
    if (isCloudMode) {
        if (!db || !currentUser || currentUser.uid.startsWith('guest_')) {
             addLog(">> ERROR: CLOUD MODE REQUIRES LOGIN & DATABASE.");
             setIsRunning(false);
             return;
        }

        try {
            addLog(">> UPLOADING TASK TO SERVER...");
            const docRef = await addDoc(collections.sessions(db), {
                userId: currentUser.uid,
                username: currentUser.username,
                target: phoneNumber,
                amount: count,
                sent: 0,
                failed: 0,
                status: 'queued', // Important: Queued for Admin to pick up
                mode: 'cloud',
                startTime: new Date(),
                lastUpdate: new Date()
            });
            activeSessionId.current = docRef.id;
            addLog(`>> TASK ID: ${docRef.id.slice(0,8)}`);
            addLog(">> SERVER: WAITING FOR WORKER...");
            addLog(">> YOU CAN NOW CLOSE THIS TAB.");

            // Listen to progress updates from the Server (Admin)
            const unsubscribe = onSnapshot(doc(db, 'active_sessions', docRef.id), (docSnap) => {
                const data = docSnap.data();
                if (data) {
                    setStats({ success: data.sent, fail: data.failed });
                    const total = data.sent + data.failed;
                    const pct = Math.min((total / data.amount) * 100, 100);
                    setProgress(pct);
                    
                    if (data.status === 'running' && pct < 100) {
                        // Optional: Visualize heartbeat
                    }
                    if (data.status === 'completed' || data.status === 'stopped') {
                        addLog(`>> SERVER FINISHED: ${data.status.toUpperCase()}`);
                        setIsRunning(false);
                        activeSessionId.current = null;
                        unsubscribe();
                    }
                }
            });
            
            // We do NOT run a loop here. The Admin panel runs it.
            return; 

        } catch (e) {
            addLog(">> UPLOAD FAILED. CHECK CONNECTION.");
            setIsRunning(false);
            return;
        }
    }

    // --- LOCAL MODE LOGIC ---
    let unsubscribe: any = null;
    if (db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
            const docRef = await addDoc(collections.sessions(db), {
                userId: currentUser.uid,
                username: currentUser.username,
                target: phoneNumber,
                amount: count,
                sent: 0,
                failed: 0,
                status: 'running',
                mode: 'local',
                startTime: new Date(),
                lastUpdate: new Date()
            });
            activeSessionId.current = docRef.id;

            unsubscribe = onSnapshot(doc(db, 'active_sessions', docRef.id), (doc) => {
                const data = doc.data();
                if (data && data.status === 'stopped') {
                    if (abortControllerRef.current) handleStop(true);
                }
            });
        } catch (e) { addLog(">> LOCAL MODE: OFFLINE SYNC"); }
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (let i = 0; i < count; i++) {
      if (signal.aborted) break;

      const promises = activeNodes.map(async (api) => {
        try {
          const res = await executeAttackNode(api, phoneNumber, signal);
          if (!signal.aborted) {
              statsRef.current = {
                  success: statsRef.current.success + (res.ok ? 1 : 0),
                  fail: statsRef.current.fail + (res.ok ? 0 : 1)
              };
              setStats({...statsRef.current});
              addLog(`> [${api.name}] ${res.status === 0 ? 'SENT' : res.status} ${res.ok ? 'OK' : 'ERR'}`);
          }
        } catch (e: any) {
           // handled in engine
        }
      });

      await Promise.all(promises);
      
      if ((i % 5 === 0 || i === count - 1) && !signal.aborted && activeSessionId.current) {
           updateSessionInDb();
      }

      if (signal.aborted) break;
      setProgress(((i + 1) / count) * 100);
      if (i < count - 1) await new Promise(r => setTimeout(r, getDelay()));
    }

    if (unsubscribe) unsubscribe();
    await updateSessionInDb(true);
    
    addLog(signal.aborted ? ">> PROCESS ABORTED" : ">> COMPLETE");
    setIsRunning(false);
    activeSessionId.current = null;
    abortControllerRef.current = null;
  };

  const updateSessionInDb = async (final = false) => {
    if (activeSessionId.current && db) {
        try {
            await updateDoc(doc(db, 'active_sessions', activeSessionId.current!), {
                sent: statsRef.current.success,
                failed: statsRef.current.fail,
                lastUpdate: new Date(),
                status: final ? 'completed' : 'running'
            });
        } catch (e) {}
    }
  };

  const handleStop = async (remote = false) => {
    if (isCloudMode && activeSessionId.current && db) {
        // If Cloud Mode, we just tell server to stop
        await updateDoc(doc(db, 'active_sessions', activeSessionId.current), { status: 'stopped' });
        addLog(">> STOP SIGNAL SENT TO SERVER...");
        return;
    }

    // Local Mode Stop
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    addLog(remote ? ">> STOPPED BY ADMIN" : ">> STOP REQUESTED...");
    if (activeSessionId.current && db) {
        updateDoc(doc(db, 'active_sessions', activeSessionId.current), {
            status: remote ? 'stopped' : 'interrupted',
            lastUpdate: new Date()
        }).catch(() => {});
    }
  };

  // Helper variables for JSX cleanliness
  const buttonClass = `w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
    isRunning 
    ? 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border border-red-900/50' 
    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
  }`;

  const buttonContent = isRunning ? (
    <React.Fragment><StopCircle className="w-5 h-5" /> {isCloudMode ? 'Cancel Request' : 'Stop Attack'}</React.Fragment>
  ) : (
    <React.Fragment><Zap className="w-5 h-5 fill-current" /> {isCloudMode ? 'Queue Attack' : 'Start Attack'}</React.Fragment>
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
                <p className="text-[10px] text-zinc-500 font-mono-code">V3.5 / {isCloudMode ? 'CLOUD_ENGINE' : 'LOCAL_ENGINE'}</p>
            </div>
          </div>
          {isRunning && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
                  <CloudLightning className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{isCloudMode ? 'Server Active' : 'Browser Active'}</span>
              </div>
          )}
      </div>

      <div className="space-y-4">
        
        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
           <button 
             disabled={isRunning}
             onClick={() => setIsCloudMode(false)}
             className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${!isCloudMode ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <MonitorSmartphone className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold uppercase">Browser Mode</span>
           </button>
           <button 
             disabled={isRunning}
             onClick={() => setIsCloudMode(true)}
             className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${isCloudMode ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <Server className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold uppercase">Cloud Mode (Offline)</span>
           </button>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Amount</label>
              <input
                disabled={isRunning}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-lg font-mono-code focus:border-red-500 outline-none transition-all text-center"
              />
           </div>
           <div className="space-y-1.5">
               <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Speed</label>
               <div className="flex bg-zinc-900 rounded-lg border border-zinc-800 p-1">
                  {(['slow', 'medium', 'fast'] as const).map(s => (
                    <button
                      key={s}
                      disabled={isRunning}
                      onClick={() => setSpeed(s)}
                      className={`flex-1 py-2 rounded text-[10px] font-bold uppercase transition-all ${
                        speed === s ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
               </div>
           </div>
        </div>

        {/* Info Box */}
        <div className={`p-3 border rounded-lg flex items-start gap-2 text-[10px] ${isCloudMode ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
           {isCloudMode ? <WifiOff className="w-4 h-4 mt-0.5 shrink-0" /> : <Wifi className="w-4 h-4 mt-0.5 shrink-0" />}
           <p className="leading-relaxed">
             {isCloudMode 
                ? <><strong className="font-bold">Offline Capable:</strong> Request will be sent to the server. You can close this tab or turn off internet after starting.</>
                : <><strong className="font-bold">Browser Dependent:</strong> Tab must remain open and internet connected to send requests.</>
             }
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
               <span className="text-emerald-500">OK:{stats.success}</span>
               <span className="text-red-500">ERR:{stats.fail}</span>
            </div>
         </div>
         
         <div 
           ref={scrollRef}
           className="h-40 overflow-y-auto p-4 font-mono-code text-[10px] text-zinc-400 space-y-1 scroll-smooth"
         >
            {consoleLogs.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                  <Server className="w-6 h-6" />
                  <span>Ready to initialize</span>
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