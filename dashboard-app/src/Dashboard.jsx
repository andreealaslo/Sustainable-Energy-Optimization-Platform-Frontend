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

const GATEWAY_URL = 'http://localhost:8080';
const MultiLineTick = ({ x, y, payload }) => {
  if (!payload.value) return null;
  
  const date = new Date(payload.value);
  date.setHours(date.getHours() + 2);
  
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#141618" fontSize={10} fontWeight="500">
        <tspan x="0" dy="1em">{dateStr}</tspan>
        <tspan x="0" dy="1.2em" fill="#6c767e">{timeStr}</tspan>
      </text>
    </g>
  );
};


const Dashboard = ({ token }) => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);

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

  useEffect(() => {
    if (token) fetchProperties();
  }, [token, fetchProperties]);

  useEffect(() => {
    fetchPropertyDetails();
  }, [selectedPropertyId, fetchPropertyDetails]);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    const address = e.target.address.value;
    try {
      await axios.post(`${GATEWAY_URL}/api/users/register-property`, { address }, config);
      setShowPropertyModal(false);
      fetchProperties();
    } catch (err) { 
      alert("Failed to register property. Ensure the backend endpoint /register-property exists."); 
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
      setTimeout(fetchPropertyDetails, 1500);
    } catch (err) { alert("Ingestion failed"); }
  };

  const formatGeneratedDate = (ts) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    d.setHours(d.getHours() + 2);
    return d.toLocaleString();
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
            <Plus size={16}/> New Property
          </button>
          <button 
            disabled={!selectedPropertyId}
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl text-sm font-bold transition disabled:opacity-50"
          >
            <Activity size={16}/> Log Consumption
          </button>
        </div>
      </div>

      {loading && selectedPropertyId ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
          <RefreshCw className="animate-spin" />
          <p>Analyzing Energy Data...</p>
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Most Recent Consumption" value={`${latest.kwhUsed || 0} kWh`} icon={<Zap/>} color="blue" />
            <StatCard label="Last Environmental Impact" value={`${latest.carbonScore || 0} pts`} icon={<Leaf/>} color="green" />
            <StatCard 
              label="System Status" 
              value={latest.status || "STABLE"} 
              icon={<Activity/>} 
              color={latest.status === 'RED' ? 'red' : 'green'} 
            />
          </div>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold mb-6 flex items-center gap-2"><History size={18} className="text-blue-500"/> Consumption Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="createdAt" 
                      interval={0} 
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
                      {reportData.map((e, i) => <Cell key={i} fill={e.status === 'RED' ? '#ef4444' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-green-500"/> Carbon Score History</h3>
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
                      interval={0} 
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