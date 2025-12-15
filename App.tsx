import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  updateDoc
} from "firebase/firestore";
import { AppView, MessageTemplate, LogEntry, ApiNode, UserProfile, ActiveSession } from './types';
import { INITIAL_API_NODES } from './apiNodes';
import Sender from './components/Sender';
import HistoryLog from './components/HistoryLog';
import Protector from './components/Protector';
import Home from './components/Home';
import Profile from './components/Profile';
import Admin from './components/Admin';
import Disclaimer from './components/Disclaimer';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
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

// --- Layout Components ---

const AuthLayout = () => {
  return <Outlet />;
};

const MainLayout = ({ 
  currentUser, 
  handleLogout 
}: { 
  currentUser: UserProfile; 
  handleLogout: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDbConnected = isFirebaseConfigured() && !!db;

  const NavItem = ({ path, icon: Icon, label }: { path: string, icon: any, label: string }) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => navigate(path)}
        className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 ${
          isActive 
            ? 'text-emerald-500' 
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'fill-emerald-500/20' : ''}`} />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-200 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-5 z-20 shrink-0 sticky top-0">
        <div 
          onClick={() => navigate('/home')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
            <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
            <h1 className="text-lg font-bold font-display tracking-wide text-white">NETSTRIKE <span className="text-[9px] text-zinc-600 font-mono-code align-top">CLOUD</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-white">{currentUser.username}</span>
              <span className={`text-[9px] px-1 rounded ${currentUser.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {currentUser.role.toUpperCase()}
              </span>
           </div>
           
           <button 
            onClick={() => navigate('/profile')}
            className={`p-2 rounded-full transition-colors ${location.pathname === '/profile' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
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
            <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      {location.pathname !== '/admin' && (
        <nav className="h-16 border-t border-zinc-800 bg-[#09090b]/90 backdrop-blur-xl shrink-0 z-20 pb-safe">
          <div className="flex h-full max-w-2xl mx-auto">
            <NavItem path="/bomber" icon={Zap} label="Bomber" />
            <NavItem path="/home" icon={HomeIcon} label="Status" />
            <NavItem path="/protector" icon={ShieldCheck} label="Protect" />
            <NavItem path="/logs" icon={LayoutList} label="Logs" />
          </div>
        </nav>
      )}
    </div>
  );
};

// --- Main App Logic ---

function AppContent() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadFromStorage('netstrike_active_user', null));
  const [rememberSession, setRememberSession] = useState(true);

  // App Data
  const [logs, setLogs] = useState<LogEntry[]>(() => loadFromStorage('logs', []));
  const [userSessions, setUserSessions] = useState<ActiveSession[]>([]);
  const [disabledNodes, setDisabledNodes] = useState<string[]>(() => loadFromStorage('disabled_nodes', []));
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [protectedNumbers, setProtectedNumbers] = useState<string[]>(() => loadFromStorage('protected_numbers', []));
  
  const isDbConnected = isFirebaseConfigured() && !!db;
  const navigate = useNavigate();

  // Navigation Wrapper for legacy components
  const handleLegacyNavigate = (view: AppView) => {
    switch(view) {
      case AppView.HOME: navigate('/home'); break;
      case AppView.SEND: navigate('/bomber'); break;
      case AppView.PROTECTOR: navigate('/protector'); break;
      case AppView.TEMPLATES: navigate('/logs'); break;
      case AppView.PROFILE: navigate('/profile'); break;
      case AppView.ADMIN: navigate('/admin'); break;
      case AppView.LOGIN: navigate('/login'); break;
      case AppView.REGISTER: navigate('/register'); break;
      case AppView.LANDING: navigate('/'); break;
      default: navigate('/home');
    }
  };

  // Auth Persistence
  useEffect(() => {
    if (currentUser && rememberSession) {
      localStorage.setItem('netstrike_active_user', JSON.stringify(currentUser));
    } else if (!currentUser) {
      localStorage.removeItem('netstrike_active_user');
    }
  }, [currentUser, rememberSession]);

  useEffect(() => {
    const accepted = localStorage.getItem('disclaimer_accepted');
    if (accepted === 'true') setShowDisclaimer(false);
  }, []);

  // Sync Logic
  useEffect(() => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
      const qLogs = currentUser.role === 'admin' 
        ? query(collections.logs(db), orderBy("timestamp", "desc"))
        : query(collections.logs(db), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));

      const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const firebaseLogs = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
        } as LogEntry));
        setLogs(firebaseLogs);
      });

      // Session/History Sync
      // Removed orderBy to avoid index requirement issues on fresh Firestore instances
      const qSessions = query(
          collections.sessions(db), 
          where("userId", "==", currentUser.uid)
      );
      const unsubSessions = onSnapshot(qSessions, (snapshot) => {
          const sessions = snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
              startTime: doc.data().startTime?.toDate ? doc.data().startTime.toDate() : new Date(doc.data().startTime || Date.now()),
              lastUpdate: doc.data().lastUpdate?.toDate ? doc.data().lastUpdate.toDate() : new Date(doc.data().lastUpdate || Date.now()),
          } as ActiveSession));
          
          // Client-side sort
          sessions.sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime());
          setUserSessions(sessions);
      });

      const unsubProt = onSnapshot(collection(db, "protected_numbers"), (snapshot) => {
         setProtectedNumbers(snapshot.docs.map(doc => doc.data().phone as string));
      });

      const unsubNodes = onSnapshot(collection(db, "api_nodes"), (snapshot) => {
          const loadedNodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiNode));
          loadedNodes.sort((a, b) => a.name.localeCompare(b.name));
          setApiNodes(loadedNodes);
      });

      return () => { unsubLogs(); unsubProt(); unsubNodes(); unsubSessions(); };
    } else {
       if (!currentUser) {
           setLogs([]);
           setApiNodes([]); 
           setUserSessions([]);
       } else {
           const storedNodes = localStorage.getItem('netstrike_nodes_v5');
           setApiNodes(storedNodes ? JSON.parse(storedNodes) : INITIAL_API_NODES);
       }
    }
  }, [isDbConnected, currentUser]);

  // Actions
  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };
  
  const handleSendLog = async (log: LogEntry) => {
    // Legacy support for single messages
    const logWithUser: LogEntry = {
        ...log,
        userId: currentUser?.uid,
        username: currentUser?.username || 'Unknown'
    };
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        try { 
            await addDoc(collections.logs(db), { ...logWithUser, timestamp: new Date() }); 
        } catch (error) { console.error(error); }
    }
  };

  const handleStopSession = async (sessionId: string) => {
      if (isDbConnected && db) {
          try {
            await updateDoc(doc(db, 'active_sessions', sessionId), {
                status: 'stopped',
                lastUpdate: new Date()
            });
          } catch(e) { console.error("Error stopping session", e); }
      }
  };

  const handleClearLogs = async () => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        const q = currentUser.role === 'admin' ? query(collections.logs(db)) : query(collections.logs(db), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } else {
        setLogs([]);
        localStorage.removeItem('logs');
    }
  };

  const handleToggleNode = (name: string) => {
    setDisabledNodes(prev => {
        const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
        localStorage.setItem('disabled_nodes', JSON.stringify(next));
        return next;
    });
  };

  const handleUpdateNode = async (updatedNode: ApiNode) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        await setDoc(doc(db, "api_nodes", updatedNode.id), updatedNode);
    } else {
        setApiNodes(prev => prev.map(node => node.id === updatedNode.id ? updatedNode : node));
    }
  };

  const handleAddNode = async (newNode: ApiNode) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        await setDoc(doc(db, "api_nodes", newNode.id), newNode);
    } else {
        setApiNodes(prev => [...prev, newNode]);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        await deleteDoc(doc(db, "api_nodes", id));
    } else {
        setApiNodes(prev => prev.filter(node => node.id !== id));
    }
  };

  const handleAddProtectedNumber = async (phone: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        await setDoc(doc(db, "protected_numbers", phone), { phone, addedAt: new Date(), addedBy: currentUser?.username || 'System' });
    } else {
        if (!protectedNumbers.includes(phone)) {
            const next = [...protectedNumbers, phone];
            setProtectedNumbers(next);
            localStorage.setItem('protected_numbers', JSON.stringify(next));
        }
    }
  };

  const handleRemoveProtectedNumber = async (phone: string) => {
    if (isDbConnected && db && currentUser && !currentUser.uid.startsWith('guest_')) {
        await deleteDoc(doc(db, "protected_numbers", phone));
    } else {
        const next = protectedNumbers.filter(num => num !== phone);
        setProtectedNumbers(next);
        localStorage.setItem('protected_numbers', JSON.stringify(next));
    }
  };

  const handleLogout = () => {
     setCurrentUser(null);
     localStorage.removeItem('netstrike_active_user');
     navigate('/');
  };

  const handleGuestLogin = () => {
    const guestUser: UserProfile = {
      uid: 'guest_' + Date.now(),
      email: 'guest@netstrike.local',
      username: 'Guest_Operative',
      role: 'user',
      createdAt: new Date()
    };
    setRememberSession(false);
    setCurrentUser(guestUser);
    navigate('/home');
  };

  const handleAuthSuccess = (user: UserProfile, remember: boolean) => {
    setRememberSession(remember);
    setCurrentUser(user);
    navigate('/home');
  };

  const activeNodes = apiNodes.filter(node => !disabledNodes.includes(node.name));

  return (
    <>
      {showDisclaimer && <Disclaimer onAccept={handleAcceptDisclaimer} />}
      
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
           <Route path="/" element={currentUser ? <Navigate to="/home" /> : <Landing onNavigate={handleLegacyNavigate} />} />
           <Route path="/login" element={currentUser ? <Navigate to="/home" /> : <Login onNavigate={handleLegacyNavigate} onLoginSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />} />
           <Route path="/register" element={currentUser ? <Navigate to="/home" /> : <Register onNavigate={handleLegacyNavigate} onLoginSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />} />
        </Route>

        {/* Protected Routes */}
        <Route element={currentUser ? <MainLayout currentUser={currentUser} handleLogout={handleLogout} /> : <Navigate to="/" />}>
           <Route path="/home" element={<Home onNavigate={handleLegacyNavigate} nodeCount={activeNodes.length} />} />
           <Route path="/bomber" element={<Sender templates={INITIAL_TEMPLATES} onSend={handleSendLog} protectedNumbers={protectedNumbers} activeNodes={activeNodes} currentUser={currentUser} />} />
           <Route path="/protector" element={<Protector protectedNumbers={protectedNumbers} onAdd={handleAddProtectedNumber} onRemove={handleRemoveProtectedNumber} />} />
           <Route path="/logs" element={<HistoryLog sessions={userSessions} onStopSession={handleStopSession} />} />
           <Route path="/profile" element={<Profile logs={logs} contacts={[]} currentUser={currentUser} onClearLogs={handleClearLogs} onClearContacts={() => {}} onNavigate={handleLegacyNavigate} />} />
           <Route path="/admin" element={<Admin apiNodes={apiNodes} disabledNodes={disabledNodes} currentUser={currentUser} logs={logs} toggleNode={handleToggleNode} onUpdateNode={handleUpdateNode} onAddNode={handleAddNode} onDeleteNode={handleDeleteNode} onLogout={() => navigate('/profile')} />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}