'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase'; // Imports the file you just made
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  status: string;
  device: string;
  timestamp: Date;
  severity: string;
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'SAFE' | 'DANGER'>('SAFE');

  useEffect(() => {
    // 1. Listen to the 'alerts' collection in real-time
    const q = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          status: data.status,
          device: data.device,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
          severity: data.severity,
        } as Alert;
      });

      setAlerts(newAlerts);
      setLoading(false);

      // 2. Logic: If the latest alert is less than 5 minutes old, show DANGER
      if (newAlerts.length > 0) {
        const latestTime = newAlerts[0].timestamp;
        const now = new Date();
        // Check if latest alert was within last 5 minutes (300000 ms)
        if (latestTime && now.getTime() - latestTime.getTime() < 5 * 60 * 1000) {
          setSystemStatus('DANGER');
        } else {
          setSystemStatus('SAFE');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* HEADER */}
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">CareBridge Monitor</h1>
          <p className="text-gray-500">Real-time Elderly Safety System</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-700">System Live</span>
        </div>
      </header>

      {/* MAIN STATUS CARD */}
      <div className={`rounded-2xl p-8 text-center text-white shadow-lg transition-colors duration-500 mb-10 ${
        systemStatus === 'SAFE' 
          ? 'bg-gradient-to-r from-teal-500 to-emerald-600' 
          : 'bg-gradient-to-r from-red-500 to-orange-600 animate-pulse'
      }`}>
        <h2 className="text-xl font-semibold opacity-90 mb-2">CURRENT STATUS</h2>
        <div className="text-6xl font-black tracking-wider">
          {loading ? 'LOADING...' : systemStatus === 'SAFE' ? 'ALL CLEAR' : 'EMERGENCY DETECTED'}
        </div>
        <p className="mt-4 opacity-90 text-lg">
          {systemStatus === 'SAFE' 
            ? 'No recent falls or SOS signals detected.' 
            : 'Immediate attention required. Check alerts below.'}
        </p>
      </div>

      {/* RECENT ALERTS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-700">Recent Activity Log</h3>
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">Live Feed</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Connecting to CareBridge Neural Network...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No alerts recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-5 hover:bg-gray-50 transition flex items-start gap-4">
                {/* ICON BASED ON STATUS */}
                <div className={`p-3 rounded-full shrink-0 ${
                  alert.status.includes('SOS') || alert.status.includes('Fall') 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800">{alert.status}</h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {alert.timestamp ? formatDistanceToNow(alert.timestamp, { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Device ID: <span className="font-mono text-gray-600">{alert.device}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}