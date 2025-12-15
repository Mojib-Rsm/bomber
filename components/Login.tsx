import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { Lock, Mail, ArrowRight, Loader2, Key, ShieldAlert, HardDrive, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs } from "firebase/firestore"; 
import { db, isFirebaseConfigured } from '../firebase';

interface LoginProps {
  onNavigate: (view: AppView) => void;
  onLoginSuccess: (user: UserProfile, remember: boolean) => void;
  onGuestLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate, onLoginSuccess, onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  
  const isDbReady = isFirebaseConfigured() && !!db;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!db) throw new Error("Database not connected. Please use Guest Mode.");

      // DB LOGIN LOGIC
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("User not found.");

      let foundUser: any = null;
      querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.password === formData.password) foundUser = data;
      });

      if (!foundUser) throw new Error("Invalid password.");

      const safeProfile: UserProfile = {
          uid: foundUser.uid,
          username: foundUser.username,
          email: foundUser.email,
          phone: foundUser.phone,
          role: foundUser.role || 'user',
          createdAt: foundUser.createdAt
      };
      
      onLoginSuccess(safeProfile, rememberMe);
      
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = err.message || "Authentication failed.";
      if (msg.includes("Missing or insufficient permissions")) {
         msg = "Database permission error. Check Firestore rules.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden">
       {/* Background */}
       <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
          
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 mb-4">
                <Lock className="w-6 h-6 text-blue-500" />
             </div>
             <h2 className="text-2xl font-bold font-display tracking-wide text-white">Login</h2>
             <p className="text-zinc-500 text-sm mt-2">Access your NetStrike console.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                  <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="user@netstrike.io"
                  />
                </div>
             </div>

             <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                   <button 
                     type="button" 
                     onClick={() => onNavigate(AppView.FORGOT_PASSWORD)}
                     className="text-[10px] text-blue-500 hover:text-blue-400 font-bold"
                   >
                     Forgot?
                   </button>
                </div>
                <div className="relative">
                   <Key className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                   <input 
                     type="password"
                     required
                     value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                     className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                     placeholder="••••••••"
                   />
                </div>
             </div>

             {/* Remember Me Toggle */}
             <div className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                 <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-zinc-600'}`}>
                    {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                 </div>
                 <span className="text-xs text-zinc-400 select-none">Remember me (Avoid auto-logout)</span>
             </div>

             {/* Error Handling */}
             {!isDbReady && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 font-medium text-center flex flex-col items-center justify-center gap-1">
                   <div className="flex items-center gap-2"><HardDrive className="w-3 h-3" /><span>DB Not Connected</span></div>
                </div>
             )}
             {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium text-center animate-pulse flex flex-col items-center justify-center gap-1">
                   <div className="flex items-center gap-2"><ShieldAlert className="w-3 h-3" /><span>{error}</span></div>
                   {(error.includes("Console") || error.includes("connected")) && (
                       <button type="button" onClick={onGuestLogin} className="mt-1 text-xs underline hover:text-white">Switch to Guest Mode?</button>
                   )}
                </div>
             )}

             <button 
               type="submit"
               disabled={loading || !isDbReady}
               className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access Console <ArrowRight className="w-4 h-4" /></>}
             </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-800/50">
             <button onClick={onGuestLogin} className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all text-xs border border-zinc-700">Continue as Guest</button>
          </div>

          <div className="mt-6 text-center">
             <p className="text-xs text-zinc-500">
                New Operative? <button onClick={() => onNavigate(AppView.REGISTER)} className="text-blue-500 hover:text-blue-400 font-bold underline underline-offset-4">Create Account</button>
             </p>
          </div>
       </div>
    </div>
  );
};

export default Login;