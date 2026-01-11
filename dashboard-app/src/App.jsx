import React, { useState } from 'react';
import axios from 'axios';
import { Zap, ShieldCheck, LogOut, Key, Mail, Layout, AlertCircle } from 'lucide-react';

/**
 * Defensive imports for the preview environment.
 * These will work normally in your local environment after npm install.
 */
let Dashboard;
try {
  Dashboard = require('./Dashboard').default;
} catch (e) {
  // Fallback mock for preview environment
  Dashboard = ({ token }) => (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 text-amber-600 mb-4">
        <AlertCircle size={20} />
        <p className="font-bold uppercase tracking-widest text-xs">Component Preview Mode</p>
      </div>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        The <b>Dashboard</b> remote component is currently being resolved. 
        In your local environment, the real charts and energy metrics will appear here using your session token.
      </p>
      <div className="space-y-4">
        <div className="h-40 bg-slate-50 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-50 rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-slate-50 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

try {
  require('./index.css');
} catch (e) {
  // Ignore missing CSS in preview
}

const GATEWAY_URL = 'http://localhost:8080';

/**
 * Standalone Wrapper for the Dashboard Micro Frontend.
 * This file serves as the "Host" when running on Port 3001.
 * It demonstrates that the Dashboard component is truly decoupled 
 * from the main Shell application.
 */
const App = () => {
  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleStandaloneLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      // Direct call to the API Gateway to authenticate for the 3001 origin
      const res = await axios.post(`${GATEWAY_URL}/api/users/login`, loginForm);
      const jwt = res.data.token;
      
      // Store token specifically for this origin (localhost:3001)
      localStorage.setItem('jwt', jwt);
      setToken(jwt);
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed. Ensure API Gateway is running on port 8080.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
  };

  // --- UNAUTHENTICATED STATE (Standalone Login) ---
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 font-sans p-6 text-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-8 text-center">
            
              <Zap className="text-yellow-400 mb-4" size={48} />
            
            <h2 className="text-3xl font-black text-gray-900">Dashboard Component</h2>
            <p className="text-gray-500 mt-2">Sign in for the standalone component</p>
            
          </div>
          
          <form onSubmit={handleStandaloneLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 animate-bounce">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              
              <input 
                type="email" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                placeholder="Email Address"
                value={loginForm.email}
                onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-1.5">
              <input 
                type="password" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                placeholder="Password"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-4 bg-slate-900 text-white p-5 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED STATE (Component Workbench) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="h-20 bg-slate-900 border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-400 rounded-xl text-slate-900 shadow-lg shadow-yellow-400/20">
                        <Zap size={24} fill="currentColor" />
                      </div>
          <div>
            <span className="font-black text-lg tracking-tight block leading-none text-white">Standalone Dashboard Component</span>
            
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl border border-slate-100"
        >
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div className="p-10 max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
        {/* This is the exact same component that the Shell App imports.
          By passing the token via props, we prove it can work in any host.
        */}
        <Dashboard token={token} />
      </div>
    </div>
  );
};

export default App;