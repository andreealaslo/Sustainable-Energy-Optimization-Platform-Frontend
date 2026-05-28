import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Leaf, Zap, History, Plus, Building, 
  Activity, RefreshCw, X 
} from 'lucide-react';

const GATEWAY_URL = 'http://localhost:80';

const statusToColorKey = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'very high':
      return 'red';
    case 'high':
      return 'orange';
    case 'moderate':
      return 'yellow';
    case 'low':
    case 'very low':
      return 'green';
    default:
      return 'blue';
  }
};

const statusToHex = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'very high':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'moderate':
      return '#fbbf24';
    case 'low':
    case 'very low':
      return '#10b981';
    default:
      return '#3b82f6';
  }
};

const parseUtcTimestamp = (value) => {
  if (!value) return null;
  const hasTimeZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasTimeZone ? value : `${value}Z`);
};

const MultiLineTick = ({ x, y, payload }) => {
  if (!payload.value) return null;
  
  const date = parseUtcTimestamp(payload.value);
  if (!date || Number.isNaN(date.getTime())) return null;

  const dateStr = date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Bucharest'
  });
  const timeStr = date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Bucharest'
  });

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#141618" fontSize={10} fontWeight="500">
        <tspan x="0" dy="1em">{dateStr}</tspan>
        <tspan x="0" dy="1.2em" fill="#6c767e">{timeStr}</tspan>
      </text>
    </g>
  );
};

