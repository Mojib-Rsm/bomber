import React from 'react';
import { AlertTriangle, ShieldAlert, Terminal, Fingerprint } from 'lucide-react';

interface DisclaimerProps {
  onAccept: () => void;
}

const Disclaimer: React.FC<DisclaimerProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 animate-fade-in">
      {/* Scanline overlay inside popup */}
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]"></div>

      <div className="bg-[#050a10] border border-[#ef4444] w-full max-w-sm relative shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        <div className="bg-[#ef4444] p-1 flex justify-between items-center px-3">
             <span className="text-[10px] font-black text-black uppercase tracking-widest">সিস্টেম সতর্কতা // লেভেল ৫</span>
             <AlertTriangle className="w-4 h-4 text-black fill-current" />
        </div>
        
        <div className="p-6 space-y-6 relative z-10">
           <div className="flex flex-col items-center text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-[#ef4444]" />
              <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">সতর্কীকরণ বিজ্ঞপ্তি</h2>
                  <p className="text-[10px] text-[#ef4444] font-mono-code mt-1">শুধুমাত্র অনুমোদিত ব্যবহারকারীদের জন্য</p>
              </div>
           </div>

           <div className="border border-[#1e293b] bg-[#0a1520] p-3 text-[11px] font-mono-code text-gray-400 leading-relaxed text-justify">
              <span className="text-[#ef4444] font-bold">সতর্কতা:</span> এই টুলটি শুধুমাত্র শিক্ষামূলক এবং নিরাপত্তা পরীক্ষার জন্য তৈরি করা হয়েছে। বিনা অনুমতিতে কারো ক্ষতি করার উদ্দেশ্যে এটি ব্যবহার করা সম্পূর্ণ বেআইনি। ডেভেলপার কোনো প্রকার অপব্যবহারের দায়ভার গ্রহণ করবে না। আপনি নিজ দায়িত্বে এটি ব্যবহার করতে সম্মত হচ্ছেন।
           </div>

           <button 
            onClick={onAccept}
            className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-black font-black py-3 uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group"
          >
            <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform" />
            আমি সকল দায়ভার গ্রহণ করছি
          </button>
        </div>

        <div className="p-2 border-t border-[#1e293b] flex justify-between items-center text-[9px] text-gray-600 font-mono-code uppercase">
           <span>সুরক্ষিত সংযোগ</span>
           <span>এনক্রিপ্টেড_V4</span>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;