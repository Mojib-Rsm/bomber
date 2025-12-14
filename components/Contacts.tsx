import React, { useState } from 'react';
import { Contact } from '../types';
import { UserPlus, Search, Trash2, User, Crosshair } from 'lucide-react';

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', tags: '' });

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
      tags: newContact.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: '', phone: '', tags: '' });
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4 animate-fade-in p-4 pb-20">
      <div className="flex justify-between items-center border-b border-[#1e293b] pb-2">
        <h2 className="text-xl font-bold text-[#0ea5e9] tracking-widest uppercase font-mono-code flex items-center gap-2">
            <Crosshair className="w-5 h-5" /> Target DB
        </h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#0ea5e9]/10 border border-[#0ea5e9] text-[#0ea5e9] px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-2 hover:bg-[#0ea5e9] hover:text-white transition-all"
        >
          <UserPlus className="w-3 h-3" />
          ADD ENTRY
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-[#0ea5e9] transition-colors" />
        <input 
          type="text" 
          placeholder="SEARCH DATABASE..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#050a10] border border-[#1e293b] text-[#0ea5e9] pl-10 pr-4 py-3 rounded outline-none focus:border-[#0ea5e9] placeholder-gray-700 text-xs font-mono-code tracking-wider transition-all"
        />
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 gap-2">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-[#050a10] p-3 rounded border border-[#1e293b] flex items-center justify-between group hover:border-[#0ea5e9]/50 transition-colors">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#1e293b] flex items-center justify-center border border-[#334155] group-hover:border-[#0ea5e9]">
                    <User className="w-4 h-4 text-gray-400 group-hover:text-[#0ea5e9]" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-300 text-xs tracking-wide">{contact.name}</h3>
                   <div className="text-[#0ea5e9] text-[10px] font-mono-code">{contact.phone}</div>
                </div>
             </div>
             
             <div className="flex items-center gap-3">
                {contact.tags.length > 0 && (
                    <div className="hidden sm:flex gap-1">
                        {contact.tags.map((tag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 font-bold uppercase">
                            {tag}
                        </span>
                        ))}
                    </div>
                )}
                <button 
                  onClick={() => handleDelete(contact.id)}
                  className="text-gray-600 hover:text-[#ef4444] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-[#1e293b] border border-dashed border-[#1e293b] rounded bg-[#050a10]">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Database Empty</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-[#050a10] border border-[#0ea5e9] w-full max-w-sm p-5 animate-fade-in relative shadow-[0_0_30px_rgba(14,165,233,0.2)]">
            <h3 className="text-sm font-bold text-[#0ea5e9] mb-4 uppercase tracking-widest border-b border-[#0ea5e9]/30 pb-2">New Target Entry</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Identifier / Name</label>
                <input 
                  required
                  type="text" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-[#0a1520] border border-[#1e293b] p-2 text-white focus:border-[#0ea5e9] outline-none text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                <input 
                  required
                  type="text" 
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="01xxxxxxxxx"
                  className="w-full bg-[#0a1520] border border-[#1e293b] p-2 text-white focus:border-[#0ea5e9] outline-none text-xs font-mono-code"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tags (Optional)</label>
                <input 
                  type="text" 
                  value={newContact.tags}
                  onChange={e => setNewContact({...newContact, tags: e.target.value})}
                  placeholder="VIP, TEST"
                  className="w-full bg-[#0a1520] border border-[#1e293b] p-2 text-white focus:border-[#0ea5e9] outline-none text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-[10px] uppercase font-bold text-gray-500 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-black font-bold uppercase tracking-wide text-[10px]"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;