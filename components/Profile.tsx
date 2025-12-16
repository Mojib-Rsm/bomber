import React, { useState } from 'react';
import { LogEntry, Contact, AppView, UserProfile } from '../types';
import { User, Trash2, Activity, Zap, Send, MessageCircle, ShieldAlert, Edit2, Save, X, Phone, Lock } from 'lucide-react';
import { doc, updateDoc } from "firebase/firestore"; 
import { db } from '../firebase';

interface ProfileProps {
  logs: LogEntry[];
  contacts: Contact[];
  currentUser?: UserProfile | null;
  onClearLogs: () => void;
  onClearContacts: () => void;
  onNavigate: (view: AppView) => void;
  onUpdateProfile: (user: UserProfile) => void;
}

const Profile: React.FC<ProfileProps> = ({ logs, currentUser, onClearLogs, onNavigate, onUpdateProfile }) => {
  const totalAttacks = logs.length;
  const successful = logs.filter(l => l.status === 'sent').length;
  const rate = totalAttacks > 0 ? Math.round((successful / totalAttacks) * 100) : 0;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      username: currentUser?.username || '',
      phone: currentUser?.phone || '',
      password: '' // Optional password update
  });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
      if (!currentUser || !db) return;
      setSaving(true);
      try {
          const updates: any = {};
          if (editForm.username) updates.username = editForm.username;
          if (editForm.phone) updates.phone = editForm.phone;
          if (editForm.password) updates.password = editForm.password;

          await updateDoc(doc(db, "users", currentUser.uid), updates);
          
          // Update local state
          const updatedUser: UserProfile = {
              ...currentUser,
              username: editForm.username || currentUser.username,
              phone: editForm.phone || currentUser.phone
          };
          onUpdateProfile(updatedUser);
          setIsEditing(false);
      } catch (error) {
          console.error("Error updating profile:", error);
          alert("Failed to update profile.");
      } finally {
          setSaving(false);
      }
  };

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
       <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center relative">
                    <User className="w-8 h-8 text-zinc-400" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-zinc-800">
                        <div className={`w-2.5 h-2.5 rounded-full ${currentUser?.role === 'admin' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    </div>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{currentUser?.username || 'User'}</h2>
                    <span className="text-xs text-zinc-500 font-mono-code uppercase">{currentUser?.role || 'Operative'} ID: {currentUser?.uid?.slice(-6) || 'N/A'}</span>
                    {currentUser?.phone && <div className="text-[10px] text-zinc-600 mt-0.5">{currentUser.phone}</div>}
                </div>
            </div>
            
            <div className="flex gap-2">
                {currentUser?.role === 'admin' && (
                    <button 
                        onClick={() => onNavigate(AppView.ADMIN)}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Admin Console"
                    >
                        <ShieldAlert className="w-5 h-5" />
                    </button>
                )}
                <button 
                    onClick={() => {
                        setEditForm({
                            username: currentUser?.username || '',
                            phone: currentUser?.phone || '',
                            password: ''
                        });
                        setIsEditing(true);
                    }}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-all"
                    title="Edit Profile"
                >
                    <Edit2 className="w-5 h-5" />
                </button>
            </div>
       </div>

       {/* Edit Modal */}
       {isEditing && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-[#09090b] border border-zinc-800 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl">
                   <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
                   </div>
                   <div className="p-5 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1"><User className="w-3 h-3" /> Username</label>
                            <input 
                                className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" 
                                value={editForm.username}
                                onChange={e => setEditForm({...editForm, username: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
                            <input 
                                className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-sm text-white focus:border-emerald-500 outline-none font-mono-code" 
                                value={editForm.phone}
                                onChange={e => setEditForm({...editForm, phone: e.target.value.replace(/[^0-9+]/g, '')})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Lock className="w-3 h-3" /> New Password (Optional)</label>
                            <input 
                                type="password"
                                className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" 
                                placeholder="Leave blank to keep current"
                                value={editForm.password}
                                onChange={e => setEditForm({...editForm, password: e.target.value})}
                            />
                        </div>
                   </div>
                   <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white">Cancel</button>
                        <button 
                            onClick={handleSaveProfile} 
                            disabled={saving}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Save className="w-3 h-3" /> Save Changes</>}
                        </button>
                   </div>
               </div>
           </div>
       )}

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
              href="https://t.me/MrTools_BD" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#229ED9]/10 border border-[#229ED9]/20 rounded-xl hover:bg-[#229ED9]/20 transition-all group"
            >
               <Send className="w-6 h-6 text-[#229ED9] group-hover:scale-110 transition-transform" />
               <span className="text-xs font-bold text-[#229ED9]">Telegram</span>
            </a>
            
            <a 
              href="https://whatsapp.com/channel/0029Vb77qq6IHphOTYqmif38" 
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
          <p className="text-[10px] text-zinc-600 font-mono-code">OFT Tools v1.0 // TACTICAL BUILD</p>
       </div>
    </div>
  );
};

export default Profile;