import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { Lock, User, Mail, ArrowRight, Loader2, Key, AlertCircle, HardDrive, ShieldAlert } from 'lucide-react';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from "firebase/firestore"; 
import { db, isFirebaseConfigured } from '../firebase';

interface AuthProps {
  view: AppView; // LOGIN or REGISTER
  onNavigate: (view: AppView) => void;
  onLoginSuccess: (user: UserProfile) => void;
  onGuestLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ view, onNavigate, onLoginSuccess, onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  // Check connection state
  const isDbReady = isFirebaseConfigured() && !!db;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!db) {
        throw new Error("Database not connected. Please use Guest Mode.");
      }

      if (view === AppView.REGISTER) {
        // DIRECT DATABASE REGISTRATION (No Firebase Auth Provider)
        
        // 1. Check if user already exists
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", formData.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("Email already registered. Please login.");
        }

        // 2. Create new user document
        // We generate a custom ID or let Firestore generate it. Here we let Firestore generate it for simplicity 
        // but to keep 'uid' consistent, we'll generate one manually or use the doc ID.
        // Let's use a timestamp based ID for simplicity in this custom auth.
        const newUid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newUserProfile: any = {
            uid: newUid,
            username: formData.username,
            email: formData.email,
            password: formData.password, // Storing password in DB as requested (Note: Not secure for production)
            role: 'user',
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", newUid), newUserProfile);
        
        // 3. Login immediately
        const safeProfile: UserProfile = {
            uid: newUid,
            username: formData.username,
            email: formData.email,
            role: 'user',
            createdAt: new Date().toISOString() // Approximate for local state
        };
        onLoginSuccess(safeProfile);

      } else {
        // DIRECT DATABASE LOGIN
        const usersRef = collection(db, "users");
        // Query by email
        const q = query(usersRef, where("email", "==", formData.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("User not found.");
        }

        // Check password (client-side check of retrieved doc - insecure but requested 'direct database' method)
        let foundUser: any = null;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.password === formData.password) {
                foundUser = data;
            }
        });

        if (!foundUser) {
            throw new Error("Invalid password.");
        }

        const safeProfile: UserProfile = {
            uid: foundUser.uid,
            username: foundUser.username,
            email: foundUser.email,
            role: foundUser.role || 'user',
            createdAt: foundUser.createdAt
        };
        onLoginSuccess(safeProfile);
      }
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || "Authentication failed.";
      if (msg.includes("Missing or insufficient permissions")) {
         msg = "Database permission error. Ensure Firestore rules are open (test mode).";
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
          
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 mb-4">
                <Lock className="w-6 h-6 text-emerald-500" />
             </div>
             <h2 className="text-2xl font-bold font-display tracking-wide text-white">
                {view === AppView.LOGIN ? 'Welcome Back' : 'Create Account'}
             </h2>
             <p className="text-zinc-500 text-sm mt-2">
                {view === AppView.LOGIN 
                   ? 'Enter your credentials to access the console.' 
                   : 'Register for a new secure NetStrike ID.'}
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             {view === AppView.REGISTER && (
                 <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                      <input 
                          type="text"
                          required
                          value={formData.username}
                          onChange={e => setFormData({...formData, username: e.target.value})}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          placeholder="codename"
                      />
                    </div>
                </div>
             )}

             <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                  <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="secure@netstrike.io"
                  />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                   <Key className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                   <input 
                     type="password"
                     required
                     value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                     className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     placeholder="••••••••"
                   />
                </div>
             </div>

             {/* Connection Error / Auth Error Alert */}
             {!isDbReady && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 font-medium text-center flex flex-col items-center justify-center gap-1">
                   <div className="flex items-center gap-2">
                     <HardDrive className="w-3 h-3" />
                     <span>Database Not Configured</span>
                   </div>
                   <span className="text-[10px] opacity-70">Running in local environment mode.</span>
                </div>
             )}

             {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium text-center animate-pulse flex flex-col items-center justify-center gap-1">
                   <div className="flex items-center gap-2">
                       <ShieldAlert className="w-3 h-3" />
                       <span>{error}</span>
                   </div>
                   {(error.includes("Console") || error.includes("connected")) && (
                       <button 
                           type="button" 
                           onClick={onGuestLogin}
                           className="mt-1 text-xs underline hover:text-white"
                       >
                           Switch to Guest Mode?
                       </button>
                   )}
                </div>
             )}

             <button 
               type="submit"
               disabled={loading || !isDbReady}
               className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                    {view === AppView.LOGIN ? 'Unlock Console' : 'Initialize Account'}
                    <ArrowRight className="w-4 h-4" />
                    </>
                )}
             </button>
          </form>

          {/* Guest Mode Fallback */}
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
             <button 
               onClick={onGuestLogin}
               className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-600"
             >
                Continue as Guest (Local Mode)
             </button>
             <p className="text-[10px] text-zinc-600 text-center mt-2">
                *Guest data is stored locally. Use this if DB is having issues.
             </p>
          </div>

          <div className="mt-6 text-center">
             <p className="text-xs text-zinc-500">
                {view === AppView.LOGIN ? "Don't have access?" : "Already initialized?"}{" "}
                <button 
                  onClick={() => onNavigate(view === AppView.LOGIN ? AppView.REGISTER : AppView.LOGIN)}
                  className="text-emerald-500 hover:text-emerald-400 font-bold underline decoration-emerald-500/30 underline-offset-4"
                >
                   {view === AppView.LOGIN ? 'Create ID' : 'Login'}
                </button>
             </p>
          </div>
       </div>
    </div>
  );
};

export default Auth;