// Fixed: Accepting refreshTrigger directly from Shell MFE orchestration
const Dashboard = ({ token, refreshTrigger, latestAdvice = {} }) => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  const config = { headers: { Authorization: `Bearer ${token}` } };
  
  const fetchProperties = useCallback(async () => {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/users/properties`, config);
      setProperties(res.data);
      if (res.data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(res.data[0].propertyId);
      }
    } catch (err) {
      console.error("Error fetching properties", err);
    }
  }, [token, selectedPropertyId]);

  const fetchPropertyDetails = useCallback(async () => {
    if (!selectedPropertyId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/recommendations/property/${selectedPropertyId}`, config);
      const sorted = res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setReportData(sorted);
    } catch (err) {
      console.error("Error fetching recommendations", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, token]);

  // --- REFACTORED LIVE LISTENER ---
  useEffect(() => {
    if (selectedPropertyId) {
      fetchPropertyDetails();
    }
  }, [selectedPropertyId, refreshTrigger, fetchPropertyDetails]);

  useEffect(() => {
    if (token) fetchProperties();
  }, [token, fetchProperties]);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    const address = e.target.address.value;
    try {
      await axios.post(`${GATEWAY_URL}/api/users/register-property`, { address }, config);
      setShowPropertyModal(false);
      fetchProperties();
    } catch (err) { 
      alert("Failed to register property."); 
    }
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    const kwhUsed = parseFloat(e.target.kwh.value);
    try {
      await axios.post(`${GATEWAY_URL}/api/billing/ingest`, { 
        propertyId: selectedPropertyId, 
        kwhUsed 
      }, config);
      setShowIngestModal(false);
    } catch (err) { 
      alert("Ingestion failed"); 
    }
  };

  const handleStartSimulation = async () => {
    if (!selectedPropertyId) return alert('Select a property first');
    try {
      await axios.post(`${GATEWAY_URL}/api/billing/simulator/start`, { propertyId: selectedPropertyId }, config);
      setSimulationRunning(true);
    } catch (err) {
      console.error('Start simulation failed', err);
      alert('Failed to start simulation');
    }
  };

  const handleStopSimulation = async () => {
    if (!selectedPropertyId) return alert('Select a property first');
    try {
      await axios.post(`${GATEWAY_URL}/api/billing/simulator/stop`, { propertyId: selectedPropertyId }, config);
      setSimulationRunning(false);
    } catch (err) {
      console.error('Stop simulation failed', err);
      alert('Failed to stop simulation');
    }
  };

  const formatGeneratedDate = (ts) => {
    if (!ts) return 'N/A';
    const date = parseUtcTimestamp(ts);
    return date ? date.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Bucharest'
    }) : 'N/A';
  };

  const formatRomanianTime = (ts) => {
    if (!ts) return 'N/A';
    const date = parseUtcTimestamp(ts);
    return date ? date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Bucharest'
    }) : 'N/A';
  };

  const latest = reportData[reportData.length - 1] || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Property Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Building size={20}/></div>
          <select 
            value={selectedPropertyId} 
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer w-full md:w-auto"
          >
            {properties.length === 0 && <option value="">No Properties Registered</option>}
            {properties.map(p => (
              <option key={p.propertyId} value={p.propertyId}>
                {p.address}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPropertyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
          >
            <Plus size={16}/> 
          </button>
          <button 
            disabled={!selectedPropertyId}
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-bold transition disabled:opacity-50"
          >
            <Activity size={16}/>
          </button>
          <button
            disabled={!selectedPropertyId || simulationRunning}
            onClick={handleStartSimulation}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
          >
            Start Simulation
          </button>
          <button
            disabled={!selectedPropertyId || !simulationRunning}
            onClick={handleStopSimulation}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
          >
            Stop Simulation
          </button>
        </div>
      </div>

      {loading && selectedPropertyId && reportData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
          <RefreshCw className="animate-spin" />
          <p>Analyzing Energy Data...</p>
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Most Recent Consumption" value={`${latest.kwhUsed ? latest.kwhUsed.toFixed(2) : 0} kWh`} icon={<Zap/>} color="blue" />
            <StatCard label="Last Environmental Impact" value={`${latest.carbonScore ? latest.carbonScore.toFixed(4) : 0} kg CO2`} icon={<Leaf/>} color="green" />
            <StatCard 
              label="Grid Carbon Intensity" 
              value={latest.status ? latest.status.toUpperCase() : "STABLE"} 
              icon={<Activity/>} 
              color={statusToColorKey(latest.status)} 
            />
          </div>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="font-bold mb-6 flex items-center gap-2"><History size={18} className="text-blue-500"/> Consumption Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="createdAt" 
                      interval={Math.floor(reportData.length / 5) || 0} 
                      tick={<MultiLineTick />} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      labelFormatter={(val) => formatGeneratedDate(val)}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                    />
                    <Bar dataKey="kwhUsed" radius={[4, 4, 0, 0]}>
                      {reportData.map((e, i) => <Cell key={i} fill={statusToHex(e.status)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl flex flex-col gap-4">
              <div>
                <h4 className="text-yellow-400 font-bold flex items-center gap-2 mb-2"><Leaf size={18}/> Real-time Actionable Advice</h4>
                <p className="text-gray-300 italic">"{ latest.recommendationMessage || 'System is stable. Continuous carbon telemetry active.'}</p>
                <p className="text-xs text-gray-400 mt-3">
                  Source: <a href="https://api.carbonintensity.org.uk/" target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200 underline">api.carbonintensity.org.uk</a>
                </p>
              </div>
              {latestAdvice[selectedPropertyId] && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                  <h4 className="text-green-400 font-bold text-sm mb-2">🌱 Greenest Window</h4>
                  <p className="text-green-100 text-sm italic">{latestAdvice[selectedPropertyId]}</p>
                </div>
              )}
              <div className="flex-shrink-0 bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
                <span className="text-xs uppercase tracking-widest font-bold text-gray-400 block mb-1">Last Update</span>
                <span className="font-mono text-sm">{latest.createdAt ? formatRomanianTime(latest.createdAt) : 'N/A'}</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-3">
              <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-green-500"/> Carbon Footprint Over Time</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData} margin={{ bottom: 20 }}>
                    <defs>
                      <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="createdAt" 
                      interval={Math.floor(reportData.length / 5) || 0} 
                      tick={<MultiLineTick />} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      labelFormatter={(val) => formatGeneratedDate(val)}
                      contentStyle={{borderRadius: '12px', border: 'none'}} 
                    />
                    <Area type="monotone" dataKey="carbonScore" stroke="#10b981" strokeWidth={3} fill="url(#splitColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- Modals --- */}
      {showPropertyModal && (
        <Modal title="Register New Property" onClose={() => setShowPropertyModal(false)}>
          <form onSubmit={handleAddProperty} className="space-y-4">
            <p className="text-sm text-gray-500">Enter the physical address.</p>
            <input 
              name="address" 
              placeholder="e.g. Strada 21 Decembrie 2, Cluj-Napoca" 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gray-900 outline-none transition" 
              required 
            />
            <button type="submit" className="w-full bg-gray-900 text-white p-4 rounded-2xl font-bold hover:bg-gray-800 transition shadow-lg shadow-gray-900/10">
              Register Property
            </button>
          </form>
        </Modal>
      )}

      {showIngestModal && (
        <Modal title="Log Consumption" onClose={() => setShowIngestModal(false)}>
          <form onSubmit={handleIngest} className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 mb-2">
               <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Selected Property</p>
               <p className="text-gray-900 font-medium truncate">
                {properties.find(p => p.propertyId === selectedPropertyId)?.address}
               </p>
            </div>
            <input 
              name="kwh" 
              type="number" 
              step="1"
              placeholder="Total kWh used since last reading" 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-yellow-400 outline-none transition" 
              required 
            />
            <button type="submit" className="w-full bg-yellow-400 text-gray-900 p-4 rounded-2xl font-bold hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/10">
              Submit Consumption
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400"><X size={20}/></button>
      </div>
      {children}
    </div>
  </div>
);

export default Dashboard;