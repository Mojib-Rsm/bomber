import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Zap, User, LayoutList, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  writeBatch, 
  getDocs, 
  setDoc 
} from "firebase/firestore";
import { AppView, MessageTemplate, LogEntry, ApiNode } from './types';
import { INITIAL_API_NODES } from './apiNodes';
import Sender from './components/Sender';
import HistoryLog from './components/HistoryLog';
import Protector from './components/Protector';
import Home from './components/Home';
import Profile from './components/Profile';
import Admin from './components/Admin';
import Disclaimer from './components/Disclaimer';
import { db, isFirebaseConfigured, collections } from './firebase';

// Mock Data
const INITIAL_TEMPLATES: MessageTemplate[] = [
  { id: 't1', name: 'Meeting', content: 'Reminder: Meeting at 2PM.', category: 'Alert' },
  { id: 't2', name: 'OTP', content: 'Your code is 482930.', category: 'Transactional' },
];

const loadFromStorage = <T,>(key: string, defaultVal: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load from storage", e);
  }
  return defaultVal;
};

export default function App() {
  // Default to SEND view (Bombing Page) directly
  const [currentView, setCurrentView] = useState<AppView>(AppView.SEND);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Local Storage / State
  const [logs, setLogs] = useState<LogEntry[]>(() => loadFromStorage('logs', []));
  const [disabledNodes, setDisabledNodes] = useState<string[]>(() => loadFromStorage('disabled_nodes', []));
  
  // CHANGED KEY to 'netstrike_nodes_v5' to force reload the HTTPS APIs
  const [apiNodes, setApiNodes] = useState<ApiNode[]>(() => loadFromStorage('netstrike_nodes_v5', INITIAL_API_NODES));
  const [protectedNumbers, setProtectedNumbers] = useState<string[]>(() => loadFromStorage('protected_numbers', []));
  
  // Check connection status based on Firebase config presence
  const isDbConnected = isFirebaseConfigured();

  useEffect(() => {
    const accepted = localStorage.getItem('disclaimer_accepted');
    if (accepted === 'true') setShowDisclaimer(false);
  }, []);

  // FIRESTORE SYNC
  useEffect(() => {
    if (isDbConnected && db) {
      console.log("Subscribing to Firestore...");

      // Sync Logs
      const qLogs = query(collections.logs(db), orderBy("timestamp", "desc"));
      const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const firebaseLogs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
          } as LogEntry;
        });
        setLogs(firebaseLogs);
      }, (err) => console.error("Logs sync error:", err));

      // Sync Protected Numbers
      const qProt = collection(db, "protected_numbers");
      const unsubProt = onSnapshot(qProt, (snapshot) => {
         const nums = snapshot.docs.map(doc => doc.data().phone as string);
         setProtectedNumbers(nums);
      }, (err) => console.error("Protector sync error:", err));

      return () => {
        unsubLogs();
        unsubProt();
      };
    }
  }, [isDbConnected]);

  // Sync Local Settings (Only when DB is NOT connected, or as backup)
  useEffect(() => { 
    if (!isDbConnected) localStorage.setItem('logs', JSON.stringify(logs)); 
  }, [logs, isDbConnected]);
  
  useEffect(() => { localStorage.setItem('disabled_nodes', JSON.stringify(disabledNodes)); }, [disabledNodes]);
  useEffect(() => { localStorage.setItem('netstrike_nodes_v5', JSON.stringify(apiNodes)); }, [apiNodes]);
  
  useEffect(() => { 
    if (!isDbConnected) localStorage.setItem('protected_numbers', JSON.stringify(protectedNumbers)); 
  }, [protectedNumbers, isDbConnected]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };
  
  const handleSendLog = async (log: LogEntry) => {
    if (isDbConnected && db) {
        try {
            await addDoc(collections.logs(db), {
                ...log,
                timestamp: new Date()
            });
            // No need to setLogs, snapshot will handle it
        } catch (error) {
            console.error("Error saving log to DB:", error);
            // Fallback UI update if DB fails
            setLogs(prev => [log, ...prev]);
        }
    } else {
        setLogs(prev => [log, ...prev]);
    }
  };

  const handleClearLogs = async () => {
    if (isDbConnected && db) {
        try {
            // Batch delete (not efficient for massive datasets but fine for tool usage)
            const q = query(collections.logs(db));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            // Snapshot will update state to empty
        } catch (error) {
            console.error("Error clearing logs DB:", error);
        }
    } else {
        setLogs([]);
        localStorage.removeItem('logs');
    }
  };

  const handleClearContacts = () => { localStorage.removeItem('contacts'); };
  
  const handleToggleNode = (name: string) => {
    setDisabledNodes(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleUpdateNode = async (updatedNode: ApiNode) => {
    setApiNodes(prev => prev.map(node => node.id === updatedNode.id ? updatedNode : node));
  };

  const handleAddNode = async (newNode: ApiNode) => {
    const node = { ...newNode, id: Date.now().toString() };
    setApiNodes(prev => [...prev, node]);
  };

  const handleDeleteNode = async (id: string) => {
    setApiNodes(prev => prev.filter(node => node.id !== id));
  };

  const handleAddProtectedNumber = async (phone: string) => {
    if (isDbConnected && db) {
        try {
            // Use phone as ID to enforce uniqueness
            await setDoc(doc(db, "protected_numbers", phone), { 
                phone, 
                addedAt: new Date() 
            });
        } catch (e) { console.error("Error protecting number:", e); }
    } else {
        if (!protectedNumbers.includes(phone)) {
            setProtectedNumbers(prev => [...prev, phone]);
        }
    }
  };

  const handleRemoveProtectedNumber = async (phone: string) => {
    if (isDbConnected && db) {
        try {
            await deleteDoc(doc(db, "protected_numbers", phone));
        } catch (e) { console.error("Error removing protected number:", e); }
    } else {
        setProtectedNumbers(prev => prev.filter(num => num !== phone));
    }
  };

  const activeNodes = apiNodes.filter(node => !disabledNodes.includes(node.name));

  const renderContent = () => {
    switch (currentView) {
      // LANDING, LOGIN, REGISTER removed from flow
      
      case AppView.HOME: 
        return <Home onNavigate={setCurrentView} nodeCount={activeNodes.length} />;
      case AppView.SEND: 
        return (
          <Sender 
            templates={INITIAL_TEMPLATES} 
            onSend={handleSendLog} 
            protectedNumbers={protectedNumbers} 
            activeNodes={activeNodes}
          />
        );
      case AppView.TEMPLATES: return <HistoryLog logs={logs} />;
      case AppView.PROTECTOR: 
        return (
           <Protector 
              protectedNumbers={protectedNumbers} 
              onAdd={handleAddProtectedNumber}
              onRemove={handleRemoveProtectedNumber}
           />
        );
      case AppView.PROFILE: 
        return (
          <Profile 
            logs={logs} 
            contacts={[]} 
            onClearLogs={handleClearLogs} 
            onClearContacts={handleClearContacts}
            onNavigate={setCurrentView}
          />
        );
      case AppView.ADMIN: 
        return (
          <Admin 
            apiNodes={apiNodes} 
            disabledNodes={disabledNodes} 
            toggleNode={handleToggleNode} 
            onUpdateNode={handleUpdateNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onLogout={() => setCurrentView(AppView.PROFILE)} 
          />
        );
      default: 
        // Default fallthrough to Sender as the "Main" page now
        return (
          <Sender 
            templates={INITIAL_TEMPLATES} 
            onSend={handleSendLog} 
            protectedNumbers={protectedNumbers} 
            activeNodes={activeNodes}
          />
        );
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 ${
        currentView === view 
          ? 'text-emerald-500' 
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className={`w-5 h-5 ${currentView === view ? 'fill-emerald-500/20' : ''}`} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-200 overflow-hidden font-sans">
      
      {showDisclaimer && <Disclaimer onAccept={handleAcceptDisclaimer} />}

      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-5 z-20 shrink-0 sticky top-0">
        <div 
          onClick={() => setCurrentView(AppView.SEND)} 
          className="flex items-center gap-2 cursor-pointer group"
        >
            <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
            <h1 className="text-lg font-bold font-display tracking-wide text-white">NETSTRIKE <span className="text-[9px] text-zinc-600 font-mono-code align-top">LOCAL</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentView(AppView.PROFILE)}
            className={`p-2 rounded-full transition-colors ${currentView === AppView.PROFILE ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth relative">
        <div className="max-w-2xl mx-auto min-h-full">
            {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      {currentView !== AppView.ADMIN && (
        <nav className="h-16 border-t border-zinc-800 bg-[#09090b]/90 backdrop-blur-xl shrink-0 z-20 pb-safe">
          <div className="flex h-full max-w-2xl mx-auto">
            <NavItem view={AppView.SEND} icon={Zap} label="Attack" />
            <NavItem view={AppView.HOME} icon={HomeIcon} label="Status" />
            <NavItem view={AppView.PROTECTOR} icon={ShieldCheck} label="Protect" />
            <NavItem view={AppView.TEMPLATES} icon={LayoutList} label="Logs" />
          </div>
        </nav>
      )}
    </div>
  );
}