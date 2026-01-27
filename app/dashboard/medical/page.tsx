'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, orderBy, limit, onSnapshot, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Stethoscope, Activity, Utensils, HeartPulse, Pill, Trash2, 
  FileText, User, CheckCircle2, ClipboardPlus, ChevronDown, AlertTriangle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MedicalPage() {
  const auth = useAuth();
  const user = auth?.user; 
  
  const [medicalRecords, setRecords] = useState<any[]>([]);
  const [elders, setElders] = useState<any[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- ALERT STATE ---
  const [alertStatus, setAlertStatus] = useState<'IDLE' | 'SAFE' | 'DANGER'>('IDLE');

  // --- 1. SMART FETCH (PRIVACY FILTERED) ---
  useEffect(() => {
    if (!user) return;

    let q;
    const recordsRef = collection(db, 'medical');

    // ROLE-BASED QUERY LOGIC
    if (user.role === 'DOCTOR' || user.role === 'ADMIN') {
        q = query(recordsRef, orderBy('timestamp', 'desc'), limit(50));
    } 
    else if (user.role === 'ELDER') {
        q = query(recordsRef, where('patientId', '==', user.id), orderBy('timestamp', 'desc'), limit(20));
    } 
    else if (user.role === 'FAMILY') {
        if (user.pairedElderId) {
            q = query(recordsRef, where('patientId', '==', user.pairedElderId), orderBy('timestamp', 'desc'), limit(20));
        } else {
            setRecords([]);
            return;
        }
    } else {
        return;
    }

    const unsub = onSnapshot(q, snap => {
        setRecords(snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, 
                ...data, 
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
            };
        }));
    });
    return () => unsub();
  }, [user]); 

  // --- 2. FETCH ELDERS FOR DROPDOWN (DOCTORS ONLY) ---
  useEffect(() => {
    if (user?.role !== 'DOCTOR') return; 
    
    const fetchElders = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'ELDER'));
        const snap = await getDocs(q);
        setElders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching elders:", error);
      }
    };
    fetchElders();
  }, [user]);

  // --- 3. THRESHOLD CHECK LOGIC ---
  const checkVitals = (bp: string, sugar: string, pulse: string) => {
    let isCritical = false;

    // BP Check (Format: "120/80")
    if (bp) {
        const [sys, dia] = bp.split('/').map(Number);
        if (sys > 140 || sys < 90 || dia > 90 || dia < 60) isCritical = true;
    }

    // Sugar Check
    const sugarVal = parseInt(sugar);
    if (sugarVal > 200 || sugarVal < 70) isCritical = true;

    // Pulse Check
    const pulseVal = parseInt(pulse);
    if (pulseVal > 100 || pulseVal < 60) isCritical = true;

    return isCritical;
  };

  const addMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    const form = e.target as HTMLFormElement;
    
    // Get Values
    const bp = (form.elements.namedItem('bp') as HTMLInputElement).value;
    const sugar = (form.elements.namedItem('sugar') as HTMLInputElement).value;
    const pulse = (form.elements.namedItem('pulse') as HTMLInputElement).value;
    
    // --- TRIGGER ALERT SYSTEM ---
    const isCritical = checkVitals(bp, sugar, pulse);
    setAlertStatus(isCritical ? 'DANGER' : 'SAFE');
    setTimeout(() => setAlertStatus('IDLE'), 3000);

    const patientSelect = form.elements.namedItem('patientId') as HTMLSelectElement;
    const selectedElderId = patientSelect.value;
    const selectedElder = elders.find(e => e.id === selectedElderId);
    const patientName = selectedElder ? selectedElder.name : 'Unknown Patient';
    const patientContact = selectedElder ? selectedElder.contact : null;

    // --- NEW: SEND WHATSAPP IF CRITICAL ---
    if (isCritical && patientContact) {
        try {
            await fetch('/api/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: patientContact,
                    type: 'CRITICAL_VITALS', // Hits 'default' case in route.ts which uses carebridge_alert
                    patientName: patientName,
                    extraData: `CRITICAL VITALS: BP ${bp}, Sugar ${sugar}, Pulse ${pulse}. Please check patient immediately.`
                })
            });
            console.log("Critical WhatsApp Sent");
        } catch (err) {
            console.error("Failed to send WhatsApp", err);
        }
    }

    try {
      await addDoc(collection(db, 'medical'), {
        doctorName: user.name,
        patientId: selectedElderId, 
        patientName: patientName,   
        bp, sugar, pulse,
        medication: (form.elements.namedItem('medication') as HTMLInputElement).value,
        dosage: (form.elements.namedItem('dosage') as HTMLInputElement).value,
        notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
        timestamp: new Date(),
        status: isCritical ? 'CRITICAL' : 'STABLE'
      });
      form.reset();
    } catch (error) {
      console.error(error);
      alert('Error saving record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if(confirm('Are you sure you want to delete this medical record?')) {
        await deleteDoc(doc(db, 'medical', id));
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-cyan-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="relative min-h-screen">
        
        {/* --- FULL SCREEN ALERT OVERLAY --- */}
        {alertStatus !== 'IDLE' && (
            <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 animate-in fade-in zoom-in
                ${alertStatus === 'DANGER' ? 'bg-red-500/20 backdrop-blur-sm' : 'bg-blue-500/20 backdrop-blur-sm'}
            `}>
                <div className={`p-8 rounded-[2rem] shadow-2xl border-4 transform scale-110 animate-bounce
                    ${alertStatus === 'DANGER' 
                        ? 'bg-red-600 border-red-400 text-white shadow-red-600/50' 
                        : 'bg-blue-600 border-blue-400 text-white shadow-blue-600/50'}
                `}>
                    <div className="flex flex-col items-center gap-4">
                        {alertStatus === 'DANGER' ? <AlertTriangle size={64} className="animate-pulse"/> : <CheckCircle2 size={64} className="animate-pulse"/>}
                        <h1 className="text-4xl font-black uppercase tracking-widest">
                            {alertStatus === 'DANGER' ? 'CRITICAL ALERT' : 'VITALS STABLE'}
                        </h1>
                        <p className="text-lg font-bold opacity-90">
                            {alertStatus === 'DANGER' ? 'Values outside safety threshold detected! WhatsApp Alert Sent.' : 'Patient status verified normal.'}
                        </p>
                    </div>
                </div>
            </div>
        )}

        <div className={`max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700 transition-colors duration-500 ${
            alertStatus === 'DANGER' ? 'bg-red-50' : alertStatus === 'SAFE' ? 'bg-blue-50' : ''
        }`}>
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50">
                <Stethoscope size={32} className="text-cyan-600"/>
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medical Center</h1>
                <p className="text-slate-500 font-medium">Patient Vitals & Clinical History</p>
            </div>
            </div>
            
            {/* Context Badge */}
            {user.role === 'FAMILY' && user.pairedElderId && (
                <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <User size={16}/> Monitoring: Elder ID #{user.pairedElderId.slice(-4)}
                </div>
            )}
        </div>

        {/* --- ADD RECORD FORM (DOCTORS ONLY) --- */}
        {user.role === 'DOCTOR' && (
            <div className={`bg-white rounded-[2.5rem] shadow-xl shadow-cyan-100/50 border border-slate-100 relative overflow-hidden group transition-all duration-500 ${alertStatus === 'DANGER' ? 'ring-4 ring-red-500' : ''}`}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"></div>
            
            <div className="p-8 md:p-10">
                <h2 className="font-bold text-xl text-slate-800 mb-8 flex items-center gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><ClipboardPlus size={20}/></div>
                New Clinical Entry
                </h2>
                
                <form onSubmit={addMedicalRecord} className="space-y-8">
                
                {/* Patient Selection */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Patient</h3>
                    <div className="relative group">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10"/>
                        <select 
                            name="patientId" 
                            required 
                            className="w-full pl-12 pr-10 p-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                        >
                            <option value="" disabled selected>-- Select Elder Patient --</option>
                            {elders.map(elder => (
                                <option key={elder.id} value={elder.id}>
                                    {elder.name} (ID: {elder.email})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-cyan-600 transition-colors"/>
                    </div>
                </div>

                {/* Vitals Grid */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Vital Signs (Triggers Alert if Critical)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative group">
                            <Activity size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 group-focus-within:text-rose-600 transition-colors"/>
                            <input name="bp" placeholder="Blood Pressure (e.g. 120/80)" className="w-full pl-12 p-4 bg-rose-50/50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all font-medium text-slate-700" />
                        </div>
                        <div className="relative group">
                            <Utensils size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-blue-600 transition-colors"/>
                            <input name="sugar" type="number" placeholder="Glucose Level (mg/dL)" className="w-full pl-12 p-4 bg-blue-50/50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" />
                        </div>
                        <div className="relative group">
                            <HeartPulse size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 group-focus-within:text-cyan-600 transition-colors"/>
                            <input name="pulse" type="number" placeholder="Heart Rate (BPM)" className="w-full pl-12 p-4 bg-cyan-50/50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-medium text-slate-700" />
                        </div>
                    </div>
                </div>

                {/* Prescription */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Prescription & Diagnosis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="medication" placeholder="Medication Name" required className="p-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-medium text-slate-700" />
                        <input name="dosage" placeholder="Dosage (e.g. 1 tablet after meal)" required className="p-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-medium text-slate-700" />
                    </div>
                    <textarea name="notes" placeholder="Additional clinical notes, observations, or instructions..." className="w-full p-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-medium text-slate-700 h-32 resize-none"></textarea>
                </div>
                
                <div className="pt-4 flex justify-end">
                    <button disabled={isSubmitting} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-cyan-600 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70">
                        {isSubmitting ? 'Processing...' : <>Check Vitals & Save <CheckCircle2 size={18}/></>}
                    </button>
                </div>
                </form>
            </div>
            </div>
        )}

        {/* --- RECORDS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {medicalRecords.map(rec => (
            <div key={rec.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden ${rec.status === 'CRITICAL' ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-100'}`}>
                
                {/* Card Top Border */}
                <div className={`absolute top-0 left-0 w-full h-1 ${rec.status === 'CRITICAL' ? 'bg-red-500' : 'bg-gradient-to-r from-slate-200 to-slate-100 group-hover:from-cyan-400 group-hover:to-blue-500'} transition-all duration-500`}></div>

                {/* --- UPDATE: ADMIN & DOCTOR DELETE --- */}
                {(user.role === 'ADMIN' || user.role === 'DOCTOR') && (
                    <button onClick={() => deleteRecord(rec.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-10" title="Delete Record">
                        <Trash2 size={18}/>
                    </button>
                )}
                
                <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${rec.status === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}></span>
                                <span className={`text-xs font-bold uppercase tracking-wide ${rec.status === 'CRITICAL' ? 'text-red-600' : 'text-cyan-600'}`}>
                                    {rec.status === 'CRITICAL' ? 'Critical Status' : 'Patient'}
                                </span>
                            </div>
                            <h3 className="font-bold text-xl text-slate-900 leading-tight">{rec.patientName}</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{formatDistanceToNow(rec.timestamp, {addSuffix: true})}</span>
                        </div>
                    </div>

                    {/* Vitals Section */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {rec.bp && (
                            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100 text-xs font-bold">
                                <Activity size={14}/> BP: {rec.bp}
                            </div>
                        )}
                        {rec.sugar && (
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-bold">
                                <Utensils size={14}/> GLU: {rec.sugar}
                            </div>
                        )}
                        {rec.pulse && (
                            <div className="flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg border border-cyan-100 text-xs font-bold">
                                <HeartPulse size={14}/> HR: {rec.pulse}
                            </div>
                        )}
                    </div>

                    {/* Prescription Section */}
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-2">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white text-cyan-600 rounded-lg shadow-sm shrink-0 border border-slate-100">
                                <Pill size={20}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">{rec.medication}</h4>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{rec.dosage}</p>
                            </div>
                        </div>
                        {rec.notes && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60">
                                <p className="text-xs text-slate-600 italic leading-relaxed flex gap-2">
                                    <FileText size={12} className="shrink-0 mt-0.5 opacity-50"/> 
                                    {rec.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">Dr</div>
                        {rec.doctorName}
                    </div>
                    <div className="text-slate-300">#{rec.id.slice(-4)}</div>
                </div>
            </div>
            ))}
        </div>
        
        {medicalRecords.length === 0 && (
            <div className="text-center py-20 text-slate-400">
                <Stethoscope size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No medical records found.</p>
            </div>
        )}

        </div>
    </div>
  );
}