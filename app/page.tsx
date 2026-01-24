'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, addDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { formatDistanceToNow } from 'date-fns';
import { 
  ShieldAlert, CheckCircle2, Activity, Battery, Signal, 
  MapPin, Phone, Pill, UserPlus, LogOut, Lock, 
  User, Users, Bell, ChevronRight, Trash2, Stethoscope, 
  FileText, Clock, Utensils, HeartPulse, Thermometer
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

interface MedicalRecord {
  id: string;
  doctorName: string;
  patientName: string; // New Field
  bp: string;          // New Field
  sugar: string;       // New Field
  pulse: string;       // New Field
  medication: string;
  dosage: string;
  notes: string;
  timestamp: Date;
}

interface Reminder {
  id: string;
  from: string;
  message: string;
  type: 'MEDS' | 'FOOD' | 'OTHER';
  timestamp: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FAMILY' | 'VOLUNTEER' | 'DOCTOR' | 'ELDER';
  password?: string;
}

type ViewState = 'DASHBOARD' | 'USERS' | 'MEDICAL' | 'REMINDERS';

// --- THEME CONFIGURATION ---
const ROLE_THEMES = {
  ADMIN: { 
    color: 'bg-blue-700', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-600 to-blue-800', label: 'Administrator'
  },
  FAMILY: { 
    color: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-700', label: 'Family Member'
  },
  VOLUNTEER: { 
    color: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-700', label: 'Volunteer Responder'
  },
  DOCTOR: { 
    color: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200', gradient: 'from-cyan-500 to-cyan-700', label: 'Medical Professional'
  },
  ELDER: { 
    color: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-400 to-amber-600', label: 'Elderly User'
  }
};

export default function CareBridgeProfessional() {
  const [user, setUser] = useState<UserProfile | null>(null);

  // --- LOGIN SCREEN ---
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
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('User not found in database.');
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
        setError('Database connection failed.');
        console.error(err);
      }
      setIsLoggingIn(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 relative overflow-hidden">
           <div className="text-center mb-10">
             <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-blue-500/30 transform rotate-3">
               <Activity size={40} />
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tighter">CareBridge</h1>
             <p className="text-gray-500 mt-2 font-medium">Next-Gen Safety Monitor</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-5">
             <div>
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Identity</label>
               <input 
                 type="text" 
                 placeholder="Username"
                 className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-gray-700 placeholder-gray-300"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
               />
             </div>

             <div>
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Secure Key</label>
               <input 
                 type="password" 
                 placeholder="••••••••"
                 className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-gray-700 placeholder-gray-300"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
             </div>

             {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-3"><ShieldAlert size={18} /> {error}</div>}

             <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2 mt-4">
               {isLoggingIn ? 'Verifying...' : 'Access Dashboard'} <ChevronRight size={20} />
             </button>
           </form>
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
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [systemStatus, setSystemStatus] = useState<'SAFE' | 'DANGER'>('SAFE');
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [processing, setProcessing] = useState(false);

  const theme = ROLE_THEMES[user.role];

  // --- DATA FETCHING ---
  useEffect(() => {
    // 1. Alerts
    const qAlerts = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(25));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const newAlerts = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as Alert));
      setAlerts(newAlerts);
      
      const active = newAlerts.find(a => !a.resolved && (new Date().getTime() - a.timestamp.getTime()) / 60000 < 5);
      setSystemStatus(active ? 'DANGER' : 'SAFE');
    });

    // 2. Medical Records
    const qMedical = query(collection(db, 'medical'), orderBy('timestamp', 'desc'), limit(10));
    const unsubMedical = onSnapshot(qMedical, (snapshot) => {
      setMedicalRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() } as MedicalRecord)));
    });

    // 3. Reminders
    const qReminders = query(collection(db, 'reminders'), orderBy('timestamp', 'desc'), limit(10));
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() } as Reminder)));
    });

    return () => { unsubAlerts(); unsubMedical(); unsubReminders(); };
  }, []);

  // --- ACTIONS ---
  const resolveAlert = async (id: string) => {
    setProcessing(true);
    await updateDoc(doc(db, "alerts", id), { resolved: true, resolvedBy: user.name, status: `Resolved by ${user.name}` });
    setProcessing(false);
  };

  const deleteAlert = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this log?')) {
      await deleteDoc(doc(db, "alerts", id));
    }
  };

  const addMedicalRecord = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    await addDoc(collection(db, 'medical'), {
      doctorName: user.name,
      patientName: form.patientName.value,
      bp: form.bp.value,
      sugar: form.sugar.value,
      pulse: form.pulse.value,
      medication: form.medication.value,
      dosage: form.dosage.value,
      notes: form.notes.value,
      timestamp: new Date()
    });
    form.reset();
    alert('Medical Record Saved Successfully');
  };

  const sendReminder = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    await addDoc(collection(db, 'reminders'), {
      from: user.name,
      message: form.message.value,
      type: form.type.value,
      timestamp: new Date()
    });
    form.reset();
    alert('Reminder Sent to Elder');
  };

  const addUser = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    await addDoc(collection(db, 'users'), {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value
    });
    form.reset();
    alert('User Created');
  };

  // --- SUB-VIEWS ---

  const MedicalPanel = () => (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-cyan-50 text-cyan-600 rounded-2xl"><Stethoscope size={28} /></div>
        <div><h2 className="text-2xl font-bold text-gray-900">Medical Center</h2><p className="text-gray-500">Prescriptions & Vitals Log</p></div>
      </div>

      {user.role === 'DOCTOR' && (
        <form onSubmit={addMedicalRecord} className="mb-8 bg-cyan-50 p-6 rounded-3xl border border-cyan-100">
          <h3 className="font-bold text-cyan-800 mb-4 flex items-center gap-2"><UserPlus size={18}/> New Clinical Entry</h3>
          
          <div className="space-y-4">
            {/* Patient Info & Vitals Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <input name="patientName" placeholder="Patient Name" required className="md:col-span-1 p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" />
               <div className="relative"><Activity size={16} className="absolute left-3 top-3.5 text-gray-400"/><input name="bp" placeholder="BP (e.g. 120/80)" className="w-full pl-9 p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" /></div>
               <div className="relative"><Utensils size={16} className="absolute left-3 top-3.5 text-gray-400"/><input name="sugar" placeholder="Sugar (mg/dL)" className="w-full pl-9 p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" /></div>
               <div className="relative"><HeartPulse size={16} className="absolute left-3 top-3.5 text-gray-400"/><input name="pulse" placeholder="Pulse (BPM)" className="w-full pl-9 p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" /></div>
            </div>

            {/* Prescription Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="medication" placeholder="Medication Name" required className="p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" />
              <input name="dosage" placeholder="Dosage (e.g. 2x Daily)" required className="p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <textarea name="notes" placeholder="Doctor's Clinical Notes & Instructions" className="w-full p-3 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 h-24"></textarea>
            
            <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 rounded-xl hover:bg-cyan-700 transition shadow-lg shadow-cyan-200">Save Clinical Record</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {medicalRecords.map(rec => (
          <div key={rec.id} className="bg-white border border-gray-100 rounded-2xl hover:border-cyan-200 transition shadow-sm overflow-hidden">
             {/* Header with Patient Name & Timestamp */}
             <div className="bg-gray-50 px-5 py-3 flex justify-between items-center border-b border-gray-100">
                <span className="font-bold text-gray-700 flex items-center gap-2"><User size={16}/> {rec.patientName}</span>
                <span className="text-xs font-bold text-gray-400">{formatDistanceToNow(rec.timestamp)} ago</span>
             </div>
             
             <div className="p-5">
               {/* Vitals Strip */}
               <div className="flex gap-4 mb-4 text-sm">
                 <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1"><Activity size={14}/> BP: {rec.bp || 'N/A'}</div>
                 <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1"><Utensils size={14}/> GLU: {rec.sugar || 'N/A'}</div>
                 <div className="bg-pink-50 text-pink-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1"><HeartPulse size={14}/> HR: {rec.pulse || 'N/A'}</div>
               </div>

               <div className="flex gap-4 items-start">
                 <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg shrink-0"><Pill size={24}/></div>
                 <div>
                   <h4 className="font-bold text-gray-900 text-lg">{rec.medication} <span className="text-sm font-normal text-gray-500">({rec.dosage})</span></h4>
                   <p className="text-gray-600 mt-2 italic">"{rec.notes}"</p>
                   <p className="text-xs font-bold text-cyan-600 mt-3 flex items-center gap-1"><Stethoscope size={12}/> Prescribed by Dr. {rec.doctorName}</p>
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ReminderPanel = () => (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={28} /></div>
        <div><h2 className="text-2xl font-bold text-gray-900">Daily Reminders</h2><p className="text-gray-500">Alerts for the Elder</p></div>
      </div>

      {user.role === 'FAMILY' && (
        <form onSubmit={sendReminder} className="mb-8 bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><Bell size={18}/> Send New Reminder</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <select name="type" className="p-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
              <option value="MEDS">Take Medicine</option>
              <option value="FOOD">Eat Food</option>
              <option value="OTHER">General</option>
            </select>
            <input name="message" placeholder="Message (e.g. Lunch is in the fridge)" required className="flex-1 p-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition">Send</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reminders.map(rem => (
          <div key={rem.id} className={`p-6 rounded-3xl border flex items-center gap-4 ${rem.type === 'MEDS' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
             <div className="p-3 bg-white/50 rounded-full">{rem.type === 'MEDS' ? <Pill /> : <Utensils />}</div>
             <div>
               <p className="font-bold text-lg">{rem.message}</p>
               <p className="text-xs opacity-70 mt-1">From {rem.from} • {formatDistanceToNow(rem.timestamp)} ago</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const UserPanel = () => (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
       <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
       <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-8 rounded-3xl">
          <input name="name" placeholder="Full Name" required className="p-4 rounded-xl border-none" />
          <input name="email" placeholder="Login ID" required className="p-4 rounded-xl border-none" />
          <input name="password" placeholder="Password" required className="p-4 rounded-xl border-none" />
          <select name="role" className="p-4 rounded-xl border-none">
             <option value="FAMILY">Family</option>
             <option value="VOLUNTEER">Volunteer</option>
             <option value="DOCTOR">Doctor</option>
             <option value="ELDER">Elder</option>
             <option value="ADMIN">Admin</option>
          </select>
          <button className="md:col-span-2 bg-black text-white font-bold py-4 rounded-xl">Create User</button>
       </form>
    </div>
  );

  // --- MAIN LAYOUT ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900">
      <nav className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className={`${theme.color} text-white p-2.5 rounded-xl shadow-lg`}><Activity size={24} /></div>
             <div>
               <h1 className="text-xl font-bold text-gray-900 tracking-tight">CareBridge</h1>
               <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${systemStatus === 'SAFE' ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{systemStatus}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
             <div className="hidden md:flex bg-gray-100 p-1.5 rounded-xl">
               <button onClick={() => setView('DASHBOARD')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'DASHBOARD' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Monitor</button>
               {(user.role === 'DOCTOR' || user.role === 'ELDER') && <button onClick={() => setView('MEDICAL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'MEDICAL' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Medical</button>}
               {(user.role === 'FAMILY' || user.role === 'ELDER') && <button onClick={() => setView('REMINDERS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'REMINDERS' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Reminders</button>}
               {user.role === 'ADMIN' && <button onClick={() => setView('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'USERS' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Users</button>}
             </div>
             <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
               <div className="text-right hidden md:block"><p className="text-sm font-bold text-gray-900">{user.name}</p><p className="text-xs text-gray-500 font-bold">{theme.label}</p></div>
               <button onClick={onLogout} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><LogOut size={20} /></button>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {view === 'MEDICAL' && <MedicalPanel />}
        {view === 'REMINDERS' && <ReminderPanel />}
        {view === 'USERS' && <UserPanel />}
        
        {view === 'DASHBOARD' && (
          <>
            {/* HERO STATUS */}
            <div className={`relative overflow-hidden rounded-[2.5rem] p-10 text-white shadow-2xl transition-all duration-700 ${systemStatus === 'SAFE' ? `bg-gradient-to-br ${theme.gradient}` : 'bg-gradient-to-br from-red-600 to-rose-700'}`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest mb-6"><Signal size={14} /> System Active</div>
                  <h2 className="text-6xl font-black tracking-tighter mb-4">{systemStatus === 'SAFE' ? 'ALL CLEAR' : 'EMERGENCY'}</h2>
                  <p className="text-xl opacity-90 font-medium">{systemStatus === 'SAFE' ? 'Monitoring active. Vital signs normal.' : 'Critical fall detected. Response required.'}</p>
                </div>
                <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center ${systemStatus === 'SAFE' ? 'border-white/20' : 'border-red-400/30'}`}>
                   <div className="w-28 h-28 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md">{systemStatus === 'SAFE' ? <HeartPulse size={56} /> : <ShieldAlert size={56} className="animate-pulse" />}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ALERTS FEED */}
              <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-xl text-gray-900">Live Activity Feed</h3><span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500">REAL-TIME</span></div>
                <div className="divide-y divide-gray-50">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-6 flex items-start gap-5 hover:bg-gray-50 transition ${alert.resolved ? 'opacity-60' : ''}`}>
                      <div className={`mt-1 p-4 rounded-2xl ${alert.resolved ? 'bg-gray-100 text-gray-400' : alert.status.includes('Emergency') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                         {alert.status.includes('Emergency') ? <ShieldAlert size={24} /> : <Activity size={24} />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <h4 className="font-bold text-gray-900 text-lg">{alert.status}</h4>
                           <div className="flex gap-2">
                             {user.role === 'ADMIN' && <button onClick={() => deleteAlert(alert.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={18} /></button>}
                             <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{formatDistanceToNow(alert.timestamp)} ago</span>
                           </div>
                         </div>
                         <p className="text-sm text-gray-500 mt-2 flex items-center gap-2"><MapPin size={14} /> {alert.device}</p>
                         {!alert.resolved && systemStatus === 'DANGER' && (
                           <button onClick={() => resolveAlert(alert.id)} disabled={processing} className={`mt-4 px-6 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition active:scale-95 ${theme.color}`}>
                             {user.role === 'VOLUNTEER' ? 'Accept Rescue Mission' : 'Mark Resolved'}
                           </button>
                         )}
                         {alert.resolvedBy && <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full"><CheckCircle2 size={14} /> Handled by {alert.resolvedBy}</div>}
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div className="p-12 text-center text-gray-400">No recent activity found.</div>}
                </div>
              </div>

              {/* SIDEBAR */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-6 text-lg">System Status</h3>
                  <div className="space-y-6">
                     <div><div className="flex justify-between mb-2 text-sm font-bold text-gray-500"><span>Battery</span><span className="text-green-600">98%</span></div><div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden"><div className="bg-green-500 w-[98%] h-full"></div></div></div>
                     <div><div className="flex justify-between mb-2 text-sm font-bold text-gray-500"><span>Signal</span><span className="text-blue-600">Excellent</span></div><div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden"><div className="bg-blue-500 w-[85%] h-full"></div></div></div>
                  </div>
                </div>
                {(user.role === 'DOCTOR' || user.role === 'ELDER') && <div onClick={() => setView('MEDICAL')} className="bg-cyan-50 p-8 rounded-[2rem] border border-cyan-100 cursor-pointer hover:shadow-lg transition"><h3 className="font-bold text-cyan-800 text-lg mb-2">Medical Center</h3><p className="text-cyan-600 text-sm">View or add prescriptions and medical notes.</p></div>}
                {(user.role === 'FAMILY' || user.role === 'ELDER') && <div onClick={() => setView('REMINDERS')} className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 cursor-pointer hover:shadow-lg transition"><h3 className="font-bold text-indigo-800 text-lg mb-2">Daily Reminders</h3><p className="text-indigo-600 text-sm">Manage medication and food schedules.</p></div>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}