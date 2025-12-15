import React, { useState, useEffect } from 'react';
import { ApiNode, UserProfile, LogEntry } from '../types';
import { ShieldAlert, Server, Activity, Lock, Search, Plus, Trash2, Edit2, X, Save, Database, Users, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { INITIAL_API_NODES } from '../apiNodes';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [activeTab, setActiveTab] = useState<'gateways' | 'users' | 'logs'>('gateways');
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // API Modal State
  const [editingNode, setEditingNode] = useState<ApiNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<ApiNode>({
    id: '', name: '', url: '', method: 'POST', headers: '{"Content-Type": "application/json"}', body: '{}'
  });

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

  const handleSaveNode = () => {
    if (!formData.name || !formData.url) return;
    try { JSON.parse(formData.headers); } catch { alert("Invalid JSON in Headers"); return; }
    if (isAdding) onAddNode({ ...formData, id: Date.now().toString() });
    else onUpdateNode(formData);
    setIsModalOpen(false);
  };

  const handleSeedDatabase = () => {
    if (confirm('This will add default API nodes to the database. Continue?')) {
        INITIAL_API_NODES.forEach(node => {
            if (!apiNodes.some(n => n.name === node.name)) onAddNode({ ...node });
        });
    }
  };

  // USER HANDLERS
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

  const activeCount = apiNodes.length - disabledNodes.length;
  const health = apiNodes.length > 0 ? Math.round((activeCount / apiNodes.length) * 100) : 0;

  return (
    <div className="p-5 pb-20 space-y-6 animate-fade-in relative min-h-screen">
       {/* Header */}
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

       {/* TABS */}
       <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
           {(['gateways', 'users', 'logs'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                 className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                     activeTab === tab ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                 }`}
               >
                   {tab === 'gateways' && <Server className="w-3 h-3" />}
                   {tab === 'users' && <Users className="w-3 h-3" />}
                   {tab === 'logs' && <FileText className="w-3 h-3" />}
                   {tab}
               </button>
           ))}
       </div>

       {/* --- GATEWAYS TAB --- */}
       {activeTab === 'gateways' && (
         <div className="space-y-4 animate-fade-in">
             {/* System Health Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-zinc-400">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Health</span>
                        </div>
                        <div className="text-2xl font-mono-code font-bold text-white">{health}%</div>
                        <div className="w-full h-1 bg-zinc-800 mt-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${health > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${health}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-zinc-400">
                        <Server className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Nodes</span>
                        </div>
                        <div className="text-2xl font-mono-code font-bold text-white">
                        {activeCount}<span className="text-sm text-zinc-600">/{apiNodes.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                    <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-600" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search gateways..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 pl-8 text-xs text-white outline-none focus:border-zinc-700"
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSeedDatabase} className="p-2 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded hover:text-white" title="Sync Default">
                        <Database className="w-4 h-4" />
                    </button>
                    <button onClick={openAddModal} className="p-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded hover:bg-blue-600 hover:text-white">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
                {apiNodes.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase())).map((node) => {
                    const isDisabled = disabledNodes.includes(node.name);
                    return (
                    <div key={node.id} className="p-3 flex flex-col gap-3 group hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-200">{node.name}</span>
                                    <span className="text-[9px] text-zinc-600 font-mono-code">{node.method}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(node)} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => { if(confirm('Delete this API?')) onDeleteNode(node.id) }} className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded hover:bg-red-900/20"><Trash2 className="w-3 h-3" /></button>
                                <button onClick={() => toggleNode(node.name)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase w-16 ${isDisabled ? 'bg-zinc-800 text-zinc-500 hover:text-emerald-500' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>{isDisabled ? 'Enable' : 'Active'}</button>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
         </div>
       )}

       {/* --- USERS TAB --- */}
       {activeTab === 'users' && (
           <div className="space-y-4 animate-fade-in">
               <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-600" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search users..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 pl-8 text-xs text-white outline-none focus:border-zinc-700"
                    />
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-950 text-[10px] uppercase text-zinc-500 font-bold border-b border-zinc-800">
                                <th className="p-3">User</th>
                                <th className="p-3">Role</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-zinc-800">
                            {loadingUsers ? (
                                <tr><td colSpan={3} className="p-4 text-center text-zinc-500">Loading...</td></tr>
                            ) : users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                                <tr key={user.id} className="hover:bg-zinc-800/30">
                                    <td className="p-3">
                                        <div className="font-bold text-white">{user.username}</div>
                                        <div className="text-[10px] text-zinc-500">{user.email}</div>
                                        {/* Display password insecurely as requested for full admin view of DB auth */}
                                        <div className="text-[9px] text-zinc-700 font-mono-code mt-1 select-all">Pass: {user.password}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${user.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {user.role !== 'admin' && (
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loadingUsers && users.length === 0 && <div className="p-4 text-center text-xs text-zinc-500">No users found.</div>}
                </div>
           </div>
       )}

       {/* --- LOGS TAB --- */}
       {activeTab === 'logs' && (
           <div className="space-y-4 animate-fade-in">
               <div className="flex items-center justify-between">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Global Activity Stream</h3>
                   <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500">{logs.length} events</span>
               </div>

               <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <tbody className="text-xs divide-y divide-zinc-800">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-zinc-800/30">
                                    <td className="p-3 w-8">
                                        {log.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white font-mono-code">{log.contactPhone}</span>
                                            <span className="text-[9px] text-zinc-500 bg-zinc-950 px-1 rounded border border-zinc-800">{log.username || 'Unknown'}</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 mt-1 truncate max-w-[200px] opacity-70">
                                            {log.message}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length === 0 && <div className="p-8 text-center text-xs text-zinc-500">No logs recorded.</div>}
               </div>
           </div>
       )}

       {/* Edit/Add Modal (Gateways) */}
       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#09090b] border border-zinc-700 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl">
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
                     <p className="text-[9px] text-zinc-600 mb-1">Use <span className="text-yellow-500">{'{phone}'}</span>, <span className="text-yellow-500">{'{phone_88}'}</span>, or <span className="text-yellow-500">{'{phone_p88}'}</span></p>
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