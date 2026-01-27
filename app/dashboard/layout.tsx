'use client';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Activity, Users, Bell, Stethoscope, LayoutDashboard, LogOut, Menu, 
  ChevronDown, User as UserIcon, UserCircle2, X, Settings, HelpCircle, 
  MessageCircle, Mail, Check, CheckCircle2,
  type LucideIcon
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { 
  collection, query, orderBy, limit, onSnapshot, 
  doc, updateDoc, deleteDoc, writeBatch, getDoc 
} from 'firebase/firestore'; // Added getDoc
import { db } from '../firebase';
import { formatDistanceToNow, isValid } from 'date-fns';
import ChatWidget from '../components/ChatWidget';

// --- TYPES ---
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FAMILY' | 'VOLUNTEER' | 'DOCTOR' | 'ELDER';
  photoUrl?: string;
  gender?: 'MALE' | 'FEMALE';
}

interface NavLink {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

interface Alert {
  id: string;
  status: string;
  timestamp: Date;
  read?: boolean;
}

// --- SMART AVATAR ---
const UserAvatar = ({ user, size = "md" }: { user: User, size?: "sm" | "md" | "lg" }) => {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 32 : 20;

  if (user?.photoUrl) return <Image src={user.photoUrl} alt={user.name} width={size === "sm" ? 32 : size === "lg" ? 64 : 40} height={size === "sm" ? 32 : size === "lg" ? 64 : 40} className={`${dims} rounded-full border-2 border-white shadow-sm object-cover`} />;
  if (user?.gender === 'FEMALE') return <div className={`${dims} rounded-full bg-pink-50 border-2 border-white shadow-sm flex items-center justify-center text-pink-500`}><UserCircle2 size={iconSize} /></div>;
  if (user?.gender === 'MALE') return <div className={`${dims} rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-500`}><UserIcon size={iconSize} /></div>;

  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';
  return <div className={`${dims} rounded-full bg-gradient-to-br from-slate-800 to-slate-600 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold tracking-wider`}>{initials}</div>;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  
  // UI States
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false); 
  const [isHelpOpen, setHelpOpen] = useState(false);
  
