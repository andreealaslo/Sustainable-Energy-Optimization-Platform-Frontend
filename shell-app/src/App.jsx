import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, Bell, LayoutDashboard, LogOut, Zap } from 'lucide-react';

/**
 * Defensive imports for the preview environment.
 * These will work normally in your local environment after npm install.
 */
let Stomp;
let SockJS;

try {
  // Use web-compatible entry point for stompjs
  Stomp = require('stompjs/lib/stomp');
} catch (e) {
  // Fallback mock for preview
  Stomp = { Stomp: { over: () => ({ connect: () => {}, subscribe: () => {}, disconnect: () => {} }) } };
}

try {
  SockJS = require('sockjs-client');
} catch (e) {
  // Fallback mock for preview
  SockJS = function() { return {}; };
}

const DashboardMFE = lazy(() => 
  import('dashboard/Dashboard').catch(() => ({
    default: () => (
      <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Dashboard Area</h2>
        <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-2xl text-yellow-800">
          <p className="font-semibold">Remote "Dashboard" not detected.</p>
          <p className="text-sm mt-1">This is expected. The Shell is running on port 3000, but the Dashboard app on port 3001 isn't started yet.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-30 pointer-events-none">
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    )
  }))
);

const GATEWAY_URL = 'http://localhost:8080';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!token || typeof SockJS !== 'function') return;

    try {
      const socket = new SockJS(`${GATEWAY_URL}/ws-notifications`);
      const stompClient = Stomp.Stomp.over(socket);
      stompClient.debug = null; 

      stompClient.connect({}, () => {
        stompClient.subscribe('/topic/notifications', (message) => {
          const payload = JSON.parse(message.body);
          setAlerts((prev) => [payload, ...prev].slice(0, 5));
          
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.timestamp !== payload.timestamp));
          }, 8000);
        });
      });

      return () => {
        if (stompClient && stompClient.connected) {
          stompClient.disconnect();
        }
      };
    } catch (err) {
      console.warn("WebSocket initialization skipped in current environment.");
    }
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post(`${GATEWAY_URL}/api/users/login`, { email, password });
      const jwt = res.data.token;
      localStorage.setItem('jwt', jwt);
      setToken(jwt);
    } catch (err) {
      console.error("Login failed. Verify API Gateway is running.");
      // MOCK for UI testing if backend is offline
      // const mockToken = "dev-token";
      // localStorage.setItem('jwt', mockToken);
      // setToken(mockToken);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
        <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl">
          <div className="p-6 flex items-center gap-3 text-2xl font-black border-b border-gray-800">
            <Zap className="text-yellow-400 fill-current" size={28} /> <span>Energy Portal</span>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <Link to="/" className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 text-white font-medium">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
          </nav>
          <button onClick={handleLogout} className="m-4 p-3 flex items-center justify-center gap-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={20} /> Logout
          </button>
        </aside>

        <main className="flex-1 flex flex-col relative">
          <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-10">
            <h1 className="text-xl font-bold text-gray-800">System Overview</h1>
            <div className="flex items-center gap-6">
               <div className="relative p-2 bg-gray-100 rounded-full">
                  <Bell className="text-gray-600" size={22} />
                  {alerts.length > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-600 border-2 border-white rounded-full"></span>
                  )}
               </div>
               <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold">Admin User</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
               </div>
            </div>
          </header>

          <div className="fixed top-24 right-10 z-50 space-y-3 w-80">
            {alerts.map((alert, idx) => (
              <div key={idx} className="bg-white border-l-4 border-red-600 p-4 shadow-2xl rounded-r-xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-gray-900">High Usage Alert</p>
                    <p className="text-sm text-gray-600">ID: {alert.propertyId} - {alert.kwhUsed} kWh</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-10 flex-1 overflow-y-auto">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading Module...</div>}>
               <Routes>
                  <Route path="/" element={<DashboardMFE token={token} />} />
                  <Route path="*" element={<Navigate to="/" />} />
               </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
};

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-white p-12 rounded-3xl shadow-2xl w-[420px]">
        <div className="flex flex-col items-center mb-10 text-center">
          <Zap className="text-yellow-400 mb-4" size={48} />
          <h2 className="text-3xl font-black text-gray-900">Energy Portal</h2>
          <p className="text-gray-500 mt-2">Sign in to view real-time consumption</p>
        </div>
        
        <div className="space-y-4">
          <input 
            type="email" 
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors"
            placeholder="Email Address"
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input 
            type="password" 
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors"
            placeholder="Password"
            onChange={e => setForm({...form, password: e.target.value})}
          />
        </div>

        <button 
          onClick={() => onLogin(form.email, form.password)}
          className="w-full mt-10 bg-gray-900 text-white p-5 rounded-2xl font-bold transition-all hover:bg-gray-800"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default App;