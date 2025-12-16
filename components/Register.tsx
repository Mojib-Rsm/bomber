import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from '../types';
import { UserPlus, User, Mail, ArrowRight, Loader2, Key, ShieldAlert, HardDrive, Phone, MessageSquare, RefreshCw, Timer } from 'lucide-react';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"; 
import { db, isFirebaseConfigured } from '../firebase';
import { sendSmsOtp, generateOtp } from '../services/notificationService';

interface RegisterProps {
  onNavigate: (view: AppView) => void;
  onLoginSuccess: (user: UserProfile, remember: boolean) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', phone: '' });
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');
  
  // Timer State
  const [timer, setTimer] = useState(0);
  
  const isDbReady = isFirebaseConfigured() && !!db;

  // Countdown Logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!db) throw new Error("Database not connected.");

      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", formData.email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) throw new Error("Email already registered. Please login.");

      const phoneQuery = query(usersRef, where("phone", "==", formData.phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) throw new Error("Phone number already registered.");

      const code = generateOtp();
      setGeneratedOtp(code);
      
      const success = await sendSmsOtp(formData.phone, code);
      
      if (!success) {
          // In production, you might want to show a generic error, but for dev we alert
          console.error("SMS Failed. Check Admin Config.");
          throw new Error("Failed to send SMS. Contact Admin.");
      }
      
      setStep('otp');
      setTimer(40); // Start 40s cooldown

    } catch (err: any) {
      console.error("Register Error:", err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
      if (timer > 0) return;
      
      setError('');
      setLoading(true);
      try {
          // Generate NEW Unique Token
          const newCode = generateOtp();
          setGeneratedOtp(newCode);

          const success = await sendSmsOtp(formData.phone, newCode);

          if (success) {
              alert(`OTP Resent to ${formData.phone}`);
          } else {
              throw new Error("Resend failed.");
          }
          
          setTimer(40); // Reset Cooldown
      } catch (err: any) {
          setError("Failed to resend OTP");
      } finally {
          setLoading(false);
      }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          if (otpInput !== generatedOtp) {
              throw new Error("Invalid OTP Code.");
          }

          const newUid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const isAdmin = formData.email.toLowerCase().startsWith('admin');

          const newUserProfile: any = {
              uid: newUid,
              username: formData.username,
              email: formData.email,
              phone: formData.phone,
              password: formData.password,
              role: isAdmin ? 'admin' : 'user',
              createdAt: serverTimestamp()
          };

          if (db) {
            await setDoc(doc(db, "users", newUid), newUserProfile);
          }
          
          const safeProfile: UserProfile = {
              uid: newUid,
              username: formData.username,
              email: formData.email,
              phone: formData.phone,
              role: isAdmin ? 'admin' : 'user',
              createdAt: new Date().toISOString()
          };
          
          onLoginSuccess(safeProfile, true);

      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
          
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 mb-4">
                <UserPlus className="w-6 h-6 text-emerald-500" />
             </div>
             <h2 className="text-2xl font-bold font-display tracking-wide text-white">Register</h2>
             <p className="text-zinc-500 text-sm mt-2">Join OFT Tools.</p>
          </div>

          {step === 'details' ? (
              <form onSubmit={handleInitiateRegister} className="space-y-4">
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
                        placeholder="admin@oft.local"
                    />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Phone Number (Required)</label>
                    <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                    <input 
                        type="text" required value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value.replace(/[^0-9+]/g, '')})}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="+88017XXXXXXXX"
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
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Create ID <ArrowRight className="w-4 h-4" /></>}
                </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4 animate-fade-in">
                <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                   <p className="text-xs text-emerald-400 mb-2">OTP Sent to {formData.phone}</p>
                   <p className="text-[10px] text-zinc-500">Please enter the 6-digit code sent via SMS.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">One-Time Password</label>
                    <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                    <input 
                        type="text" required value={otpInput}
                        onChange={e => setOtpInput(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-center tracking-[0.5em] text-lg font-mono-code text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="XXXXXX"
                        maxLength={6}
                    />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium text-center flex items-center justify-center gap-2">
                    <ShieldAlert className="w-3 h-3" /><span>{error}</span>
                    </div>
                )}

                <button 
                type="submit" disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm OTP <ArrowRight className="w-4 h-4" /></>}
                </button>
                
                {/* Resend Logic */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                        type="button"
                        onClick={handleResendOtp}
                        disabled={timer > 0 || loading}
                        className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${timer > 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                    >
                        {timer > 0 ? (
                            <><Timer className="w-3 h-3" /> Wait {timer}s</>
                        ) : (
                            <><RefreshCw className="w-3 h-3" /> Resend OTP</>
                        )}
                    </button>
                    <button 
                    type="button"
                    onClick={() => setStep('details')}
                    className="py-2 text-xs text-zinc-500 hover:text-white border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all"
                    >
                        Change Number
                    </button>
                </div>
            </form>
          )}

          <div className="mt-6 text-center">
             <p className="text-xs text-zinc-500">
                already account? <button onClick={() => onNavigate(AppView.LOGIN)} className="text-emerald-500 hover:text-emerald-400 font-bold underline underline-offset-4">login please</button>
             </p>
          </div>
       </div>
    </div>
  );
};

export default Register;