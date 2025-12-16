import React, { useState, useEffect, useRef } from 'react';
import { ApiNode, UserProfile, LogEntry, ActiveSession } from '../types';
import { 
  ShieldAlert, 
  Server, 
  Activity, 
  Lock, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  StopCircle, 
  RefreshCw, 
  Download, 
  Upload, 
  Code, 
  Cpu,
  Settings,
  Mail,
  Globe
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, where, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { executeAttackNode } from '../services/attackEngine';

interface AdminProps {
  apiNodes: ApiNode[];
  disabledNodes: string[];
  currentUser: UserProfile | null;
  logs: LogEntry[];
  toggleNode: (name: string) => void;
  onUpdateNode: (node: ApiNode) => void;
  onAddNode: (node: ApiNode) => void;
  onDeleteNode: (id: string) => void;
  onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ 
  apiNodes, 
  disabledNodes, 
  currentUser,
  logs,
  toggleNode, 
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'gateways' | 'users' | 'logs' | 'engine' | 'settings'>('live');
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Live Sessions State
  const [liveSessions, setLiveSessions] = useState<ActiveSession[]>([]);

  // Server Engine State
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [engineLogs, setEngineLogs] = useState<string[]>([]);
  const engineAbortController = useRef<AbortController | null>(null);

  // Settings State
  const [globalSettings, setGlobalSettings] = useState({ proxyUrl: 'https://corsproxy.io/?' });
  const [smsConfig, setSmsConfig] = useState({ apiKey: '', apiUrl: '' });
  const [emailConfig, setEmailConfig] = useState({ 
      apiUrl: '', 
      smtpHost: '', 
      smtpPort: '587', 
      smtpUser: '', 
      smtpPass: '', 
      fromEmail: '' 
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // API Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [viewingJsonNode, setViewingJsonNode] = useState<ApiNode | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<ApiNode>({
    id: '', name: '', url: '', method: 'POST', headers: '{"Content-Type": "application/json"}', body: '{}'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // FETCH USERS EFFECT
  useEffect(() => {
    if (activeTab === 'users' && db) {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const snapshot = await getDocs(collection(db, 'users'));
                const fetchedUsers = snapshot.docs.map(d => ({...d.data(), id: d.id}));
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
            setLoadingUsers(false);
        };
        fetchUsers();
    }
  }, [activeTab]);

  // FETCH LIVE SESSIONS EFFECT
  useEffect(() => {
      if ((activeTab === 'live' || activeTab === 'engine') && db) {
          const q = query(collection(db, 'active_sessions'), orderBy('lastUpdate', 'desc'));
          const unsubscribe = onSnapshot(q, (snapshot) => {
              const sessions = snapshot.docs.map(d => ({id: d.id, ...d.data()} as ActiveSession));
              setLiveSessions(sessions.filter(s => {
                  if (s.status === 'running' || s.status === 'queued') return true;
                  const age = new Date().getTime() - (s.lastUpdate?.toDate ? s.lastUpdate.toDate().getTime() : new Date(s.lastUpdate).getTime());
                  return age < 300000;
              }));
          });
          return () => unsubscribe();
      }
  }, [activeTab]);

  // FETCH SYSTEM CONFIGS
  useEffect(() => {
    if ((activeTab === 'settings' || activeTab === 'engine') && db) {
        const fetchConfigs = async () => {
            try {
                // Fetch Global Settings (Proxy)
                const settingsDoc = await getDoc(doc(db, "system_config", "settings"));
                if (settingsDoc.exists()) setGlobalSettings(settingsDoc.data() as any);

                // Fetch SMS Config
                const smsDoc = await getDoc(doc(db, "system_config", "sms"));
                if (smsDoc.exists()) setSmsConfig(smsDoc.data() as any);

                // Fetch Email Config
                const emailDoc = await getDoc(doc(db, "system_config", "email"));
                if (emailDoc.exists()) setEmailConfig(emailDoc.data() as any);
            } catch (e) {
                console.error("Error fetching configs", e);
            }
        };
        fetchConfigs();
    }
  }, [activeTab]);

  // SERVER ENGINE LOGIC
  useEffect(() => {
     if (engineEnabled && db) {
        const addEngineLog = (msg: string) => setEngineLogs(p => [...p.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
        addEngineLog("Engine started. Polling for queued jobs...");

        const q = query(collection(db, 'active_sessions'), where('status', '==', 'queued'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const session = { id: change.doc.id, ...change.doc.data() } as ActiveSession;
                    addEngineLog(`Job Found: ${session.target} (${session.amount})`);
                    // Ensure we use the latest global settings
                    await processSession(session, addEngineLog);
                }
            });
        });

        return () => {
            unsubscribe();
            addEngineLog("Engine stopped.");
            if (engineAbortController.current) engineAbortController.current.abort();
        };
     }
  }, [engineEnabled]);

  const processSession = async (session: ActiveSession, logger: (m: string) => void) => {
      if (!db) return;
      
      await updateDoc(doc(db, 'active_sessions', session.id), { status: 'running', lastUpdate: new Date() });
      logger(`Starting attack on ${session.target}...`);

      const controller = new AbortController();
      engineAbortController.current = controller;
      
      let sent = 0;
      let failed = 0;

      const activeApiNodes = apiNodes.filter(n => !disabledNodes.includes(n.name));
      if (activeApiNodes.length === 0) {
          logger("Error: No active gateways available.");
          await updateDoc(doc(db, 'active_sessions', session.id), { status: 'stopped', lastUpdate: new Date() });
          return;
      }

      for (let i = 0; i < session.amount; i++) {
          if (controller.signal.aborted) break;

          const promises = activeApiNodes.map(async (node) => {
              try {
                  // Pass the configured Proxy URL from settings to the execution engine
                  const res = await executeAttackNode(node, session.target, controller.signal, globalSettings.proxyUrl);
                  if (res.ok) sent++; else failed++;
              } catch (e) { failed++; }
          });

          await Promise.all(promises);

          if (i % 5 === 0 || i === session.amount - 1) {
             await updateDoc(doc(db, 'active_sessions', session.id), { sent, failed, lastUpdate: new Date() });
          }
          
          await new Promise(r => setTimeout(r, 1000));
      }

      await updateDoc(doc(db, 'active_sessions', session.id), { status: 'completed', sent, failed, lastUpdate: new Date() });
      logger(`Job ${session.id.slice(0,6)} completed.`);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-5 animate-fade-in">
        <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl w-full max-w-sm relative overflow-hidden text-center">
           <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
           <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold text-white mb-2 tracking-wider">ACCESS DENIED</h2>
           <p className="text-xs text-zinc-500 font-mono-code mb-6">You do not have administrative privileges.</p>
           <button onClick={onLogout} className="text-red-500 text-xs font-bold hover:underline">Return to Profile</button>
        </div>
      </div>
    );
  }

  // API HANDLERS
  const openAddModal = () => {
    setFormData({ id: '', name: '', url: '', method: 'POST', headers: '{"Content-Type": "application/json"}', body: '{}' });
    setIsAdding(true);
    setIsModalOpen(true);
  };

  const openEditModal = (node: ApiNode) => {
    setFormData({ ...node });
    setIsAdding(false);
    setIsModalOpen(true);
  };

  const openJsonModal = (node: ApiNode) => {
    setViewingJsonNode(node);
    setIsJsonModalOpen(true);
  };

  const handleSaveNode = () => {
    if (!formData.name || !formData.url) return;
    try { JSON.parse(formData.headers); } catch { alert("Invalid JSON in Headers"); return; }
    if (isAdding) onAddNode({ ...formData, id: Date.now().toString() });
    else onUpdateNode(formData);
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(apiNodes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `netstrike_gateways_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (Array.isArray(json)) {
                if (confirm(`Import ${json.length} gateways? This will add them to the database.`)) {
                    json.forEach((node: any) => {
                        if (node.name && node.url) {
                            onAddNode({
                                ...node,
                                id: node.id || Date.now().toString() + Math.random()
                            });
                        }
                    });
                }
            } else {
                alert("Invalid JSON format. Expected an array of nodes.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to parse JSON file.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStopSession = async (sessionId: string) => {
      if (db) {
          await updateDoc(doc(db, 'active_sessions', sessionId), {
              status: 'stopped',
              lastUpdate: new Date()
          });
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (!confirm("Permanently delete this user?")) return;
      if (!db) return;
      try {
          await deleteDoc(doc(db, 'users', userId));
          setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (e) {
          console.error("Delete failed", e);
      }
  };

  const handleSaveConfig = async () => {
    if (!db) return;
    setSavingConfig(true);
    try {
        // Save Global Settings (Proxy)
        await setDoc(doc(db, "system_config", "settings"), globalSettings);
        // Save SMS Config
        await setDoc(doc(db, "system_config", "sms"), smsConfig);
        // Save Email Config
        await setDoc(doc(db, "system_config", "email"), emailConfig);
        alert("System Configuration Saved!");
    } catch(e) {
        console.error(e);
        alert("Failed to save config.");
    } finally {
        setSavingConfig(false);
    }
  };

  const activeCount = apiNodes.length - disabledNodes.length;
  const health = apiNodes.length > 0 ? Math.round((activeCount / apiNodes.length) * 100) : 0;

  return (
    <div className="p-5 pb-20 space-y-6 animate-fade-in relative min-h-screen">
       <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500/10 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-500" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white leading-none">Admin Console</h2>
                <span className="text-[10px] text-zinc-500 font-mono-code">ROOT_ACCESS_GRANTED</span>
             </div>
          </div>
          <button onClick={onLogout} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase">
             <Lock className="w-3 h-3" /> Exit
          </button>
       </div>

       <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800 overflow-x-auto">
           {(['live', 'engine', 'gateways', 'users', 'logs', 'settings'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                 className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all min-w-[80px] ${
                     activeTab === tab ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                 }`}
               >
                   {tab === 'live' && <Activity className="w-3 h-3 text-red-500" />}
                   {tab === 'engine' && <Cpu className="w-3 h-3 text-blue-500" />}
                   {tab === 'gateways' && <Server className="w-3 h-3" />}
                   {tab === 'users' && <Users className="w-3 h-3" />}
                   {tab === 'logs' && <FileText className="w-3 h-3" />}
                   {tab === 'settings' && <Settings className="w-3 h-3" />}
                   {tab}
               </button>
           ))}
       </div>

       {/* Tab Content Rendering... */}
       {activeTab === 'live' && (
           <div className="space-y-4 animate-fade-in">
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                      <h3 className="text-xs font-bold text-red-400 uppercase">Active Attacks</h3>
                      <p className="text-2xl font-mono-code text-white">{liveSessions.filter(s => s.status === 'running').length}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase">Total Load</h3>
                      <p className="text-2xl font-mono-code text-white">{liveSessions.filter(s => s.status === 'running').reduce((acc, curr) => acc + (curr.amount || 0), 0)}</p>
                  </div>
               </div>
               
               {/* Session List Component (Inline for brevity) */}
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                   <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                       <span className="text-xs font-bold text-zinc-400">SESSION MONITOR</span>
                       <RefreshCw className="w-3 h-3 text-zinc-600 animate-spin" style={{animationDuration: '3s'}} />
                   </div>
                   {liveSessions.length === 0 ? (
                       <div className="p-8 text-center text-xs text-zinc-600">No active operations detected.</div>
                   ) : (
                       <div className="divide-y divide-zinc-800">
                           {liveSessions.map(session => (
                               <div key={session.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30">
                                   <div className="flex items-center gap-3">
                                       <div className={`w-2 h-2 rounded-full ${session.status === 'running' ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                                       <div>
                                           <div className="flex items-center gap-2">
                                               <span className="font-bold text-white text-sm">{session.target}</span>
                                               <span className="text-[9px] px-1.5 rounded bg-zinc-800 text-zinc-400 font-mono-code">{session.username}</span>
                                           </div>
                                            <div className="w-24 h-1 bg-zinc-800 mt-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500" style={{ width: `${Math.min(((session.sent + session.failed) / session.amount) * 100, 100)}%` }}></div>
                                            </div>
                                       </div>
                                   </div>
                                   {session.status === 'running' && (
                                       <button onClick={() => handleStopSession(session.id)} className="p-2 text-red-500 hover:text-white transition-all"><StopCircle className="w-5 h-5" /></button>
                                   )}
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           </div>
       )}

       {activeTab === 'engine' && (
           <div className="space-y-4 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-center space-y-4">
                 <div className="mx-auto w-16 h-16 bg-zinc-950 rounded-full border border-zinc-800 flex items-center justify-center">
                    <Cpu className={`w-8 h-8 transition-colors ${engineEnabled ? 'text-emerald-500 animate-pulse' : 'text-zinc-600'}`} />
                 </div>
                 <h3 className="text-xl font-bold text-white">Cloud Execution Engine</h3>
                 <button onClick={() => setEngineEnabled(!engineEnabled)} className={`px-8 py-3 rounded-xl font-bold uppercase text-sm ${engineEnabled ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {engineEnabled ? 'Engine Online' : 'Start Engine'}
                 </button>
              </div>
              <div className="bg-black border border-zinc-800 rounded-xl p-4 font-mono-code text-xs text-zinc-400 h-64 overflow-y-auto space-y-1">
                 {engineLogs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
           </div>
       )}

       {activeTab === 'gateways' && (
         <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                    <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-600" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search gateways..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 pl-8 text-xs text-white outline-none" />
                </div>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    <button onClick={handleImportClick} className="p-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded"><Upload className="w-4 h-4" /></button>
                    <button onClick={handleExport} className="p-2 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded"><Download className="w-4 h-4" /></button>
                    <button onClick={openAddModal} className="p-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded"><Plus className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
                {apiNodes.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase())).map((node) => {
                    const isDisabled = disabledNodes.includes(node.name);
                    return (
                    <div key={node.id} className="p-3 flex justify-between group hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <span className="text-sm font-bold text-zinc-200">{node.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openEditModal(node)} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700"><Edit2 className="w-3 h-3 text-zinc-500" /></button>
                            <button onClick={() => { if(confirm('Delete?')) onDeleteNode(node.id) }} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700"><Trash2 className="w-3 h-3 text-zinc-500" /></button>
                        </div>
                    </div>
                    );
                })}
            </div>
         </div>
       )}

       {activeTab === 'users' && (
           <div className="space-y-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-zinc-950 text-[10px] uppercase text-zinc-500 font-bold border-b border-zinc-800"><th className="p-3">User</th><th className="p-3">Action</th></tr></thead>
                        <tbody className="text-xs divide-y divide-zinc-800">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-zinc-800/30">
                                    <td className="p-3">
                                        <div className="font-bold text-white">{user.username}</div>
                                        <div className="text-[10px] text-zinc-500">{user.email}</div>
                                    </td>
                                    <td className="p-3"><button onClick={() => handleDeleteUser(user.id)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
           </div>
       )}

       {activeTab === 'logs' && (
           <div className="space-y-4 animate-fade-in">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <tbody className="text-xs divide-y divide-zinc-800">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-zinc-800/30">
                                    <td className="p-3">{log.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-white">{log.contactPhone}</div>
                                        <div className="text-[10px] text-zinc-500">{log.message}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               </div>
           </div>
       )}
       
       {activeTab === 'settings' && (
           <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">System Configuration</h3>
                            <p className="text-xs text-zinc-500">Manage critical API credentials securely.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                         {/* Global / Proxy Section */}
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Network / Proxy Settings
                            </h4>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Proxy Gateway URL</label>
                                <p className="text-[9px] text-zinc-600">
                                    Define the CORS proxy used to route traffic. Defaults to <code>https://corsproxy.io/?</code> if empty.
                                </p>
                                <input 
                                    type="text" 
                                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" 
                                    value={globalSettings.proxyUrl} 
                                    onChange={e => setGlobalSettings({...globalSettings, proxyUrl: e.target.value})} 
                                    placeholder="https://corsproxy.io/?"
                                />
                            </div>
                         </div>

                         {/* SMS Section */}
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1">SMS Configuration</h4>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">SMS API Key</label>
                                <input type="text" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={smsConfig.apiKey} onChange={e => setSmsConfig({...smsConfig, apiKey: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">SMS API Endpoint URL</label>
                                <input type="text" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={smsConfig.apiUrl} onChange={e => setSmsConfig({...smsConfig, apiUrl: e.target.value})} />
                            </div>
                         </div>

                         {/* Email Section */}
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                <Mail className="w-3 h-3" /> Email / SMTP Configuration
                            </h4>
                            <p className="text-[10px] text-zinc-500">
                                Configure the API Endpoint that handles SMTP logic. Browser cannot send SMTP directly.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Email Sending API Endpoint</label>
                                    <input type="text" placeholder="https://api.yoursite.com/send-email" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.apiUrl} onChange={e => setEmailConfig({...emailConfig, apiUrl: e.target.value})} />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP Host</label>
                                    <input type="text" placeholder="smtp.gmail.com" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.smtpHost} onChange={e => setEmailConfig({...emailConfig, smtpHost: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP Port</label>
                                    <input type="text" placeholder="587" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.smtpPort} onChange={e => setEmailConfig({...emailConfig, smtpPort: e.target.value})} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP User / Email</label>
                                    <input type="text" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.smtpUser} onChange={e => setEmailConfig({...emailConfig, smtpUser: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP Password</label>
                                    <input type="password" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.smtpPass} onChange={e => setEmailConfig({...emailConfig, smtpPass: e.target.value})} />
                                </div>
                                
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">From Email (Optional)</label>
                                    <input type="text" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={emailConfig.fromEmail} onChange={e => setEmailConfig({...emailConfig, fromEmail: e.target.value})} />
                                </div>
                            </div>
                         </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={handleSaveConfig}
                            disabled={savingConfig || !db}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {savingConfig ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save All Configurations
                        </button>
                    </div>

                    {!db && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-center text-xs text-red-500">Database connection required to save settings.</div>}
                </div>
           </div>
       )}

       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#09090b] border border-zinc-700 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl">
               {/* Modal Content... Same as previous */}
               <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAdding ? 'New API Node' : 'Edit API Node'}</h3>
                  <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
               </div>
               
               <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase">Name</label>
                     <input className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Method</label>
                        <select className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none" value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})} >
                            <option>POST</option><option>GET</option><option>PUT</option>
                        </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Endpoint URL</label>
                        <input className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none font-mono-code" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase">Headers (JSON)</label>
                     <textarea className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-green-500 focus:border-blue-500 outline-none font-mono-code h-20" value={formData.headers} onChange={e => setFormData({...formData, headers: e.target.value})} />
                  </div>

                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase">Body Payload (JSON)</label>
                     <p className="text-[9px] text-zinc-600 mb-1">Use <span className="text-yellow-500">{'{phone}'}</span> placeholders</p>
                     <textarea className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-green-500 focus:border-blue-500 outline-none font-mono-code h-32" value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} />
                  </div>
               </div>

               <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white">Cancel</button>
                  <button onClick={handleSaveNode} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-2"><Save className="w-3 h-3" /> Save Changes</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default Admin;