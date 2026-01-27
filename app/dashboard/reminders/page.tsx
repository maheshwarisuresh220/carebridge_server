'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, orderBy, limit, onSnapshot, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Bell, Clock, Pill, Utensils, Trash2, Send, MessageSquare, CheckCircle2, User, ChevronDown, ShieldAlert, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RemindersPage() {
  const auth = useAuth();
  const user = auth?.user; 

  const [reminders, setReminders] = useState<any[]>([]);
  const [elders, setElders] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // --- 1. SMART FETCH (Role-Based Privacy) ---
  useEffect(() => {
    if (!user) return;

    let q;
    const remindersRef = collection(db, 'reminders');

    if (user.role === 'ADMIN') {
        q = query(remindersRef, orderBy('timestamp', 'desc'), limit(50));
    } 
    else if (user.role === 'ELDER') {
        q = query(remindersRef, where('toId', '==', user.id), orderBy('timestamp', 'desc'), limit(50));
    } 
    else if (user.role === 'FAMILY') {
        if (user.pairedElderId) {
            q = query(remindersRef, where('toId', '==', user.pairedElderId), orderBy('timestamp', 'desc'), limit(50));
        } else {
            setReminders([]); 
            return;
        }
    } else {
        return; 
    }

    const unsub = onSnapshot(q, snap => setReminders(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, 
        ...data, 
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
      };
    })));
    return () => unsub();
  }, [user]);

  // --- 2. FETCH ELDERS (Context Aware) ---
  useEffect(() => {
    const fetchElders = async () => {
      if (!user) return;

      if (user.role === 'ADMIN') {
          const q = query(collection(db, 'users'), where('role', '==', 'ELDER'));
          const snap = await getDocs(q);
          setElders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } 
      else if (user.role === 'FAMILY' && user.pairedElderId) {
          const q = query(collection(db, 'users'), where('role', '==', 'ELDER'));
          const snap = await getDocs(q);
          const allElders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setElders(allElders.filter(e => e.id === user.pairedElderId));
      }
    };
    fetchElders();
  }, [user]);

  // --- 3. SEND REMINDER (UPDATED WITH WHATSAPP) ---
  const sendReminder = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    
    const form = e.target;
    const targetId = form.targetElder.value;
    const message = form.message.value;
    const type = form.type.value; // MEDS, FOOD, OTHER
    
    // Find Elder Data
    const selectedElder = elders.find(e => e.id === targetId);
    const targetName = selectedElder ? selectedElder.name : 'Unknown';
    const targetPhone = selectedElder ? selectedElder.contact : ''; // Ensure your User object has 'contact' field

    try {
        // A. Send to WhatsApp API (Server Route)
        if (targetPhone) {
            await fetch('/api/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: targetPhone,        // Elder's Phone Number
                    type: type,             // Template Type (MEDS, FALL, SOS, etc.)
                    patientName: targetName,
                    extraData: message      // The specific message (e.g., "Take Insulin")
                })
            });
        } else {
            console.warn("Elder has no phone number. WhatsApp skipped.");
        }

        // B. Save to Firestore (Visual Log)
        await addDoc(collection(db, 'reminders'), {
          from: user.name,
          toId: targetId,
          toName: targetName,
          message: message,
          type: type,
          timestamp: new Date()
        });
        
        form.reset();
        alert("Reminder Sent Successfully!");

    } catch (error) {
        console.error("Sending Failed:", error);
        alert("Failed to send reminder. Check console.");
    } finally {
        setSending(false);
    }
  };

  const deleteReminder = async (id: string) => {
    if(confirm('Permanently delete this reminder?')) await deleteDoc(doc(db, 'reminders', id));
  };

  // --- HELPER: CARD STYLES ---
  const getCardStyle = (type: string) => {
    switch(type) {
        case 'MEDS': return 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100/50';
        case 'FOOD': return 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50';
        default: return 'bg-blue-50 border-blue-100 text-blue-900 shadow-blue-100/50';
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
        case 'MEDS': return <Pill size={24} className="text-rose-600"/>;
        case 'FOOD': return <Utensils size={24} className="text-emerald-600"/>;
        default: return <Bell size={24} className="text-blue-600"/>;
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-amber-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50">
            <Clock size={32} className="text-amber-500"/>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daily Reminders</h1>
            <p className="text-slate-500 font-medium">Schedule alerts for {user.role === 'ELDER' ? 'you' : 'elderly care'}</p>
          </div>
        </div>
        
        {/* Context Badge for Family */}
        {user.role === 'FAMILY' && user.pairedElderId && (
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <User size={16}/> Paired Elder ID: #{user.pairedElderId.slice(0,4)}...
            </div>
        )}
      </div>

      {/* --- SEND REMINDER BAR (Hidden for ELDER) --- */}
      {(user.role === 'FAMILY' || user.role === 'ADMIN') && (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-amber-500/10 border border-slate-100 relative overflow-visible z-10">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-[2.5rem]"></div>
          
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800">
            <MessageSquare size={20} className="text-amber-500"/> Send New Alert
          </h2>

          <form onSubmit={sendReminder} className="flex flex-col lg:flex-row gap-4 items-stretch">
            
            {/* 1. TYPE SELECTOR */}
            <div className="relative min-w-[140px] group">
                <select name="type" className="w-full h-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-amber-400 outline-none font-bold text-slate-600 appearance-none cursor-pointer transition-all pr-10">
                    <option value="MEDS">Medicine</option>
                    <option value="FOOD">Food</option>
                    <option value="OTHER">General</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-500 transition-colors"/>
            </div>

            {/* 2. TARGET ELDER SELECTOR (Auto-locked for Family) */}
            <div className="relative min-w-[220px] group">
                <select 
                    name="targetElder" 
                    required 
                    // If Family, lock the selection to paired elder automatically
                    defaultValue={user.role === 'FAMILY' ? user.pairedElderId : ''}
                    className="w-full h-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-amber-400 outline-none font-bold text-slate-600 appearance-none cursor-pointer transition-all pr-10"
                >
                    {user.role === 'ADMIN' && <option value="" disabled selected>Select Target Elder</option>}
                    {elders.map(elder => (
                        <option key={elder.id} value={elder.id}>
                            {elder.name} {user.role === 'ADMIN' ? `(${elder.email})` : ''}
                        </option>
                    ))}
                    {elders.length === 0 && <option disabled>No Elders Found</option>}
                </select>
                <User size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-500 transition-colors"/>
            </div>
            
            {/* 3. MESSAGE INPUT */}
            <input 
                name="message" 
                placeholder="e.g. Don't forget your 2pm insulin..." 
                required 
                autoComplete="off"
                className="flex-1 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-amber-400 outline-none font-medium text-slate-700 placeholder-slate-400 transition-all" 
            />
            
            <button 
                disabled={sending || elders.length === 0}
                className="bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {sending ? <>Sending <Loader2 size={18} className="animate-spin"/></> : <>Send <Send size={18}/></>}
            </button>
          </form>
        </div>
      )}

      {/* --- REMINDERS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reminders.map(rem => (
          <div key={rem.id} className={`p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative group flex flex-col justify-between h-full ${getCardStyle(rem.type)}`}>
              
              {/* DELETE BUTTON: Visible for Admin OR Family */}
              {(user.role === 'ADMIN' || user.role === 'FAMILY') && (
                <button 
                    onClick={() => deleteReminder(rem.id)} 
                    className="absolute top-4 right-4 p-2 bg-white/40 hover:bg-white text-slate-400 hover:text-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-20"
                    title="Delete Reminder"
                >
                    <Trash2 size={16}/>
                </button>
              )}

              <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm">
                    {getIcon(rem.type)}
                  </div>
                  <div>
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-60">
                        {rem.type === 'MEDS' ? 'Medical Alert' : rem.type === 'FOOD' ? 'Dietary Alert' : 'General Alert'}
                      </span>
                      <p className="text-xs font-bold opacity-80 mt-0.5">{formatDistanceToNow(rem.timestamp, {addSuffix: true})}</p>
                  </div>
              </div>

              <div className="bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/20 mb-4 flex-1">
                <p className="font-bold text-lg leading-snug">{rem.message}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold opacity-70 border-t border-black/5 pt-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14}/> From: {rem.from}
                  </div>
                  {rem.toName && (
                    <div className="flex items-center gap-1.5 bg-white/30 px-2 py-1 rounded-md ml-auto">
                        <User size={12}/> To: {rem.toName.split(' ')[0]}
                    </div>
                  )}
              </div>
          </div>
        ))}
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-20 text-slate-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="mt-2 font-medium">No active reminders found.</p>
            {user.role === 'FAMILY' && !user.pairedElderId && (
                <p className="text-sm text-red-400 mt-1 flex items-center justify-center gap-2">
                    <ShieldAlert size={14}/> Your account is not paired with an Elder yet.
                </p>
            )}
        </div>
      )}

    </div>
  );
}