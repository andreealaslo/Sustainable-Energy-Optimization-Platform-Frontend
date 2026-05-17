import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import SockJS from 'sockjs-client';
import * as Stomp from '@stomp/stompjs';
import { 
  AlertCircle, Bell, LayoutDashboard, LogOut, Zap, 
  MapPin, Wind, X, CheckCircle, User, Mail, Lock 
} from 'lucide-react';

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
  const [activeAlerts, setActiveAlerts] = useState([]); 
  const [history, setHistory] = useState([]); 
  const [propertyMap, setPropertyMap] = useState({}); 
  const [showHistory, setShowHistory] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const propertyMapRef = useRef({});
  useEffect(() => {
    propertyMapRef.current = propertyMap;
  }, [propertyMap]);

  const fetchPropertyMap = async (tokenStr) => {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/users/properties`, {
        headers: { Authorization: `Bearer ${tokenStr}` }
      });
      const mapping = {};
      res.data.forEach(p => { mapping[p.propertyId] = p.address; });
      setPropertyMap(mapping);
    } catch (err) { 
      console.error("Could not fetch property map", err); 
    }
  };

  useEffect(() => {
    if (token) fetchPropertyMap(token);
  }, [token]);

  // --- CENTRALIZED WEBSOCKET PIPELINE ---
  useEffect(() => {
    if (!token) return;

    let stompClient = null;

    try {
      const socket = new SockJS(`${GATEWAY_URL}/ws-notifications`);

      const handleMessage = (message) => {
        if (!message || !message.body) return;
        const payload = JSON.parse(message.body);

        // 1. ALWAYS pulse the refresh token so the Dashboard MFE updates its graphs
        setRefreshToggle(prev => prev + 1);

        // 2. ESCALATE to UI Toasts ONLY if it's a critical grid anomaly (ALERT)
        if (payload.type === 'ALERT') {
          const currentTimestamp = Date.now();
          const enrichedAlert = { 
            ...payload, 
            id: currentTimestamp,
            address: propertyMapRef.current[payload.propertyId] || "Smart Meter",
            displayTime: new Date(currentTimestamp).toLocaleTimeString()
          };

          setActiveAlerts((prev) => [enrichedAlert, ...prev].slice(0, 3));
          setHistory((prev) => [enrichedAlert, ...prev]);

          setTimeout(() => {
            setActiveAlerts(prev => prev.filter(a => a.id !== enrichedAlert.id));
          }, 8000);
        }
      };

      // Support both legacy `stompjs` (Stomp.over) and newer @stomp/stompjs Client
      if (typeof Stomp.over === 'function') {
        stompClient = Stomp.over(socket);
        stompClient.debug = () => {};
        stompClient.connect({}, () => {
          console.log("Shell securely anchored to WebSocket notification stream.");
          stompClient.subscribe('/topic/notifications', handleMessage);
        }, (error) => {
          console.error("WebSocket connection dropped. Retrying topology connection...", error);
        });
      } else if (typeof Stomp.Client === 'function' || typeof Stomp.Client === 'object') {
        // @stomp/stompjs compatibility
        stompClient = new Stomp.Client({
          webSocketFactory: () => socket,
          debug: () => {}
        });
        stompClient.onConnect = () => {
          console.log("Shell securely anchored to WebSocket notification stream.");
          stompClient.subscribe('/topic/notifications', (msg) => handleMessage(msg));
        };
        stompClient.onStompError = (frame) => {
          console.error('Broker reported error: ', frame);
        };
        stompClient.activate();
      } else {
        throw new Error('No compatible STOMP client found');
      }

      return () => {
        if (stompClient) {
          try {
            if (typeof stompClient.deactivate === 'function') {
              stompClient.deactivate();
            } else if (typeof stompClient.disconnect === 'function') {
              stompClient.disconnect();
            }
            console.log("WebSocket connection torn down cleanly.");
          } catch (e) {
            console.error("Error during socket disconnect cleanup", e);
          }
        }
      };
    } catch (err) {
      console.warn("WebSocket infrastructure initialization failed.", err);
    }
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post(`${GATEWAY_URL}/api/users/login`, { email, password });
      const jwt = res.data.token;
      localStorage.setItem('jwt', jwt);
      setToken(jwt);
      fetchPropertyMap(jwt);
    } catch (err) {
      console.error("Login failed. Verify API Gateway is running.");
      alert("Invalid credentials or server error.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
    setHistory([]);
    setActiveAlerts([]);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
        
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-40">
          <div className="p-8 flex items-center gap-3 text-2xl font-black border-b border-slate-800">
            <div className="p-2 bg-yellow-400 rounded-xl text-slate-900 shadow-lg shadow-yellow-400/20">
              <Zap size={24} fill="currentColor" />
            </div>
            <span className="tracking-tight">Energy Platform</span>
          </div>
          <nav className="flex-1 p-6 space-y-2">
            <Link to="/" className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 text-white font-bold transition-all border border-white/5 hover:bg-white/15">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
          </nav>
          <button onClick={handleLogout} className="m-6 p-4 flex items-center justify-center gap-3 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
            <LogOut size={20} /> Logout
          </button>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Header */}
          <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-12 z-30 sticky top-0">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Overview</h1>
            
            <div className="flex items-center gap-6">
               {/* Bell Notification Dropdown Control */}
               <div className="relative">
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-3 rounded-2xl transition-all relative ${showHistory ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Bell size={24} />
                    {history.length > 0 && !showHistory && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {history.length > 9 ? '9+' : history.length}
                      </span>
                    )}
                  </button>

                  {/* Notification Center Popover */}
                  {showHistory && (
                    <div className="absolute right-0 mt-4 w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                        <h3 className="font-black text-lg">Eco-Alert History</h3>
                        <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {history.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 italic text-sm">No critical grid anomalies recorded.</div>
                        ) : (
                          history.map(item => (
                            <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                              <div className="p-2 bg-red-100 text-red-600 rounded-xl h-fit mt-1"><AlertCircle size={18}/></div>
                              <div className="space-y-1 min-w-0">
                                <p className="font-bold text-sm text-slate-900 truncate">{item.address}</p>
                                
                                <div className="flex gap-3 pt-2">
                                  <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg">{item.kwhUsed?.toFixed(2)} kWh</span>
                                  <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-lg">{item.carbonScore?.toFixed(4)} kg</span>
                                </div>
                                <p className="text-[11px] text-slate-400 pt-1 italic">{item.displayTime}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </header>

          {/* Floating Critical Toast Array */}
          <div className="fixed top-28 right-12 z-[60] space-y-4 w-[380px] pointer-events-none">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="bg-slate-900 text-white p-6 shadow-2xl rounded-[2rem] border border-white/10 animate-in slide-in-from-right duration-500 pointer-events-auto overflow-hidden relative">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500 rounded-xl"><AlertCircle size={20}/></div>
                    <div>
                      <h4 className="font-black text-lg leading-tight">High Intensity Surge</h4>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin size={12} /> <span className="text-xs font-bold">{alert.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2 text-blue-400 mb-1"><Zap size={14}/> <span className="text-[10px] font-black uppercase tracking-widest">Usage</span></div>
                      <p className="font-black text-lg">{alert.kwhUsed?.toFixed(2)} <small className="text-[10px]">kWh</small></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1"><Wind size={14}/> <span className="text-[10px] font-black uppercase tracking-widest">Footprint</span></div>
                      <p className="font-black text-lg">{alert.carbonScore?.toFixed(4)} <small className="text-[10px]">kg</small></p>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                      <p className="text-[11px] leading-relaxed text-amber-200 italic font-medium">Grid State is heavily stained ({alert.gridIndex?.toUpperCase()}). Postponing consumption drops marginal footprints.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Micro-Frontend Remote MFE Sandbox Mounting Target */}
          <div className="p-12 flex-1 overflow-y-auto">
            <Suspense fallback={<div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 font-bold"><Zap className="animate-spin text-indigo-600" /> Orchestrating System Nodes...</div>}>
               <Routes>
                  <Route path="/" element={<DashboardMFE token={token} refreshTrigger={refreshToggle} />} />
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
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    try {
      await axios.post(`${GATEWAY_URL}/api/users/register`, {
        fullName: form.fullName,
        email: form.email,
        password: form.password
      });
      setSuccess("Account instantiated successfully! Procced to authentication.");
      setView('login');
      setForm(prev => ({ ...prev, fullName: '', password: '' }));
    } catch (err) {
      console.error("Registration error", err);
      alert("Registration failed. Please check backend status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-10 text-center">
          <Zap className="text-yellow-400 mb-4" size={48} />
          <h2 className="text-3xl font-black text-gray-900 leading-tight">
            {view === 'login' ? 'Sustainable Infrastructure Management' : 'Create Node Profile'}
          </h2>
          <p className="text-gray-500 mt-2 font-medium">
            {view === 'login' ? 'Sign in to hook into live carbon diagnostics' : 'Bind a new identity to the tracking cluster'}
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm font-bold rounded-2xl border border-green-100 flex items-center gap-3 animate-in fade-in">
            <CheckCircle size={18} /> {success}
          </div>
        )}
        
        {view === 'login' ? (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="email" 
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors font-medium"
                placeholder="Email Address"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="password" 
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors font-medium"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>

            <div className="pt-6 space-y-4">
              <button 
                onClick={() => onLogin(form.email, form.password)}
                className="w-full bg-gray-900 text-white p-5 rounded-2xl font-bold transition-all hover:bg-gray-800 shadow-xl shadow-gray-900/10"
              >
                Establish Connection
              </button>
              <button 
                onClick={() => { setView('register'); setSuccess(''); }}
                className="w-full bg-slate-100 text-slate-700 p-5 rounded-2xl font-bold transition-all hover:bg-slate-200"
              >
                Provision New Node
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="text" 
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors font-medium"
                placeholder="Full Name"
                required
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="email" 
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors font-medium"
                placeholder="Email Address"
                required
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="password" 
                className="w-full p-4 pl-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-yellow-400 transition-colors font-medium"
                placeholder="Password"
                required
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>

            <div className="pt-6 space-y-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-bold transition-all hover:bg-indigo-700 shadow-xl disabled:opacity-50"
              >
                {loading ? "Registering Node Assets..." : "Register System Node"}
              </button>
              <button 
                type="button"
                onClick={() => setView('login')}
                className="w-full bg-transparent text-slate-500 p-4 rounded-2xl font-bold transition-all hover:bg-slate-50"
              >
                Return to Portal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default App;