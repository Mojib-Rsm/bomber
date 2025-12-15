import React, { useState } from 'react';
import { AppView } from '../types';
import { Lock, User, Mail, ArrowRight, Loader2, Key, AlertCircle, HardDrive, ShieldAlert } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; 
import { auth, db, isFirebaseConfigured } from '../firebase';

interface AuthProps {
  view: AppView; // LOGIN or REGISTER
  onNavigate: (view: AppView) => void;
  onLoginSuccess: () => void;
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
  
  // Check connection state on mount
  const isDbReady = isFirebaseConfigured() && !!auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!auth) {
        throw new Error("Firebase Auth not initialized. Using local mode.");
      }

      if (view === AppView.REGISTER) {
        // Register Flow
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Create User Profile in Firestore
        // Note: This might fail if Firestore rules block it, but usually Auth succeeds first.
        try {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: formData.username,
                email: formData.email,
                role: 'user', // Default role
                createdAt: serverTimestamp()
            });
            // Update Display Name
            await updateProfile(user, { displayName: formData.username });
        } catch (firestoreErr) {
            console.error("Firestore Profile Creation Error:", firestoreErr);
            // We continue even if Firestore writes fail (User is created in Auth)
        }
        
      } else {
        // Login Flow
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      
      onLoginSuccess();
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed.";
      
      const errString = JSON.stringify(err);
      const errMsg = err.message || '';

      if (errMsg.includes("not initialized")) {
         msg = "Database not connected. Please use Guest Mode.";
      } else if (errMsg.includes("CONFIGURATION_NOT_FOUND") || errString.includes("CONFIGURATION_NOT_FOUND")) {
         msg = "Firebase Email/Password Auth is not enabled in the Console.";
      } else if (err.code === 'auth/operation-not-allowed') {
         msg = "Email/Password provider is disabled in Firebase.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
         msg = "Invalid email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
         msg = "Email is already registered.";
      } else if (err.code === 'auth/weak-password') {
         msg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/network-request-failed') {
         msg = "Network error. Check your connection.";
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
                *Guest data is stored locally and will be lost if cache is cleared.
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