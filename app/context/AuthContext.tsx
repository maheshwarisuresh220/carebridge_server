'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path to your firebase config if needed

// --- UPDATED INTERFACE ---
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FAMILY' | 'VOLUNTEER' | 'DOCTOR' | 'ELDER';
  password?: string; // <--- ADDED: Fixes the error in Settings Page
  pairedElderId?: string;
  location?: { lat: number; lng: number; address: string };
  photoUrl?: string; // <--- ADDED: For the Avatar component
  gender?: 'MALE' | 'FEMALE'; // <--- ADDED: For the Avatar component
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  // Load user from localStorage on refresh
  useEffect(() => {
    const stored = localStorage.getItem('carebridge_user');
    if (stored) setUser(JSON.parse(stored));
    else router.push('/login');
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      let foundUser = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check password
        if (data.password === pass) {
            // Combine ID with data and cast to UserProfile
            foundUser = { id: doc.id, ...data } as UserProfile;
        }
      });

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('carebridge_user', JSON.stringify(foundUser));
        router.push('/dashboard');
        return true;
      }
      return false; // Invalid credentials
    } catch (e) {
      console.error("Login Error:", e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('carebridge_user');
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);