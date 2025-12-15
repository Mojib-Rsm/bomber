import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { UserPlus, User, Mail, ArrowRight, Loader2, Key, ShieldAlert, HardDrive } from 'lucide-react';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"; 
import { db, isFirebaseConfigured } from '../firebase';

interface RegisterProps {
  onNavigate: (view: AppView) => void;
  onLoginSuccess: (user: UserProfile, remember: boolean) => void;
  onGuestLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate, onLoginSuccess, onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  
  const isDbReady = isFirebaseConfigured() && !!db;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!db) throw new Error("Database not connected. Please use Guest Mode.");

      // Check if user exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) throw new Error("Email already registered. Please login.");

      const newUid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const isAdmin = formData.email.toLowerCase().startsWith('admin');

      const newUserProfile: any = {
          uid: newUid,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: isAdmin ? 'admin' : 'user',
          createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", newUid), newUserProfile);
      
      const safeProfile: UserProfile = {
          uid: newUid,
          username: formData.username,
          email: formData.email,
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString()
      };
      // Auto login after register, default remember = true
      onLoginSuccess(safeProfile, true);
      
    } catch (err: any) {
      console.error("Register Error:", err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden">
       {/* Background */}
       <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
          
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 mb-4">
                <UserPlus className="w-6 h-6 text-emerald-500" />
             </div>
             <h2 className="text-2xl font-bold font-display tracking-wide text-white">Register</h2>
             <p className="text-zinc-500 text-sm mt-2">Join the NetStrike Network.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                  <input 
                      type="text" required value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Codename"
                  />
                </div>
            </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                  <input 
                      type="email" required value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="admin@netstrike.local (for admin)"
                  />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                   <Key className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                   <input 
                     type="password" required value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                     className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                     placeholder="••••••••"
                   />
                </div>
             </div>

             {!isDbReady && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 font-medium text-center flex items-center justify-center gap-2">
                   <HardDrive className="w-3 h-3" /><span>DB Not Connected</span>
                </div>
             )}
             {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium text-center flex items-center justify-center gap-2">
                   <ShieldAlert className="w-3 h-3" /><span>{error}</span>
                </div>
             )}

             <button 
               type="submit" disabled={loading || !isDbReady}
               className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create ID <ArrowRight className="w-4 h-4" /></>}
             </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-800/50">
             <button onClick={onGuestLogin} className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all text-xs border border-zinc-700">Continue as Guest</button>
          </div>

          <div className="mt-6 text-center">
             <p className="text-xs text-zinc-500">
                Already have ID? <button onClick={() => onNavigate(AppView.LOGIN)} className="text-emerald-500 hover:text-emerald-400 font-bold underline underline-offset-4">Login Here</button>
             </p>
          </div>
       </div>
    </div>
  );
};

export default Register;