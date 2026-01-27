'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Shield, Upload, Camera } from 'lucide-react';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = id;

  const auth = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  // --- NEW: PHOTO STATE ---
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // --- 1. CALCULATE MAX DATE FOR 18+ ---
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString().split('T')[0];

  // Fetch User Data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          // Set initial preview if exists
          if (data.photoUrl) setPhotoPreview(data.photoUrl);
        } else {
          alert("User record not found");
          router.push('/dashboard/users');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, router]);

  // --- 2. IMAGE CHANGE HANDLER ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- 3. AUTO-CALCULATE AGE ---
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobValue = e.target.value;
    if (!dobValue) return;

    const dobDate = new Date(dobValue);
    const diffMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(diffMs); 
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

    setUserData((prev: any) => ({ ...prev, dob: dobValue, age: calculatedAge }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target as any;

    if (parseInt(form.age.value) < 18) {
        alert("User must be at least 18 years old.");
        setSaving(false);
        return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        name: form.name.value,
        contact: form.contact.value,
        age: parseInt(form.age.value),
        dob: form.dob.value,
        gender: form.gender.value,
        role: form.role.value,
        password: form.password.value,
        photoUrl: photoPreview || userData.photoUrl || '' // Save the new photo
      });
      alert("✅ Profile Updated Successfully");
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      <p className="font-medium animate-pulse">Loading Profile...</p>
    </div>
  );

  if (!auth?.user || auth.user.role !== 'ADMIN') return <div>Access Denied</div>;
  if (!userData) return <div>No User Data Found</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-bold group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/> Back to Users
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
            
            <div className="flex items-center gap-6 relative z-10">
                
                {/* --- EDITABLE PHOTO AREA --- */}
                <div className="relative group cursor-pointer w-24 h-24">
                    <div className="w-full h-full rounded-2xl border-4 border-white/20 shadow-lg overflow-hidden bg-slate-800 flex items-center justify-center">
                        {photoPreview ? (
                            <img src={photoPreview} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <div className="text-3xl font-bold text-white">{userData.name?.[0]}</div>
                        )}
                    </div>
                    
                    {/* Hover Overlay for Upload */}
                    <label className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer backdrop-blur-[2px]">
                        <Camera size={24} className="text-white mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Change</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                </div>

                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{userData.name}</h1>
                    <div className="flex items-center gap-3 mt-2 text-slate-300 text-sm">
                      <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">{userData.role}</span> 
                      <span className="font-mono opacity-70">{userData.email}</span>
                    </div>
                </div>
            </div>
        </div>

        <form onSubmit={handleUpdate} className="p-8 md:p-10 space-y-8">
            
            {/* Personal Details */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={20} className="text-blue-500"/> Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
                      <input name="name" defaultValue={userData.name} className="w-full p-4 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 transition-all" />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Date of Birth (18+)</label>
                      <input 
                        name="dob" 
                        type="date" 
                        max={maxDate} 
                        defaultValue={userData.dob || ''}
                        onChange={handleDobChange} 
                        className="w-full p-4 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 transition-all cursor-pointer" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Age (Auto-Calculated)</label>
                      <input 
                        name="age" 
                        type="number" 
                        value={userData.age || ''} 
                        readOnly 
                        className="w-full p-4 bg-slate-100 rounded-xl border-transparent outline-none font-bold text-slate-500 cursor-not-allowed" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Gender</label>
                      <select name="gender" defaultValue={userData.gender} className="w-full p-4 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 transition-all cursor-pointer">
                          <option value="MALE">Male</option><option value="FEMALE">Female</option>
                      </select>
                    </div>
                </div>
            </div>

            {/* Contact & Account */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Shield size={20} className="text-purple-500"/> Account & Security
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email (Primary ID)</label>
                      <input name="email" defaultValue={userData.email} readOnly className="w-full p-4 bg-slate-100 text-slate-500 rounded-xl border-transparent outline-none font-mono cursor-not-allowed" title="Email cannot be changed" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Contact Number</label>
                      <input name="contact" defaultValue={userData.contact} className="w-full p-4 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                      <input name="password" defaultValue={userData.password} className="w-full p-4 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Role Permission</label>
                      <select name="role" defaultValue={userData.role} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 transition-all cursor-pointer">
                          <option value="FAMILY">Family Member</option><option value="VOLUNTEER">Volunteer</option><option value="DOCTOR">Doctor</option><option value="ELDER">Elderly User</option><option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                <button disabled={saving} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 transition-all active:scale-95">
                    {saving ? 'Saving...' : <><Save size={20}/> Save Changes</>}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}