  // Data States
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // NEW: Local User Profile State (Synched with Firestore)
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // Refs for click-outside detection
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // 1. SYNC USER PROFILE (Fixes the name update issue)
  useEffect(() => {
    if (!auth?.user?.id) return;
    
    // Set initial data from auth context to prevent flicker
    setUserProfile(auth.user);

    // Listen to the specific user document in Firestore
    const unsub = onSnapshot(doc(db, 'users', auth.user.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        // Update local state with fresh data from database
        setUserProfile(prev => ({
            ...prev!, // Keep existing fields (like id)
            ...userData, // Overwrite with new fields (name, photo, etc)
            role: userData.role || prev?.role // Ensure role exists
        } as User));
      }
    });

    return () => unsub();
  }, [auth?.user?.id]);

  // 2. Fetch Notifications (List of 5)
  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedAlerts: Alert[] = snap.docs.map(doc => {
        const data = doc.data();
        let safeDate = new Date();
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            safeDate = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
            safeDate = data.timestamp;
        }
        return {
          id: doc.id,
          status: data.status || 'System Alert',
          timestamp: safeDate,
          read: data.read || false
        };
      });
      setAlerts(fetchedAlerts);
    });
    return () => unsub();
  }, []);

  // 3. Click Outside Logic
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (helpRef.current && !helpRef.current.contains(target)) {
        setHelpOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notification Actions
  const unreadCount = alerts.filter(a => !a.read).length;
  
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'alerts', id), { read: true });
    } catch (err) { console.error("Error marking read", err); }
  };

  const handleIgnore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'alerts', id));
    } catch (err) { console.error("Error deleting", err); }
  };

  const handleClearAll = async () => {
    try {
      const batch = writeBatch(db);
      alerts.forEach(alert => {
        const docRef = doc(db, 'alerts', alert.id);
        batch.delete(docRef); 
      });
      await batch.commit();
    } catch (err) { console.error("Error clearing all", err); }
  };

  if (!auth?.user) return null;
  // Use userProfile if loaded, otherwise fallback to auth.user
  const currentUser = userProfile || auth.user;
  const role = currentUser.role;

  const links: NavLink[] = [
    { name: 'Monitor', href: '/dashboard', icon: LayoutDashboard, roles: ['ALL'] },
    { name: 'Medical', href: '/dashboard/medical', icon: Stethoscope, roles: ['DOCTOR', 'ELDER', 'ADMIN'] },
    { name: 'Reminders', href: '/dashboard/reminders', icon: Bell, roles: ['FAMILY', 'ELDER', 'ADMIN'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['ADMIN'] },
  ];

  const NavItem = ({ link }: { link: NavLink }) => {
    const isActive = pathname === link.href;
    return (
      <Link href={link.href} className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'} ${!isSidebarOpen && 'justify-center px-0'}`}>
        {!isActive && <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
        <link.icon size={22} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className={`whitespace-nowrap font-semibold relative z-10 transition-all duration-300 ${!isSidebarOpen ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>{link.name}</span>
        {isActive && !isSidebarOpen && <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse"></span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative">
      
      {/* Custom Styles for Bell Animation */}
      <style jsx global>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(15deg); }
          40%, 80% { transform: rotate(-15deg); }
        }
        .animate-bell-ring {
          animation: bell-ring 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>

      {/* CHATBOT WIDGET */}
      {isChatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}

      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-100 shadow-sm transform transition-all duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${isSidebarOpen ? 'md:w-72' : 'md:w-24'}`}>
        <div className={`h-24 flex items-center ${isSidebarOpen ? 'px-8 justify-between' : 'justify-center'} border-b border-slate-50`}>
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0 group-hover:scale-105 transition-transform"><Activity size={22} className="animate-pulse-slow" /></div>
            <div className={`transition-all duration-300 ${!isSidebarOpen && 'w-0 opacity-0'}`}><span className="font-black text-xl text-slate-900 tracking-tight block leading-none">CareBridge</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Enterprise</span></div>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {links.map((link) => ((link.roles.includes('ALL') || link.roles.includes(role)) && <NavItem key={link.href} link={link} />))}
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-2">
          {isSidebarOpen ? (
            <div className="group relative" ref={helpRef}>
                <div 
                  onClick={() => setHelpOpen(!isHelpOpen)} 
                  className={`bg-slate-50 rounded-2xl p-4 border cursor-pointer transition-all duration-200 
                  ${isHelpOpen ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-slate-100 hover:bg-blue-50 hover:border-blue-100'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><HelpCircle size={18}/></div>
                        <div><p className="text-xs font-bold text-slate-800">Need Help?</p><p className="text-[10px] text-slate-500">Support & Chat</p></div>
                    </div>
                </div>
                
                <div className={`absolute bottom-full left-0 w-full pb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 ${isHelpOpen ? 'block' : 'hidden group-hover:block'}`}>
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 overflow-hidden">
                        <a href="mailto:support@carebridge.com" className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors">
                            <Mail size={16} /> Mail Support
                        </a>
                        <button onClick={() => { setChatOpen(true); setHelpOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors text-left">
                            <MessageCircle size={16} /> Support Chat
                        </button>
                    </div>
                </div>
            </div>
          ) : (
             <button onClick={() => setSidebarOpen(true)} className="flex justify-center w-full p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"><HelpCircle size={22}/></button>
          )}
          
          <button onClick={auth.logout} className={`flex items-center gap-3 w-full text-slate-500 hover:text-red-500 hover:bg-red-50 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${!isSidebarOpen && 'justify-center'}`}>
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
            <span className={`font-bold whitespace-nowrap transition-all duration-300 ${!isSidebarOpen && 'hidden w-0 opacity-0'}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Menu size={24} /></button>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden md:block p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><Menu size={22} /></button>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 h-8">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">System Online</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            
            {/* --- NOTIFICATIONS --- */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!isNotifOpen)} 
                className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full active:scale-95 transition"
              >
                <Bell size={20} className={unreadCount > 0 ? "text-blue-500 animate-bell-ring" : ""} />
                
                {/* Red Dot Logic: Only show if unread > 0 AND drawer is CLOSED */}
                {unreadCount > 0 && !isNotifOpen && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Notifications</span>
                        {unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                    </div>
                    {alerts.length > 0 && (
                        <button onClick={handleClearAll} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase">
                            Clear All
                        </button>
                    )}
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group relative ${!alert.read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${alert.status.includes('Emergency') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                <Activity size={18}/>
                            </div>
                            <div className="flex-1 pr-14">
                                <p className={`text-sm ${!alert.read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{alert.status}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {isValid(alert.timestamp) ? formatDistanceToNow(alert.timestamp, {addSuffix: true}) : 'Just now'}
                                </p>
                            </div>
                          </div>
                          
                          {/* Hover Actions: Mark Read / Ignore */}
                          <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {!alert.read && (
                                <button 
                                    onClick={(e) => handleMarkAsRead(alert.id, e)}
                                    title="Mark as Read"
                                    className="p-1.5 bg-white text-green-500 border border-slate-200 rounded-lg hover:bg-green-50 hover:border-green-200 shadow-sm transition-colors"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </button>
                            )}
                            <button 
                                onClick={(e) => handleIgnore(alert.id, e)}
                                title="Dismiss"
                                className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 size={32} className="opacity-20 mb-2"/>
                            <p className="text-sm">All caught up!</p>
                        </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- USER PROFILE (UPDATED TO USE REALTIME DATA) --- */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-2 md:pl-4 md:border-l border-slate-200 hover:bg-slate-50 rounded-xl p-1 transition-all">
                <div className="text-right hidden md:block"><p className="text-sm font-bold text-slate-800 leading-tight">{currentUser.name}</p><p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit ml-auto mt-0.5">{role}</p></div>
                <div className="relative group"><UserAvatar user={currentUser} /><div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-200 text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}><ChevronDown size={10} strokeWidth={3}/></div></div>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-50 bg-slate-50/50"><p className="text-xs font-bold text-slate-400 uppercase">Signed in as</p><p className="text-sm font-bold text-slate-800 truncate">{currentUser.email}</p></div>
                  <div className="p-2">
                    {role === 'ADMIN' && (
                        <Link 
                            href={`/dashboard/users/${currentUser.id}`} 
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors"
                            onClick={() => setProfileOpen(false)}
                        >
                            <Settings size={16} /> Account Settings
                        </Link>
                    )}
                    <button onClick={auth.logout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={16} /> Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">{children}</main>
      </div>
    </div>
  );
}