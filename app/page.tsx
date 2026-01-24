'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, addDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { formatDistanceToNow } from 'date-fns';
import { 
  ShieldAlert, CheckCircle2, Activity, Battery, Signal, 
  MapPin, Phone, Pill, UserPlus, LogOut, Lock, 
  User, Users, Bell, ChevronRight, Trash2, Stethoscope, 
  FileText, Clock, Utensils, HeartPulse, RefreshCw, Link as LinkIcon
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
  patientName: string;
  bp: string;
  sugar: string;
  pulse: string;
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
  pairedElderId?: string; 
  location?: { lat: number, lng: number, address: string };
}

type ViewState = 'DASHBOARD' | 'USERS' | 'MEDICAL' | 'REMINDERS';

// --- THEME CONFIGURATION ---
const ROLE_THEMES = {
  ADMIN: { color: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-600 to-indigo-700', label: 'Administrator' },
  FAMILY: { color: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50', border: 'border-violet-100', gradient: 'from-violet-500 to-purple-700', label: 'Family Member' },
  VOLUNTEER: { color: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-100', gradient: 'from-emerald-500 to-teal-700', label: 'Volunteer Responder' },
  DOCTOR: { color: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-100', gradient: 'from-cyan-500 to-blue-600', label: 'Medical Professional' },
  ELDER: { color: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-100', gradient: 'from-amber-400 to-orange-600', label: 'Elderly User' }
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
        setError('Connection error.');
        console.error(err);
      }
      setIsLoggingIn(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/50 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
           <div className="text-center mb-10">
             <div className="bg-gradient-to-tr from-blue-600 to-violet-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-blue-500/20 transform rotate-3">
               <Activity size={40} />
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tighter">CareBridge</h1>
             <p className="text-gray-500 mt-2 font-medium">Enterprise Safety Monitor</p>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
             <div className="group">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Identity</label>
               <input type="text" placeholder="Username" className="w-full px-5 py-4 bg-gray-50/50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-gray-700" value={email} onChange={(e) => setEmail(e.target.value)} />
             </div>
             <div className="group">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Secure Key</label>
               <input type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50/50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-gray-700" value={password} onChange={(e) => setPassword(e.target.value)} />
             </div>
             {error && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2"><ShieldAlert size={18} /> {error}</div>}
             <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 mt-2">{isLoggingIn ? 'Verifying...' : 'Access Dashboard'} <ChevronRight size={20} /></button>
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
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [eldersList, setEldersList] = useState<UserProfile[]>([]);
  const [pairedElder, setPairedElder] = useState<UserProfile | null>(null);
  
  const [systemStatus, setSystemStatus] = useState<'SAFE' | 'DANGER'>('SAFE');
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [processing, setProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const theme = ROLE_THEMES[user.role];

  // --- REFRESH ---
  const refreshData = () => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1000); };

  // --- HELPER: GET ELDER NAME ---
  const getElderName = (elderId?: string) => {
    if (!elderId) return null;
    const found = eldersList.find(e => e.id === elderId);
    return found ? found.name : 'Unknown Elder';
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    // 1. FETCH USERS
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsersList(allUsers);
      const elders = allUsers.filter(u => u.role === 'ELDER');
      setEldersList(elders);

      if (user.role === 'FAMILY' && user.pairedElderId) {
        const myElder = elders.find(e => e.id === user.pairedElderId);
        setPairedElder(myElder || null);
      }
      if (user.role === 'ELDER') {
        setPairedElder(user); 
      }
    });

    // 2. ALERTS
    const qAlerts = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(50));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const newAlerts = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateObj = new Date();
        if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
        else if (data.timestamp instanceof Date) dateObj = data.timestamp;
        
        return { id: doc.id, ...data, timestamp: dateObj } as Alert;
      });

      const visibleAlerts = (user.role === 'FAMILY' && user.pairedElderId) 
        ? newAlerts.filter(a => a.device === (pairedElder?.name || 'Unknown') || a.device === 'ESP32-Wokwi')
        : newAlerts;

      setAlerts(visibleAlerts);
      const active = visibleAlerts.find(a => !a.resolved && (new Date().getTime() - a.timestamp.getTime()) / 60000 < 5);
      setSystemStatus(active ? 'DANGER' : 'SAFE');
    });

    // 3. MEDICAL
    const qMedical = query(collection(db, 'medical'), orderBy('timestamp', 'desc'), limit(20));
    const unsubMedical = onSnapshot(qMedical, (snapshot) => {
      setMedicalRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() } as MedicalRecord)));
    });

    // 4. REMINDERS
    const qReminders = query(collection(db, 'reminders'), orderBy('timestamp', 'desc'), limit(20));
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() } as Reminder)));
    });

    return () => { unsubUsers(); unsubAlerts(); unsubMedical(); unsubReminders(); };
  }, [user.role, user.pairedElderId, pairedElder?.name]);

  // --- ACTIONS ---
  const resolveAlert = async (id: string) => {
    setProcessing(true);
    await updateDoc(doc(db, "alerts", id), { resolved: true, resolvedBy: user.name, status: `Resolved by ${user.name}` });
    setProcessing(false);
  };

  const deleteRecord = async (collectionName: string, id: string) => {
    if (confirm('ADMIN ACTION: Permanently delete this record?')) {
      await deleteDoc(doc(db, collectionName, id));
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
    alert('Record Saved');
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
    alert('Reminder Sent');
  };

  const addUser = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    const newUser: any = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value
    };
    if (form.role.value === 'FAMILY' && form.pairedElder.value) newUser.pairedElderId = form.pairedElder.value;
    if (form.role.value === 'ELDER') newUser.location = { lat: 24.8607, lng: 67.0011, address: 'Karachi, Central District' };

    await addDoc(collection(db, 'users'), newUser);
    form.reset();
    alert('User Created Successfully');
  };

  // --- SUB-VIEWS ---

  const LocationMap = () => {
    const targetElder = user.role === 'FAMILY' ? pairedElder : eldersList.find(e => e.location);
    if (!targetElder || !targetElder.location) return null;

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl animate-pulse"><MapPin size={24}/></div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Live Tracking</h3>
                        <p className="text-gray-500 text-sm">Tracking: <span className="font-bold text-gray-800">{targetElder.name}</span></p>
                    </div>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-full animate-ping"></span> GPS ACTIVE</div>
            </div>
            <div className="relative w-full h-64 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/67.0011,24.8607,14,0,0/800x400?access_token=YOUR_KEY')] bg-cover bg-center">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="relative z-10 flex flex-col items-center animate-bounce">
                    <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg mb-1 whitespace-nowrap">{targetElder.name} is here</div>
                    <MapPin size={48} className="text-red-600 drop-shadow-xl fill-red-600" />
                    <div className="w-4 h-1 bg-black/20 rounded-full blur-sm mt-1"></div>
                </div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-mono border border-gray-200 shadow-sm">LAT: {targetElder.location.lat.toFixed(4)} • LNG: {targetElder.location.lng.toFixed(4)}</div>
            </div>
            <p className="mt-4 text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> Current Address: <span className="text-gray-900 font-medium">{targetElder.location.address}</span></p>
        </div>
    );
  };

  const UserManagementPanel = () => (
    <div className="space-y-8">
       <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gray-100 text-gray-600 rounded-2xl"><Users size={28} /></div>
            <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
          </div>
          <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/80 p-8 rounded-[2rem] border border-gray-100">
             <input name="name" placeholder="Full Name" required className="p-4 rounded-xl border-none focus:ring-2 focus:ring-gray-400" />
             <input name="email" placeholder="Login ID" required className="p-4 rounded-xl border-none focus:ring-2 focus:ring-gray-400" />
             <input name="password" placeholder="Password" required className="p-4 rounded-xl border-none focus:ring-2 focus:ring-gray-400" />
             <div className="space-y-3">
                 <select name="role" className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-gray-400">
                    <option value="FAMILY">Family Member</option>
                    <option value="ELDER">Elderly User</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                 </select>
                 <select name="pairedElder" className="w-full p-4 rounded-xl border-2 border-indigo-100 text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-400">
                     <option value="">-- Select Elder to Pair (Family Only) --</option>
                     {eldersList.map(elder => (<option key={elder.id} value={elder.id}>{elder.name} ({elder.email})</option>))}
                 </select>
             </div>
             <button className="md:col-span-2 bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-xl">Create Account</button>
          </form>
       </div>

       <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
           <h3 className="font-bold text-xl mb-6">Existing Users</h3>
           <div className="divide-y divide-gray-100">
               {usersList.map(u => {
                   const pairedName = getElderName(u.pairedElderId);
                   return (
                       <div key={u.id} className="py-4 flex justify-between items-center group">
                           <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${ROLE_THEMES[u.role].color}`}>{u.role[0]}</div>
                               <div>
                                   <p className="font-bold text-gray-900">{u.name}</p>
                                   <p className="text-xs text-gray-500">
                                       {u.role} 
                                       {pairedName && <span className="ml-2 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Linked to: {pairedName}</span>}
                                   </p>
                               </div>
                           </div>
                           <button onClick={() => deleteRecord('users', u.id)} className="p-2 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-100" title="Delete User"><Trash2 size={16} /></button>
                       </div>
                   );
               })}
           </div>
       </div>
    </div>
  );

  const MedicalPanel = () => (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8 border-b border-gray-50 pb-6">
        <div className="p-4 bg-cyan-50 text-cyan-600 rounded-2xl shadow-sm"><Stethoscope size={28} /></div>
        <div><h2 className="text-2xl font-bold text-gray-900">Medical Center</h2><p className="text-gray-500 font-medium">Patient Vitals & History</p></div>
      </div>
      {user.role === 'DOCTOR' && (
        <form onSubmit={addMedicalRecord} className="mb-8 bg-cyan-50/50 p-8 rounded-[2rem] border border-cyan-100/50">
          <h3 className="font-bold text-cyan-900 mb-6 flex items-center gap-2 text-lg"><UserPlus size={20}/> Clinical Entry</h3>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <input name="patientName" placeholder="Patient Name" required className="md:col-span-1 p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" />
               <div className="relative"><Activity size={18} className="absolute left-4 top-4 text-gray-400"/><input name="bp" placeholder="BP" className="w-full pl-12 p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" /></div>
               <div className="relative"><Utensils size={18} className="absolute left-4 top-4 text-gray-400"/><input name="sugar" placeholder="Sugar" className="w-full pl-12 p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" /></div>
               <div className="relative"><HeartPulse size={18} className="absolute left-4 top-4 text-gray-400"/><input name="pulse" placeholder="Pulse" className="w-full pl-12 p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="medication" placeholder="Medication Name" required className="p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" />
              <input name="dosage" placeholder="Dosage" required className="p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 bg-white shadow-sm" />
            </div>
            <textarea name="notes" placeholder="Clinical Notes..." className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 h-28 bg-white shadow-sm resize-none"></textarea>
            <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-4 rounded-xl hover:bg-cyan-700 transition-all shadow-lg">Save Clinical Record</button>
          </div>
        </form>
      )}
      <div className="space-y-4">
        {medicalRecords.map(rec => (
          <div key={rec.id} className="bg-white border border-gray-100 rounded-3xl hover:border-cyan-200 transition-all hover:shadow-md overflow-hidden group relative">
             {user.role === 'ADMIN' && <button onClick={() => deleteRecord('medical', rec.id)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>}
             <div className="bg-gray-50/50 px-6 py-4 flex justify-between items-center border-b border-gray-50">
                <span className="font-bold text-gray-800 flex items-center gap-2"><User size={18} className="text-gray-400"/> {rec.patientName}</span>
                <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded-md shadow-sm">{formatDistanceToNow(rec.timestamp)} ago</span>
             </div>
             <div className="p-6">
               <div className="flex flex-wrap gap-3 mb-5">
                 <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2"><Activity size={14}/> BP: {rec.bp || '--'}</div>
                 <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2"><Utensils size={14}/> GLU: {rec.sugar || '--'}</div>
                 <div className="bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2"><HeartPulse size={14}/> HR: {rec.pulse || '--'}</div>
               </div>
               <div className="flex gap-5 items-start">
                 <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl shrink-0"><Pill size={24}/></div>
                 <div>
                   <h4 className="font-bold text-gray-900 text-lg">{rec.medication} <span className="text-sm font-normal text-gray-500 ml-1">({rec.dosage})</span></h4>
                   <p className="text-gray-600 mt-2 leading-relaxed text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">"{rec.notes}"</p>
                   <p className="text-xs font-bold text-cyan-600 mt-3 flex items-center gap-1.5"><Stethoscope size={14}/> Dr. {rec.doctorName}</p>
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ReminderPanel = () => (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-sm"><Clock size={28} /></div>
        <div><h2 className="text-2xl font-bold text-gray-900">Daily Reminders</h2><p className="text-gray-500 font-medium">Alerts for the Elder</p></div>
      </div>
      {user.role === 'FAMILY' && (
        <form onSubmit={sendReminder} className="mb-8 bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100/50">
          <h3 className="font-bold text-indigo-900 mb-6 flex items-center gap-2 text-lg"><Bell size={20}/> Send Alert to {pairedElder ? pairedElder.name : 'Elder'}</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <select name="type" className="p-4 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-medium text-gray-700">
              <option value="MEDS">Take Medicine</option>
              <option value="FOOD">Eat Food</option>
              <option value="OTHER">General</option>
            </select>
            <input name="message" placeholder="Message..." required className="flex-1 p-4 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" />
            <button type="submit" className="bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-indigo-700 transition shadow-lg">Send</button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reminders.map(rem => (
          <div key={rem.id} className={`p-6 rounded-[1.5rem] border flex items-center gap-4 transition-transform hover:-translate-y-1 relative group ${rem.type === 'MEDS' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
             {user.role === 'ADMIN' && <button onClick={() => deleteRecord('reminders', rem.id)} className="absolute top-2 right-2 p-1.5 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-white text-red-500"><Trash2 size={14}/></button>}
             <div className="p-3.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">{rem.type === 'MEDS' ? <Pill size={20}/> : <Utensils size={20}/>}</div>
             <div>
               <p className="font-bold text-lg leading-tight">{rem.message}</p>
               <p className="text-xs opacity-70 mt-1 font-medium">From {rem.from} • {formatDistanceToNow(rem.timestamp)} ago</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900">
      <nav className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className={`${theme.color} text-white p-2.5 rounded-xl shadow-lg`}><Activity size={24} /></div>
             <div>
               <h1 className="text-xl font-bold text-gray-900 tracking-tight">CareBridge</h1>
               <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStatus === 'SAFE' ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{systemStatus}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
             <div className="hidden md:flex bg-gray-100 p-1.5 rounded-xl">
               <button onClick={() => setView('DASHBOARD')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${view === 'DASHBOARD' ? 'bg-white shadow-sm scale-105 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Monitor</button>
               {(user.role === 'DOCTOR' || user.role === 'ELDER' || user.role === 'ADMIN') && <button onClick={() => setView('MEDICAL')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${view === 'MEDICAL' ? 'bg-white shadow-sm scale-105 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Medical</button>}
               {(user.role === 'FAMILY' || user.role === 'ELDER' || user.role === 'ADMIN') && <button onClick={() => setView('REMINDERS')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${view === 'REMINDERS' ? 'bg-white shadow-sm scale-105 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Reminders</button>}
               {user.role === 'ADMIN' && <button onClick={() => setView('USERS')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${view === 'USERS' ? 'bg-white shadow-sm scale-105 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Users</button>}
             </div>
             <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
               <div className="text-right hidden md:block"><p className="text-sm font-bold text-gray-900">{user.name}</p><p className="text-xs text-gray-500 font-bold">{theme.label}</p></div>
               <button onClick={onLogout} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Log Out"><LogOut size={20} /></button>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-20">
        {view === 'MEDICAL' && <MedicalPanel />}
        {view === 'REMINDERS' && <ReminderPanel />}
        {view === 'USERS' && <UserManagementPanel />}
        
        {view === 'DASHBOARD' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {(user.role === 'ADMIN' || user.role === 'VOLUNTEER' || (user.role === 'FAMILY' && pairedElder)) && <LocationMap />}

            <div className={`relative overflow-hidden rounded-[2.5rem] p-10 text-white shadow-2xl transition-all duration-700 mb-8 ${systemStatus === 'SAFE' ? `bg-gradient-to-br ${theme.gradient}` : 'bg-gradient-to-br from-red-600 to-rose-700'}`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest mb-6"><Signal size={14} /> 
                    {user.role === 'FAMILY' ? `Monitoring: ${pairedElder?.name || 'Loading...'}` : 'System Active'}
                  </div>
                  <h2 className="text-6xl font-black tracking-tighter mb-4">{systemStatus === 'SAFE' ? 'ALL CLEAR' : 'EMERGENCY'}</h2>
                  <p className="text-xl opacity-90 font-medium max-w-lg">{systemStatus === 'SAFE' ? 'Monitoring active. Neural network detecting no anomalies.' : 'Critical fall detected. Immediate response protocol initiated.'}</p>
                </div>
                <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center ${systemStatus === 'SAFE' ? 'border-white/20' : 'border-red-400/30 animate-pulse'}`}>
                   <div className="w-28 h-28 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md shadow-inner">{systemStatus === 'SAFE' ? <HeartPulse size={56} /> : <ShieldAlert size={56} className="animate-bounce" />}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-xl text-gray-900">Live Activity Feed</h3>
                    <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE</span>
                  </div>
                  <button onClick={refreshData} className={`p-2 bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 transition ${isRefreshing ? 'animate-spin' : ''}`} title="Refresh Data"><RefreshCw size={18} /></button>
                </div>
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-6 flex items-start gap-5 hover:bg-gray-50 transition-colors ${alert.resolved ? 'opacity-50 grayscale' : ''}`}>
                      <div className={`mt-1 p-4 rounded-2xl shadow-sm ${alert.resolved ? 'bg-gray-100 text-gray-400' : alert.status.includes('Emergency') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                         {alert.status.includes('Emergency') ? <ShieldAlert size={24} /> : <Activity size={24} />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <h4 className="font-bold text-gray-900 text-lg">{alert.status}</h4>
                           <div className="flex gap-2 items-center">
                             {user.role === 'ADMIN' && <button onClick={() => deleteRecord('alerts', alert.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete Alert"><Trash2 size={16} /></button>}
                             <span className="text-xs font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-md">{formatDistanceToNow(alert.timestamp)} ago</span>
                           </div>
                         </div>
                         <p className="text-sm text-gray-500 mt-2 flex items-center gap-2"><MapPin size={14} className="text-gray-300"/> {alert.device}</p>
                         {!alert.resolved && systemStatus === 'DANGER' && (
                           <div className="mt-4 animate-in slide-in-from-left-4 fade-in duration-500">
                             <button onClick={() => resolveAlert(alert.id)} disabled={processing} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition active:scale-95 hover:brightness-110 flex items-center gap-2 ${theme.color}`}>
                               {processing ? <Activity size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                               {user.role === 'VOLUNTEER' ? 'Accept Rescue Mission' : 'Mark Resolved'}
                             </button>
                           </div>
                         )}
                         {alert.resolvedBy && <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100"><CheckCircle2 size={14} /> Handled by {alert.resolvedBy}</div>}
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div className="p-16 text-center text-gray-400 flex flex-col items-center gap-4"><Activity size={40} className="opacity-20"/> <p>No activity logs found for {user.role === 'FAMILY' ? 'this elder' : 'the system'}.</p></div>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-6 text-lg">Device Health</h3>
                  <div className="space-y-6">
                     <div>
                       <div className="flex justify-between mb-2 text-sm font-bold text-gray-500"><span className="flex items-center gap-2"><Battery size={16}/> Battery</span><span className="text-green-600">98%</span></div>
                       <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden"><div className="bg-green-500 w-[98%] h-full rounded-full"></div></div>
                     </div>
                     <div>
                       <div className="flex justify-between mb-2 text-sm font-bold text-gray-500"><span className="flex items-center gap-2"><Signal size={16}/> Signal</span><span className="text-blue-600">Excellent</span></div>
                       <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden"><div className="bg-blue-500 w-[85%] h-full rounded-full"></div></div>
                     </div>
                  </div>
                </div>
                {(user.role === 'DOCTOR' || user.role === 'ELDER' || user.role === 'ADMIN') && (
                  <div onClick={() => setView('MEDICAL')} className="bg-cyan-50/50 p-8 rounded-[2.5rem] border border-cyan-100/50 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group">
                    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-cyan-600 shadow-sm mb-4 group-hover:scale-110 transition-transform"><Stethoscope size={24}/></div>
                    <h3 className="font-bold text-cyan-900 text-lg mb-1">Medical Center</h3>
                    <p className="text-cyan-600/80 text-sm">View prescriptions & vitals.</p>
                  </div>
                )}
                {(user.role === 'FAMILY' || user.role === 'ELDER' || user.role === 'ADMIN') && (
                  <div onClick={() => setView('REMINDERS')} className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100/50 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group">
                    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 group-hover:scale-110 transition-transform"><Bell size={24}/></div>
                    <h3 className="font-bold text-indigo-900 text-lg mb-1">Daily Reminders</h3>
                    <p className="text-indigo-600/80 text-sm">Manage alerts for {pairedElder ? pairedElder.name : 'Elder'}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}