'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { formatDistanceToNow } from 'date-fns';
import { 
  ShieldAlert, CheckCircle2, Activity, Battery, Signal, 
  MapPin, Phone, Pill, UserPlus, LogOut, Lock, 
  User, Users, Menu, X, ChevronRight, Bell
} from 'lucide-react';

// --- TYPES ---
interface Alert {
  id: string;
  status: string;
  device: string;
  timestamp: Date;
  severity: string;
  resolved: boolean;
  resolvedBy?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FAMILY' | 'VOLUNTEER';
  password?: string; // stored for demo purposes
}

type ViewState = 'DASHBOARD' | 'USERS';

// --- CONFIGURATION ---
const ROLE_THEMES = {
  ADMIN: { 
    color: 'bg-slate-900', 
    text: 'text-slate-900',
    light: 'bg-slate-50', 
    border: 'border-slate-200',
    gradient: 'from-slate-800 to-slate-900'
  },
  FAMILY: { 
    color: 'bg-indigo-600', 
    text: 'text-indigo-600',
    light: 'bg-indigo-50', 
    border: 'border-indigo-200',
    gradient: 'from-indigo-500 to-indigo-700'
  },
  VOLUNTEER: { 
    color: 'bg-emerald-600', 
    text: 'text-emerald-600',
    light: 'bg-emerald-50', 
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-700'
  }
};

export default function CareBridgeProfessional() {
  const [user, setUser] = useState<UserProfile | null>(null);

  // --- LOGIN COMPONENT ---
  const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setError('');

      try {
        // MASTER OVERRIDE FOR FIRST TIME USE (VIVA SAFETY NET)
        if (email === 'admin' && password === 'admin') {
          setUser({ id: 'master', name: 'Master Admin', email: 'admin', role: 'ADMIN' });
          return;
        }

        // REAL DATABASE CHECK
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('User not found.');
          setIsLoggingIn(false);
          return;
        }

        let foundUser = null;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.password === password) {
             foundUser = { id: doc.id, ...data } as UserProfile;
          }
        });

        if (foundUser) {
          setUser(foundUser);
        } else {
          setError('Incorrect password.');
        }
      } catch (err) {
        setError('Connection error. Please try again.');
        console.error(err);
      }
      setIsLoggingIn(false);
    };

    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative overflow-hidden">
           
           {/* Decor */}
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

           <div className="text-center mb-10">
             <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-blue-500/30">
               <Activity size={32} />
             </div>
             <h1 className="text-3xl font-bold text-gray-900 tracking-tight">CareBridge</h1>
             <p className="text-gray-500 mt-2 font-medium">Enterprise Safety Monitor</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-6">
             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Identity</label>
               <div className="relative">
                 <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                 <input 
                   type="text" 
                   placeholder="Username or Email"
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Access Key</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                 <input 
                   type="password" 
                   placeholder="Password"
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                 />
               </div>
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                 <ShieldAlert size={16} /> {error}
               </div>
             )}

             <button 
               type="submit" 
               disabled={isLoggingIn}
               className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 group"
             >
               {isLoggingIn ? 'Authenticating...' : 'Secure Access'}
               {!isLoggingIn && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
             </button>
           </form>
           
           <div className="mt-8 text-center">
             <p className="text-xs text-gray-400">Master Login: <span className="font-mono text-gray-500">admin / admin</span></p>
           </div>
        </div>
      </div>
    );
  };

  if (!user) return <LoginScreen />;

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

