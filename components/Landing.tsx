import React from 'react';
import { AppView } from '../types';
import { Shield, Zap, Globe, ChevronRight, Terminal, Lock } from 'lucide-react';

interface LandingProps {
  onNavigate: (view: AppView) => void;
}

const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white relative overflow-hidden font-sans">
      
      {/* Background Grid & Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#09090b] via-transparent to-[#09090b]"></div>
      </div>

      <header className="relative z-10 p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-center">
               <Terminal className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="font-display font-bold text-xl tracking-wider">NETSTRIKE</span>
         </div>
         <button 
           onClick={() => onNavigate(AppView.LOGIN)}
           className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
         >
           Access Console
         </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-mono-code mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            BOMBER ENGINE READY v2.5.0
         </div>

         <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            Elite SMS Bomber <br/> & Prank Utility
         </h1>

         <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
            The ultimate SMS bombing tool for pranking friends and stress-testing networks. 
            High-speed delivery, multiple gateways, and completely anonymous.
         </p>

         <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
               onClick={() => onNavigate(AppView.REGISTER)}
               className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group"
            >
               Start Bombing
               <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
               onClick={() => onNavigate(AppView.LOGIN)}
               className="px-8 py-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
               Member Login
            </button>
         </div>

         <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors">
               <Zap className="w-8 h-8 text-emerald-500 mb-4" />
               <h3 className="text-lg font-bold text-white mb-2">Super Fast</h3>
               <p className="text-sm text-zinc-500">Blast hundreds of SMS in seconds with our multi-threaded bombing engine.</p>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/30 transition-colors">
               <Shield className="w-8 h-8 text-blue-500 mb-4" />
               <h3 className="text-lg font-bold text-white mb-2">Safe List</h3>
               <p className="text-sm text-zinc-500">Protect your own number from being targeted by other users of the system.</p>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/30 transition-colors">
               <Lock className="w-8 h-8 text-purple-500 mb-4" />
               <h3 className="text-lg font-bold text-white mb-2">Anonymous</h3>
               <p className="text-sm text-zinc-500">No logs, no traces. Your identity remains hidden while you prank.</p>
            </div>
         </div>
      </main>

      <footer className="relative z-10 p-6 border-t border-zinc-900 text-center">
         <p className="text-[10px] text-zinc-600 font-mono-code">
            © 2024 NETSTRIKE. FOR EDUCATIONAL PURPOSES & FUN ONLY.
         </p>
      </footer>
    </div>
  );
};

export default Landing;