'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useRouter } from 'next/navigation';
import { 
  Users, UserPlus, Trash2, Smartphone, Calendar, Upload, Mail, 
  User, ShieldAlert, CheckCircle2, Search, XCircle, Edit , Filter
} from 'lucide-react';

export default function UsersPage() {
  const auth = useAuth();
  const user = auth?.user; 
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- FETCH USERS ---
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const elders = users.filter(u => u.role === 'ELDER');
  
  // --- SEARCH LOGIC (Focus on Email & Name) ---
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSearching = searchQuery.length > 0;

  // --- IMAGE HANDLING ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addUser = async (e: any) => {
    e.preventDefault();
    const form = e.target;
    
    const email = form.email.value.trim(); // Ensure no spaces
    const age = parseInt(form.age.value);
    const role = form.role.value;

    // 1. AGE CONSTRAINT
    if (age < 18) {
      alert("⚠️ Age Restriction: Volunteers and Family members must be 18+.");
      return; 
    }

    setUploading(true);

    // 2. PRIMARY KEY CHECK (Unique Email)
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        alert(`⛔ Error: The email "${email}" is already registered. Please use a different email.`);
        setUploading(false);
        return; // STOP execution
    }

    // 3. CREATE USER
    const newUser: any = {
      name: form.name.value,
      email: email, // This acts as our unique key conceptually
      password: form.password.value,
      contact: form.contact.value,
      age: age,
      dob: form.dob.value,
      gender: form.gender.value,
      role: role,
      photoUrl: photoPreview || '',
      createdAt: new Date()
    };

    if (role === 'FAMILY' && form.pairedElder.value) newUser.pairedElderId = form.pairedElder.value;
    if (role === 'ELDER') newUser.location = { lat: 24.8607, lng: 67.0011, address: 'Karachi, Central' };

    try {
      await addDoc(collection(db, 'users'), newUser);
      form.reset();
      setPhotoPreview(null);
      alert("✅ User Registered Successfully");
    } catch (err) {
      console.error(err);
      alert("Error creating user.");
    }
    setUploading(false);
  };

  const deleteUser = async (id: string) => {
    if(confirm('Are you sure you want to delete this user?')) await deleteDoc(doc(db, 'users', id));
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
        case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'ELDER': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'DOCTOR': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 rounded-full border-t-transparent"></div></div>;
  if (user.role !== 'ADMIN') return <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400"><ShieldAlert size={48} className="mb-4"/><h2 className="text-xl font-bold">Access Denied</h2></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50">
            <Users size={32} className="text-blue-600"/>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 font-medium">Administer system accounts & roles</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative group w-full md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
            </div>
            <input 
                type="text" 
                placeholder="Search by Email or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-96 pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm font-medium text-slate-700"
            />
            {isSearching && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-red-500">
                    <XCircle size={18} fill="currentColor" className="text-slate-100"/>
                </button>
            )}
        </div>
      </div>

      {/* --- REGISTER NEW ACCOUNT (Hidden when Searching) --- */}
      {!isSearching && (
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative group animate-in slide-in-from-top-4 fade-in">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="p-8 md:p-10">
            <h2 className="font-bold text-xl mb-8 flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserPlus size={20}/></div>
                Register New Account
            </h2>
            
            <form onSubmit={addUser} className="flex flex-col lg:flex-row gap-10">
                {/* PHOTO UPLOAD */}
                <div className="flex flex-col items-center justify-center lg:w-1/4 space-y-4">
                    <div className="relative w-40 h-40 group cursor-pointer">
                        <div className={`w-full h-full rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center transition-all duration-300 ${!photoPreview ? 'bg-slate-100' : 'bg-white'}`}>
                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" /> : <User size={64} className="text-slate-300" />}
                        </div>
                        <label className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer backdrop-blur-sm">
                            <Upload size={24} className="mb-1" /><span className="text-xs font-bold uppercase tracking-wider">Upload</span>
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Profile Photo</p>
                </div>

                {/* INPUT FIELDS */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Full Name</label><div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input name="name" placeholder="Full Name" required className="w-full pl-11 p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-semibold text-slate-700" /></div></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Email Address</label><div className="relative"><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input name="email" type="email" placeholder="Email Address" required className="w-full pl-11 p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-semibold text-slate-700" /></div></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Contact</label><div className="relative"><Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input name="contact" type="tel" placeholder="Contact Number" required className="w-full pl-11 p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-semibold text-slate-700" /></div></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Age</label><input name="age" type="number" placeholder="18+" min="0" required className="w-full p-4 text-center bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Gender</label><select name="gender" required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 cursor-pointer"><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                    </div>

                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Date of Birth</label><input name="dob" type="date" required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-3">Password</label><input name="password" type="password" placeholder="••••••••" required className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-semibold text-slate-700" /></div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-3">Role</label>
                        <div className="relative">
                            <select name="role" className="w-full p-4 bg-white border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-slate-700 cursor-pointer appearance-none shadow-sm" onChange={(e) => {
                                const el = document.getElementById('elder-pair-select');
                                if(el) el.style.display = e.target.value === 'FAMILY' ? 'block' : 'none';
                            }}>
                                <option value="FAMILY">Family Member</option><option value="VOLUNTEER">Volunteer</option><option value="DOCTOR">Doctor</option><option value="ELDER">Elderly User</option><option value="ADMIN">Administrator</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                        </div>
                        <select id="elder-pair-select" name="pairedElder" className="hidden w-full mt-3 p-4 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all animate-in slide-in-from-top-2">
                            <option value="">-- Select Elder to Pair --</option>{elders.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
                        </select>
                    </div>
                </div>
            </form>

            <div className="mt-8 flex justify-end">
                <button onClick={(e) => { const form = document.querySelector('form'); form?.requestSubmit(); }} disabled={uploading} className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group">
                    {uploading ? <>Processing...</> : <>Create Account <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform"/></>}
                </button>
            </div>
        </div>
      </div>
      )}

      {/* --- SEARCH RESULTS / USER GRID --- */}
      {isSearching && (
          <div className="flex items-center gap-2 mb-4 animate-in fade-in">
              <span className="text-sm font-bold text-slate-500">Search Results:</span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{filteredUsers.length} found</span>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden">
             
             {/* Decorative Bg */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-bl-[4rem] -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

             <div className="relative z-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className="relative">
                        {u.photoUrl ? <img src={u.photoUrl} className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white" alt={u.name} /> : <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-2xl shadow-md border-2 border-white ${u.gender === 'FEMALE' ? 'bg-pink-400' : 'bg-blue-500'}`}>{u.name.charAt(0)}</div>}
                        <span className={`absolute -bottom-2 -right-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border border-white/50 ${getRoleBadge(u.role)}`}>{u.role}</span>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* EDIT BUTTON (Passes ID, but relies on email uniqueness) */}
                        <button onClick={() => router.push(`/dashboard/users/${u.id}`)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="Edit Profile">
                            <Edit size={18}/>
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Delete User">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                 </div>

                 <h3 className="text-lg font-bold text-slate-900 truncate">{u.name}</h3>
                 {/* Email acts as the main subtitle ID */}
                 <p className="text-sm text-slate-500 truncate font-mono bg-slate-50 px-2 py-1 rounded-md inline-block mb-4">{u.email}</p>

                 <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Smartphone size={16} className="text-slate-400"/> <span className="font-semibold">{u.contact || 'No contact'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Calendar size={16} className="text-slate-400"/> <span>Age: <span className="font-bold text-slate-800">{u.age}</span> • {u.gender ? u.gender[0] + u.gender.slice(1).toLowerCase() : '-'}</span>
                    </div>
                 </div>
             </div>
          </div>
        ))}
      </div>
      
      {filteredUsers.length === 0 && (
        <div className="text-center py-20 text-slate-400">
            <Filter size={48} className="mx-auto mb-4 opacity-20"/>
            <p>No users found matching your search.</p>
        </div>
      )}
    </div>
  );
}