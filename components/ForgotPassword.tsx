import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { ArrowLeft, Mail, Phone, Lock, ArrowRight, Loader2, ShieldAlert, CheckCircle2, MessageSquare, Timer, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"; 
import { db } from '../firebase';
import { sendSmsOtp, sendEmailOtp, generateOtp } from '../services/notificationService';

interface ForgotPasswordProps {
  onNavigate: (view: AppView) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<'search' | 'verify' | 'reset'>('search');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [inputValue, setInputValue] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timer State
  const [timer, setTimer] = useState(0);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccessMsg('');

    try {
      if (!db) throw new Error("Database offline.");

      const usersRef = collection(db, "users");
      const isEmailInput = inputValue.includes('@');
      const searchField = isEmailInput ? 'email' : 'phone';
      
      const q = query(usersRef, where(searchField, "==", inputValue));
      const snapshot = await getDocs(q);

      if (snapshot.empty) throw new Error("User not found.");

      const userData = snapshot.docs[0].data();
      setTargetUserId(snapshot.docs[0].id);

      const code = generateOtp();
      setGeneratedOtp(code);

      let success = false;

      if (isEmailInput) {
          if (!userData.email) throw new Error("No email linked to this account.");
          setMethod('email');
          success = await sendEmailOtp(userData.email, code);
          if (success) setSuccessMsg(`OTP sent to ${userData.email}`);
      } else {
          if (!userData.phone) throw new Error("No phone number linked to this account.");
          setMethod('phone');
          success = await sendSmsOtp(userData.phone, code);
          if (success) setSuccessMsg(`OTP sent to phone ending in ${userData.phone.slice(-4)}`);
      }
      
      if (!success) {
          throw new Error("Failed to dispatch OTP. System Error.");
      }
      
      setStep('verify');
      setTimer(40); // Start Timer

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    setError('');
    
    try {
        // Generate NEW Unique Token
        const newCode = generateOtp();
        setGeneratedOtp(newCode);

        // Resend based on method
        let success = false;
        if (method === 'email') {
            success = await sendEmailOtp(inputValue, newCode);
        } else {
            success = await sendSmsOtp(inputValue, newCode);
        }
        
        if (success) alert(`New OTP sent.`);
        else throw new Error("Resend Failed");

        setTimer(40); // Reset Timer
    } catch(err) {
        setError("Failed to resend.");
    } finally {
        setLoading(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
      e.preventDefault();
      if (otpInput === generatedOtp) {
          setStep('reset');
          setError('');
      } else {
          setError("Invalid OTP Code.");
      }
  };

  const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (!db || !targetUserId) throw new Error("Error updating password.");
          
          await updateDoc(doc(db, "users", targetUserId), {
              password: newPassword
          });
          
          alert("Password Reset Successfully!");
          onNavigate(AppView.LOGIN);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
          
          <button onClick={() => onNavigate(AppView.LOGIN)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white mb-6">
              <ArrowLeft className="w-3 h-3" /> Back to Login
          </button>

          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 mb-4">
                <Lock className="w-6 h-6 text-red-500" />
             </div>
             <h2 className="text-2xl font-bold font-display tracking-wide text-white">Reset Access</h2>
             <p className="text-zinc-500 text-sm mt-2">Recover your OFT Tools account.</p>
          </div>

          {step === 'search' && (
              <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email or Phone</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                        <input 
                            type="text" required value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-red-500 outline-none"
                            placeholder="user@oft.io or +88017..."
                        />
                    </div>
                  </div>
                  {error && <div className="text-xs text-red-500 text-center bg-red-500/10 p-2 rounded">{error}</div>}
                  <button type="submit" disabled={loading} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find Account'}
                  </button>
              </form>
          )}

          {step === 'verify' && (
              <form onSubmit={handleVerify} className="space-y-4 animate-fade-in">
                  <div className="text-center p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <p className="text-xs text-zinc-300">{successMsg}</p>
                      {method === 'email' && <p className="text-[10px] text-zinc-500 mt-1">Check your inbox or spam folder.</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Enter OTP</label>
                    <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                        <input 
                            type="text" required value={otpInput}
                            onChange={e => setOtpInput(e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-center tracking-widest text-lg font-mono-code text-white focus:border-red-500 outline-none"
                            placeholder="XXXXXX" maxLength={6}
                        />
                    </div>
                  </div>
                  {error && <div className="text-xs text-red-500 text-center bg-red-500/10 p-2 rounded">{error}</div>}
                  <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all">Verify OTP</button>
                  
                   {/* Resend Logic */}
                   <div className="flex justify-center mt-2">
                        <button 
                            type="button"
                            onClick={handleResendOtp}
                            disabled={timer > 0 || loading}
                            className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${timer > 0 ? 'text-zinc-500 cursor-not-allowed' : 'text-zinc-300 hover:text-white'}`}
                        >
                            {timer > 0 ? (
                                <><Timer className="w-3 h-3" /> Resend in {timer}s</>
                            ) : (
                                <><RefreshCw className="w-3 h-3" /> Resend Code</>
                            )}
                        </button>
                    </div>
              </form>
          )}

          {step === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                        <input 
                            type="password" required value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                  </div>
                  {error && <div className="text-xs text-red-500 text-center bg-red-500/10 p-2 rounded">{error}</div>}
                  <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                  </button>
              </form>
          )}
       </div>
    </div>
  );
};

export default ForgotPassword;