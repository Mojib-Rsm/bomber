import React, { useState } from 'react';
import { AppView } from '../types';
import { Lock, User, Mail, ArrowRight, Loader2, Key, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; 
import { auth, db } from '../firebase';

interface AuthProps {
  view: AppView; // LOGIN or REGISTER
  onNavigate: (view: AppView) => void;
  onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ view, onNavigate, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!auth) throw new Error("Firebase Auth not initialized. Check configuration.");

      if (view === AppView.REGISTER) {
        // Register Flow
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Create User Profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: formData.username,
          email: formData.email,
          role: 'user', // Default role
          createdAt: serverTimestamp()
        });

        // Update Display Name
        await updateProfile(user, { displayName: formData.username });
        
      } else {
        // Login Flow
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      
      onLoginSuccess();
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
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

             {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium text-center animate-pulse flex items-center justify-center gap-2">
                   <AlertCircle className="w-3 h-3" />
                   {error}
                </div>
             )}

             <button 
               type="submit"
               disabled={loading}
               className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                    {view === AppView.LOGIN ? 'Unlock Console' : 'Initialize Account'}
                    <ArrowRight className="w-4 h-4" />
                    </>
                )}
             </button>
          </form>

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