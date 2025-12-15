import React, { useState, useEffect } from 'react';
import { ApiNode, UserProfile } from '../types';
import { ShieldAlert, Server, Activity, Lock, Search, Plus, Trash2, Edit2, X, Save, Database, RotateCcw } from 'lucide-react';
import { INITIAL_API_NODES } from '../apiNodes';

interface AdminProps {
  apiNodes: ApiNode[];
  disabledNodes: string[];
  currentUser: UserProfile | null;
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
  toggleNode, 
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onLogout 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [editingNode, setEditingNode] = useState<ApiNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ApiNode>({
    id: '',
    name: '',
    url: '',
    method: 'POST',
    headers: '{"Content-Type": "application/json"}',
    body: '{}'
  });

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

  const openAddModal = () => {
    setFormData({
      id: '',
      name: '',
      url: '',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{}'
    });
    setIsAdding(true);
    setIsModalOpen(true);
  };

  const openEditModal = (node: ApiNode) => {
    setFormData({ ...node });
    setIsAdding(false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.url) return;
    
    // Validate JSON
    try {
      JSON.parse(formData.headers);
    } catch {
      alert("Invalid JSON in Headers");
      return;
    }

    if (isAdding) {
      onAddNode({ ...formData, id: Date.now().toString() });
    } else {
      onUpdateNode(formData);
    }
    setIsModalOpen(false);
  };

  const handleSeedDatabase = () => {
    if (confirm('This will add default API nodes to the database. Continue?')) {
        INITIAL_API_NODES.forEach(node => {
            // Avoid duplicates by name check roughly, or just add
            if (!apiNodes.some(n => n.name === node.name)) {
                onAddNode({ ...node });
            }
        });
    }
  };

  const activeCount = apiNodes.length - disabledNodes.length;
  const health = apiNodes.length > 0 ? Math.round((activeCount / apiNodes.length) * 100) : 0;

  return (
    <div className="p-5 pb-20 space-y-6 animate-fade-in relative">
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
          <button onClick={onLogout} className="text-zinc-500 hover:text-white">
             <Lock className="w-4 h-4" />
          </button>
       </div>

       {/* System Health */}
       <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-zinc-400">
                   <Activity className="w-4 h-4" />
                   <span className="text-[10px] uppercase font-bold tracking-wider">System Health</span>
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
                   <span className="text-[10px] uppercase font-bold tracking-wider">Active Nodes</span>
                </div>
                <div className="text-2xl font-mono-code font-bold text-white">
                   {activeCount}<span className="text-sm text-zinc-600">/{apiNodes.length}</span>
                </div>
             </div>
          </div>
       </div>

       {/* Gateway Manager */}
       <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Gateway Manager</h3>
             <div className="flex gap-2">
                <button 
                    onClick={handleSeedDatabase}
                    className="flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[10px] font-bold uppercase hover:bg-zinc-700 hover:text-white transition-all"
                    title="Load default nodes if DB is empty"
                >
                    <Database className="w-3 h-3" /> Sync Default
                </button>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all"
                >
                    <Plus className="w-3 h-3" /> Add Node
                </button>
             </div>
          </div>
          
          <div className="relative w-full mb-2">
            <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-600" />
            <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter gateways..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 pl-8 text-xs text-white outline-none focus:border-zinc-700"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
             {apiNodes.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Database is empty</p>
                    <button onClick={handleSeedDatabase} className="mt-2 text-xs text-blue-500 underline">Sync defaults</button>
                </div>
             ) : (
                apiNodes.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase())).map((node) => {
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
                                <button 
                                    onClick={() => openEditModal(node)}
                                    className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={() => { if(confirm('Delete this API?')) onDeleteNode(node.id) }}
                                    className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={() => toggleNode(node.name)}
                                    className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all w-16 ${
                                    isDisabled 
                                    ? 'bg-zinc-800 text-zinc-500 hover:text-emerald-500' 
                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    }`}
                                >
                                    {isDisabled ? 'Enable' : 'Active'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="text-[9px] text-zinc-600 font-mono-code truncate">
                            {node.url}
                        </div>
                    </div>
                    );
                })
             )}
          </div>
       </div>

       {/* Edit/Add Modal */}
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
                     <input 
                       className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none"
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Method</label>
                        <select 
                            className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none"
                            value={formData.method}
                            onChange={e => setFormData({...formData, method: e.target.value})}
                        >
                            <option>POST</option>
                            <option>GET</option>
                            <option>PUT</option>
                        </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Endpoint URL</label>
                        <input 
                            className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-white focus:border-blue-500 outline-none font-mono-code"
                            value={formData.url}
                            onChange={e => setFormData({...formData, url: e.target.value})}
                        />
                    </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase">Headers (JSON)</label>
                     <textarea 
                       className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-green-500 focus:border-blue-500 outline-none font-mono-code h-20"
                       value={formData.headers}
                       onChange={e => setFormData({...formData, headers: e.target.value})}
                     />
                  </div>

                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-zinc-500 uppercase">Body Payload (JSON)</label>
                     <p className="text-[9px] text-zinc-600 mb-1">Use <span className="text-yellow-500">{'{phone}'}</span>, <span className="text-yellow-500">{'{phone_88}'}</span>, or <span className="text-yellow-500">{'{phone_p88}'}</span></p>
                     <textarea 
                       className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-green-500 focus:border-blue-500 outline-none font-mono-code h-32"
                       value={formData.body}
                       onChange={e => setFormData({...formData, body: e.target.value})}
                     />
                  </div>
               </div>

               <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-2"
                  >
                    <Save className="w-3 h-3" /> Save Changes
                  </button>
               </div>
            </div>
         </div>
       )}

    </div>
  );
};

export default Admin;