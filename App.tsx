import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Zap, User, LayoutList, ShieldCheck, Settings, LogOut, Loader2 } from 'lucide-react';
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
  setDoc,
  where,
  getDoc
} from "firebase/firestore";
import { AppView, MessageTemplate, LogEntry, ApiNode, UserProfile } from './types';
import { INITIAL_API_NODES } from './apiNodes';
import Sender from './components/Sender';
import HistoryLog from './components/HistoryLog';
import Protector from './components/Protector';
import Home from './components/Home';
import Profile from './components/Profile';
import Admin from './components/Admin';
import Disclaimer from './components/Disclaimer';
import Landing from './components/Landing';
import Login from './components/Login';       // New Import
import Register from './components/Register'; // New Import
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
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // Auth State - Initialize from localStorage for "Remember Me"
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadFromStorage('netstrike_active_user', null));
  const [rememberSession, setRememberSession] = useState(true); // Default to true

  // App State
  const [logs, setLogs] = useState<LogEntry[]>(() => loadFromStorage('logs', []));
  const [disabledNodes, setDisabledNodes] = useState<string[]>(() => loadFromStorage('disabled_nodes', []));
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [protectedNumbers, setProtectedNumbers] = useState<string[]>(() => loadFromStorage('protected_numbers', []));
  
  const isDbConnected = isFirebaseConfigured() && !!db;

  // Persist User Session (Remember Me Logic)
  useEffect(() => {
    if (currentUser && rememberSession) {
      localStorage.setItem('netstrike_active_user', JSON.stringify(currentUser));
      // Redirect to HOME if on Auth pages
      if ([AppView.LANDING, AppView.LOGIN, AppView.REGISTER].includes(currentView)) {
        setCurrentView(AppView.HOME);
      }
    } else if (!currentUser) {
      localStorage.removeItem('netstrike_active_user');
      // Force Auth views if logged out
      if (![AppView.LANDING, AppView.LOGIN, AppView.REGISTER].includes(currentView)) {
        setCurrentView(AppView.LANDING);
      }
    }
  }, [currentUser, rememberSession]); // Trigger only when user or preference changes

  useEffect(() => {
    const accepted = localStorage.getItem('disclaimer_accepted');
    if (accepted === 'true') setShowDisclaimer(false);
  }, []);

  // FIRESTORE SYNC (LOGS, PROTECTED, API NODES)
  useEffect(() => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
      console.log("Subscribing to Firestore Data...");

      // 1. Logs Sync
      let qLogs;
      if (currentUser.role === 'admin') {
         qLogs = query(collections.logs(db), orderBy("timestamp", "desc"));
      } else {
         qLogs = query(collections.logs(db), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
      }

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
      }, (err) => {
          console.error("Logs sync error:", err);
      });

      // 2. Sync Protected Numbers
      const qProt = collection(db, "protected_numbers");
      const unsubProt = onSnapshot(qProt, (snapshot) => {
         const nums = snapshot.docs.map(doc => doc.data().phone as string);
         setProtectedNumbers(nums);
      }, (err) => console.error("Protector sync error:", err));

      // 3. Sync API Nodes (DB Source of Truth)
      const qNodes = collection(db, "api_nodes");
      const unsubNodes = onSnapshot(qNodes, (snapshot) => {
          const loadedNodes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          } as ApiNode));
          
          loadedNodes.sort((a, b) => a.name.localeCompare(b.name));
          setApiNodes(loadedNodes);
      }, (err) => console.error("API Nodes sync error:", err));

      return () => {
        unsubLogs();
        unsubProt();
        unsubNodes();
      };
    } else {
       if (!currentUser) {
           setLogs([]);
           setApiNodes([]); 
       } else {
           const storedNodes = localStorage.getItem('netstrike_nodes_v5');
           if (storedNodes) {
               setApiNodes(JSON.parse(storedNodes));
           } else {
               setApiNodes(INITIAL_API_NODES);
           }
       }
    }
  }, [isDbConnected, currentUser]);

  // Sync Local Settings (Backup)
  useEffect(() => { localStorage.setItem('disabled_nodes', JSON.stringify(disabledNodes)); }, [disabledNodes]);
  useEffect(() => { 
      if (!isDbConnected || (currentUser && currentUser.uid.startsWith('guest_'))) {
        localStorage.setItem('netstrike_nodes_v5', JSON.stringify(apiNodes)); 
      }
  }, [apiNodes, isDbConnected, currentUser]);
  
  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };
  
  const handleSendLog = async (log: LogEntry) => {
    const logWithUser: LogEntry = {
        ...log,
        userId: currentUser?.uid,
        username: currentUser?.username || 'Unknown'
    };

    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
            await addDoc(collections.logs(db), {
                ...logWithUser,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("Error saving log to DB:", error);
            setLogs(prev => [logWithUser, ...prev]);
        }
    } else {
        setLogs(prev => [logWithUser, ...prev]);
    }
  };

  const handleClearLogs = async () => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
            const q = currentUser.role === 'admin' 
                ? query(collections.logs(db)) 
                : query(collections.logs(db), where("userId", "==", currentUser.uid));
            
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
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
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
             await setDoc(doc(db, "api_nodes", updatedNode.id), updatedNode);
        } catch(e) { console.error("DB Update Failed", e); }
    } else {
        setApiNodes(prev => prev.map(node => node.id === updatedNode.id ? updatedNode : node));
    }
  };

  const handleAddNode = async (newNode: ApiNode) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
             await setDoc(doc(db, "api_nodes", newNode.id), newNode);
        } catch(e) { console.error("DB Add Failed", e); }
    } else {
        setApiNodes(prev => [...prev, newNode]);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
             await deleteDoc(doc(db, "api_nodes", id));
        } catch(e) { console.error("DB Delete Failed", e); }
    } else {
        setApiNodes(prev => prev.filter(node => node.id !== id));
    }
  };

  const handleAddProtectedNumber = async (phone: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
            await setDoc(doc(db, "protected_numbers", phone), { 
                phone, 
                addedAt: new Date(),
                addedBy: currentUser?.username || 'System'
            });
        } catch (e) { console.error("Error protecting number:", e); }
    } else {
        if (!protectedNumbers.includes(phone)) {
            setProtectedNumbers(prev => [...prev, phone]);
        }
    }
  };

  const handleRemoveProtectedNumber = async (phone: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try {
            await deleteDoc(doc(db, "protected_numbers", phone));
        } catch (e) { console.error("Error removing protected number:", e); }
    } else {
        setProtectedNumbers(prev => prev.filter(num => num !== phone));
    }
  };

  const handleLogout = async () => {
     setCurrentUser(null);
     localStorage.removeItem('netstrike_active_user');
     setCurrentView(AppView.LANDING);
  };

  const handleGuestLogin = () => {
    const guestUser: UserProfile = {
      uid: 'guest_' + Date.now(),
      email: 'guest@netstrike.local',
      username: 'Guest_Operative',
      role: 'user',
      createdAt: new Date()
    };
    setRememberSession(false); // Guest is typically temporary
    setCurrentUser(guestUser);
    setCurrentView(AppView.HOME);
  };

  const handleAuthSuccess = (user: UserProfile, remember: boolean) => {
    setRememberSession(remember);
    setCurrentUser(user);
    // View change is handled by useEffect when currentUser updates
  };

  const activeNodes = apiNodes.filter(node => !disabledNodes.includes(node.name));

  // Unauthenticated Views
  if (!currentUser) {
      if (currentView === AppView.LOGIN) {
          return <Login onNavigate={setCurrentView} onLoginSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />;
      }
      if (currentView === AppView.REGISTER) {
          return <Register onNavigate={setCurrentView} onLoginSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />;
      }
      return <Landing onNavigate={setCurrentView} />;
  }

  // Authenticated Views
  const renderContent = () => {
    switch (currentView) {
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
            currentUser={currentUser}
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
            currentUser={currentUser}
            logs={logs}
            toggleNode={handleToggleNode} 
            onUpdateNode={handleUpdateNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onLogout={() => setCurrentView(AppView.PROFILE)} 
          />
        );
      default: 
        return <Home onNavigate={setCurrentView} nodeCount={activeNodes.length} />;
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
          onClick={() => setCurrentView(AppView.HOME)} 
          className="flex items-center gap-2 cursor-pointer group"
        >
            <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
            <h1 className="text-lg font-bold font-display tracking-wide text-white">NETSTRIKE <span className="text-[9px] text-zinc-600 font-mono-code align-top">LOCAL</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-white">{currentUser.username}</span>
              <span className={`text-[9px] px-1 rounded ${currentUser.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {currentUser.role.toUpperCase()}
              </span>
           </div>
           
           <button 
            onClick={() => setCurrentView(AppView.PROFILE)}
            className={`p-2 rounded-full transition-colors ${currentView === AppView.PROFILE ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button 
             onClick={handleLogout}
             className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
          >
             <LogOut className="w-4 h-4" />
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
            <NavItem view={AppView.SEND} icon={Zap} label="Bomber" />
            <NavItem view={AppView.HOME} icon={HomeIcon} label="Status" />
            <NavItem view={AppView.PROTECTOR} icon={ShieldCheck} label="Protect" />
            <NavItem view={AppView.TEMPLATES} icon={LayoutList} label="Logs" />
          </div>
        </nav>
      )}
    </div>
  );
}