// --- MAIN DASHBOARD ---
function Dashboard({ user, onLogout }: { user: UserProfile, onLogout: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemStatus, setSystemStatus] = useState<'SAFE' | 'DANGER'>('SAFE');
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Styling based on role
  const theme = ROLE_THEMES[user.role];

  useEffect(() => {
    // Real-time listener
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(25));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
          resolved: data.resolved || false
        } as Alert;
      });
      setAlerts(newAlerts);

      // Alert Logic
      if (newAlerts.length > 0) {
        const latest = newAlerts[0];
        const diffMinutes = (new Date().getTime() - latest.timestamp.getTime()) / 60000;
        if (diffMinutes < 5 && !latest.resolved) setSystemStatus('DANGER');
        else setSystemStatus('SAFE');
      }
    });
    return () => unsubscribe();
  }, []);

  const resolveAlert = async (id: string) => {
    setProcessingId(id);
    try {
      await updateDoc(doc(db, "alerts", id), {
        resolved: true,
        resolvedBy: user.name,
        status: `Resolved by ${user.name}`
      });
    } catch (e) { console.error(e); }
    setProcessingId(null);
  };

  // --- SUB-COMPONENT: USER MANAGEMENT (ADMIN ONLY) ---
  const UserManagement = () => {
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'FAMILY' });
    const [success, setSuccess] = useState('');

    const createUser = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, 'users'), newUser);
      setSuccess(`User ${newUser.name} created successfully.`);
      setNewUser({ name: '', email: '', password: '', role: 'FAMILY' });
      setTimeout(() => setSuccess(''), 3000);
    };

    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
          <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm">Grant access to new personnel</p>
          </div>
        </div>

        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <label className="text-sm font-semibold text-gray-700">Full Name</label>
             <input required className="w-full p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all" 
               placeholder="e.g. Dr. Sarah Smith" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
           </div>
           
           <div className="space-y-2">
             <label className="text-sm font-semibold text-gray-700">Role Assignment</label>
             <select className="w-full p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
               value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
               <option value="FAMILY">Family Member</option>
               <option value="VOLUNTEER">Volunteer Responder</option>
               <option value="ADMIN">System Administrator</option>
             </select>
           </div>

           <div className="space-y-2">
             <label className="text-sm font-semibold text-gray-700">Login ID / Email</label>
             <input required className="w-full p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all" 
               placeholder="username" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
           </div>

           <div className="space-y-2">
             <label className="text-sm font-semibold text-gray-700">Temporary Password</label>
             <input required className="w-full p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all" 
               placeholder="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
           </div>

           <div className="md:col-span-2 pt-4">
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <UserPlus size={20} /> Create User Account
              </button>
              {success && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center font-medium flex items-center justify-center gap-2"><CheckCircle2 size={16}/> {success}</div>}
           </div>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900">
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className={`${theme.color} text-white p-2.5 rounded-xl shadow-lg shadow-${theme.color}/20`}>
               <Activity size={24} />
             </div>
             <div>
               <h1 className="text-xl font-bold text-gray-900 tracking-tight">CareBridge</h1>
               <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${systemStatus === 'SAFE' ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{systemStatus} MODE</span>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             {/* Admin Tabs */}
             {user.role === 'ADMIN' && (
               <div className="hidden md:flex bg-gray-100/50 p-1 rounded-xl">
                 <button onClick={() => setView('DASHBOARD')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'DASHBOARD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Monitor</button>
                 <button onClick={() => setView('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'USERS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Users</button>
               </div>
             )}

             <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
               <div className="text-right hidden md:block">
                 <p className="text-sm font-bold text-gray-900">{user.name}</p>
                 <p className="text-xs text-gray-500 font-medium">{user.role}</p>
               </div>
               <button onClick={onLogout} className="p-2.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors">
                 <LogOut size={20} />
               </button>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {view === 'USERS' && user.role === 'ADMIN' ? (
          <UserManagement />
        ) : (
          <div className="animate-in fade-in duration-500 space-y-8">
            
            {/* HERO STATUS */}
            <div className={`relative overflow-hidden rounded-[2rem] p-8 md:p-12 text-white shadow-2xl transition-all duration-700 ${
              systemStatus === 'SAFE' 
                ? `bg-gradient-to-br ${theme.gradient}` 
                : 'bg-gradient-to-br from-red-600 to-rose-600'
            }`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest mb-4">
                    <Signal size={12} /> Live Feed
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">
                    {systemStatus === 'SAFE' ? 'ALL CLEAR' : 'EMERGENCY'}
                  </h2>
                  <p className="text-lg opacity-80 font-medium max-w-md">
                    {systemStatus === 'SAFE' ? 'Neural network monitoring active. No anomalies detected.' : 'Critical fall detected. Immediate response protocol initiated.'}
                  </p>
                </div>

                {/* Status Ring Animation */}
                <div className="relative">
                   <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 flex items-center justify-center ${
                     systemStatus === 'SAFE' ? 'border-emerald-400/30' : 'border-red-400/30'
                   }`}>
                      <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md shadow-inner ${
                        systemStatus === 'SAFE' ? 'text-emerald-300' : 'text-red-100 animate-pulse'
                      }`}>
                        {systemStatus === 'SAFE' ? <CheckCircle2 size={48} /> : <ShieldAlert size={48} />}
                      </div>
                   </div>
                   {/* Ripple Effect */}
                   <div className={`absolute top-0 left-0 w-full h-full rounded-full border border-white/20 animate-ping opacity-20`}></div>
                </div>
              </div>
            </div>

            {/* ACTIVE EMERGENCY CARD */}
            {systemStatus === 'DANGER' && alerts[0] && !alerts[0].resolved && (
              <div className="bg-white rounded-3xl p-8 border-l-8 border-red-500 shadow-xl shadow-red-500/10 flex flex-col md:flex-row items-center justify-between gap-6 transform hover:scale-[1.01] transition-transform">
                <div>
                   <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                     <Bell className="text-red-500 fill-red-500 animate-bounce" /> 
                     Action Required
                   </h3>
                   <p className="text-gray-500 mt-1">Event detected {formatDistanceToNow(alerts[0].timestamp, { addSuffix: true })} on <span className="font-mono font-bold text-gray-700">{alerts[0].device}</span></p>
                </div>
                <button 
                  onClick={() => resolveAlert(alerts[0].id)}
                  disabled={!!processingId}
                  className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-3 ${
                    theme.color
                  } hover:opacity-90`}
                >
                  {processingId ? <Activity className="animate-spin" /> : <CheckCircle2 />}
                  {user.role === 'VOLUNTEER' ? 'Accept Mission' : user.role === 'FAMILY' ? 'I Will Handle This' : 'Mark Resolved'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ACTION CENTER */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h3 className="font-bold text-gray-900">Recent Activity</h3>
                   <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-md">SYNCED</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-6 flex items-start gap-4 transition-colors hover:bg-gray-50 ${alert.resolved ? 'opacity-50 grayscale' : ''}`}>
                      <div className={`mt-1 p-3 rounded-2xl ${alert.resolved ? 'bg-gray-100 text-gray-400' : alert.status.includes('Emergency') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                         {alert.status.includes('Emergency') ? <ShieldAlert size={20} /> : <Activity size={20} />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <h4 className="font-bold text-gray-900">{alert.status}</h4>
                           <span className="text-xs font-bold text-gray-400">{formatDistanceToNow(alert.timestamp)} ago</span>
                         </div>
                         <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                           <MapPin size={12} /> {alert.device}
                         </p>
                         {alert.resolvedBy && (
                           <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                             <CheckCircle2 size={12} /> Resolved by {alert.resolvedBy}
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div className="p-12 text-center text-gray-400">No events recorded.</div>}
                </div>
              </div>

              {/* SIDEBAR STATS */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-6">Device Health</h3>
                  <div className="space-y-6">
                     <div>
                       <div className="flex justify-between mb-2">
                         <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Battery size={16}/> Battery</span>
                         <span className="text-sm font-bold text-green-600">94%</span>
                       </div>
                       <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                         <div className="bg-green-500 w-[94%] h-full"></div>
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between mb-2">
                         <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Signal size={16}/> Signal</span>
                         <span className="text-sm font-bold text-blue-600">Strong</span>
                       </div>
                       <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                         <div className="bg-blue-500 w-[80%] h-full"></div>
                       </div>
                     </div>
                  </div>
                </div>

                <div className={`${theme.light} p-6 rounded-3xl border ${theme.border}`}>
                  <h3 className={`font-bold ${theme.text} mb-4`}>Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {user.role === 'FAMILY' && (
                       <>
                         <button className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center font-semibold text-gray-700">
                           <Phone className="mx-auto mb-2 text-indigo-500"/> Call
                         </button>
                         <button className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center font-semibold text-gray-700">
                           <Pill className="mx-auto mb-2 text-indigo-500"/> Meds
                         </button>
                       </>
                    )}
                    {user.role === 'VOLUNTEER' && (
                       <>
                         <button className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center font-semibold text-gray-700">
                           <MapPin className="mx-auto mb-2 text-emerald-500"/> Map
                         </button>
                         <button className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center font-semibold text-gray-700">
                           <Phone className="mx-auto mb-2 text-emerald-500"/> 911
                         </button>
                       </>
                    )}
                    {user.role === 'ADMIN' && (
                       <>
                         <button onClick={() => setView('USERS')} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center font-semibold text-gray-700 col-span-2">
                           <Users className="mx-auto mb-2 text-slate-800"/> Manage Users
                         </button>
                       </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}