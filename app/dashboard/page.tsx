'use client';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Bell, AlertTriangle, Heart, 
  Thermometer, Trash2, CheckCircle2, Stethoscope, Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const auth = useAuth();
  const user = auth?.user;

  const [sosLoading, setSosLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any>(null);

  // --- 1. FETCH REAL PATIENT VITALS (No More Random Data) ---
  useEffect(() => {
    if (!user) return;

    let targetElderId = null;

    // Determine whose data to show
    if (user.role === 'ELDER') {
        targetElderId = user.id;
    } else if (user.role === 'FAMILY') {
        targetElderId = user.pairedElderId;
    } 
    // Admins might not see a specific patient card on the main dashboard, 
    // or you could default to the first available elder. 
    // For now, we focus on Family/Elder view.

    if (targetElderId) {
        const q = query(
            collection(db, 'medical'), 
            where('patientId', '==', targetElderId),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setLatestVitals({
                    id: snap.docs[0].id,
                    ...data,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
                });
            } else {
                setLatestVitals(null);
            }
        });
        return () => unsub();
    }
  }, [user]);

  // --- 2. FETCH RECENT ALERTS ---
  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setRecentAlerts(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date()
      })));
    });
    return () => unsub();
  }, []);

  // --- 3. DELETE ALERT FUNCTION ---
  const deleteAlert = async (id: string) => {
    if (confirm("Are you sure you want to dismiss this alert?")) {
        try {
            await deleteDoc(doc(db, 'alerts', id));
        } catch (error) {
            console.error("Error deleting alert:", error);
            alert("Failed to delete alert.");
        }
    }
  };

  // --- 4. SOS TRIGGER ---
  const handleSOS = async () => {
    if (!user) return;
    if (user.role === 'ADMIN' && !confirm("You are an ADMIN. Send fake SOS test?")) return;

    setSosLoading(true);

    try {
      const userContact = (user as any).contact;
      const targetPhone = userContact || "+923001234567"; 

      await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          type: 'SOS',
          patientName: user.name,
          extraData: "Living Room (GPS: 24.8607, 67.0011)"
        })
      });

      alert("🚨 SOS Alert Sent to Family & WhatsApp!");
    } catch (error) {
      console.error(error);
      alert("Failed to send SOS.");
    } finally {
      setSosLoading(false);
    }
  };

  const simulateFall = async () => {
    if(!confirm("Simulate a FALL detection event? This will send WhatsApp alerts.")) return;
    
    const userContact = (user as any).contact;
    const targetPhone = userContact || "+923001234567";

    await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetPhone,
        type: 'FALL',
        patientName: user?.name || "Test Patient",
        extraData: "Bathroom Floor"
      })
    });
    alert("⚠️ Fall Alert Sent!");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Monitor Dashboard</h1>
          <p className="text-slate-500 font-medium">Real-time health overview for {user.name}</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={simulateFall}
                className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 flex items-center gap-2"
            >
                <Activity size={20}/> Test Fall
            </button>

            <button 
                onClick={handleSOS}
                disabled={sosLoading}
                className={`bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center gap-2 ${sosLoading ? 'opacity-70 cursor-not-allowed' : 'animate-pulse'}`}
            >
                <AlertTriangle size={24} className={sosLoading ? 'animate-spin' : ''}/> 
                {sosLoading ? 'SENDING...' : 'SOS EMERGENCY'}
            </button>
        </div>
      </div>

      {/* --- REAL PATIENT MEDICAL CARD --- */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         
         <div className="relative z-10">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-2 bg-cyan-100 text-cyan-700 rounded-xl"><Stethoscope size={24}/></div>
                Patient Status: {latestVitals ? latestVitals.patientName : 'No Data'}
            </h2>

            {latestVitals ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Vitals 1: Heart Rate */}
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <Heart size={16} className="text-rose-500"/> Pulse Rate
                        </div>
                        <div className="text-4xl font-black text-slate-800">{latestVitals.pulse} <span className="text-lg text-slate-400 font-bold">bpm</span></div>
                        <div className="mt-2 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg w-fit">
                            Live Reading
                        </div>
                    </div>

                    {/* Vitals 2: BP */}
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <Activity size={16} className="text-blue-500"/> Blood Pressure
                        </div>
                        <div className="text-4xl font-black text-slate-800">{latestVitals.bp} <span className="text-lg text-slate-400 font-bold">mmHg</span></div>
                         <div className="mt-2 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                            Normal Range
                        </div>
                    </div>

                    {/* Vitals 3: Glucose */}
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <Thermometer size={16} className="text-emerald-500"/> Glucose
                        </div>
                        <div className="text-4xl font-black text-slate-800">{latestVitals.sugar} <span className="text-lg text-slate-400 font-bold">mg/dL</span></div>
                        <div className="mt-2 text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={12}/> Updated {formatDistanceToNow(latestVitals.timestamp, { addSuffix: true })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <Activity size={48} className="mx-auto text-slate-300 mb-3"/>
                    <p className="text-slate-500 font-medium">No medical vitals recorded yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Wait for a doctor to update records.</p>
                </div>
            )}
         </div>
      </div>

      {/* --- ALERT FEED WITH DELETE --- */}
      <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100">
        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Bell size={20} className="text-slate-400"/> Recent System Alerts
        </h3>
        
        <div className="space-y-4">
            {recentAlerts.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No recent alerts recorded.</p>
            ) : (
                recentAlerts.map(alert => (
                    <div key={alert.id} className="bg-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 shadow-sm border border-slate-100 group">
                        
                        {/* Icon */}
                        <div className={`p-3 rounded-xl shrink-0 ${alert.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {alert.severity === 'HIGH' ? <AlertTriangle size={24}/> : <CheckCircle2 size={24}/>}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800">{alert.status}</p>
                                {alert.severity === 'HIGH' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Emergency</span>}
                            </div>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {alert.patient} <span className="text-slate-300">•</span> {alert.details}
                            </p>
                        </div>
                        
                        {/* Time & Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 border-t md:border-0 border-slate-100 pt-3 md:pt-0">
                           <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                               {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                           </span>
                           
                           {/* DELETE BUTTON */}
                           <button 
                                onClick={() => deleteAlert(alert.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Delete Alert"
                           >
                               <Trash2 size={18}/>
                           </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

    </div>
  );
}