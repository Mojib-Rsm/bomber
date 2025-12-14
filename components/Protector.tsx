import React, { useState } from 'react';
import { Shield, Plus, Trash2, ShieldCheck, Search } from 'lucide-react';

interface ProtectorProps {
  protectedNumbers: string[];
  // setProtectedNumbers: React.Dispatch<React.SetStateAction<string[]>>; // Removed
  onAdd: (phone: string) => void;
  onRemove: (phone: string) => void;
}

const Protector: React.FC<ProtectorProps> = ({ protectedNumbers, onAdd, onRemove }) => {
  const [newNumber, setNewNumber] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber) return;
    if (!protectedNumbers.includes(newNumber)) {
        onAdd(newNumber);
    }
    setNewNumber('');
  };

  return (
    <div className="p-5 pb-10 space-y-6 animate-fade-in">
      
      {/* Header Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
         <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
         <div>
            <h3 className="text-sm font-bold text-blue-400">Shield Active (Cloud)</h3>
            <p className="text-xs text-blue-200/60 mt-1 leading-relaxed">
              Numbers in this list are globally protected. Changes sync to database.
            </p>
         </div>
      </div>

      {/* Input */}
      <form onSubmit={handleAdd} className="relative">
         <input 
           type="text"
           value={newNumber}
           onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
           placeholder="Enter number to protect..."
           className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-zinc-600 font-mono-code"
         />
         <button 
           type="submit"
           disabled={!newNumber}
           className="absolute right-2 top-2 p-1.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
         >
           <Plus className="w-4 h-4" />
         </button>
      </form>

      {/* List */}
      <div>
         <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 pl-1">Protected Database</h4>
         
         {protectedNumbers.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-600">
              <Shield className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">No numbers protected</span>
           </div>
         ) : (
           <div className="space-y-2">
              {protectedNumbers.map(num => (
                <div key={num} className="group flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-zinc-700 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="font-mono-code text-zinc-300 text-sm">{num}</span>
                   </div>
                   <button 
                     onClick={() => onRemove(num)}
                     className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
};

export default Protector;