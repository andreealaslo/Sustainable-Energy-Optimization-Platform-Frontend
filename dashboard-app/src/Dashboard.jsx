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

const Dashboard = ({ token, refreshTrigger, latestAdvice = {} }) => {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  const [forecastTimeline, setForecastTimeline] = useState([]);
  const [greenestWindowString, setGreenestWindowString] = useState('');

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

  const fetchLiveGridTimeline = useCallback(async () => {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/recommendations/grid-forecast`, config);
      if (!res.data || res.data.length === 0) return;

      let absoluteMinVal = Infinity;
      let rawGreenestTargetItem = null;

      res.data.forEach(item => {
        const forecastVal = item.intensity?.forecast ?? Infinity;
        if (forecastVal < absoluteMinVal) {
          absoluteMinVal = forecastVal;
          rawGreenestTargetItem = item; 
        }
      });

      let targetMatchString = "";
      if (rawGreenestTargetItem && rawGreenestTargetItem.from) {
        try {
          const timePart = rawGreenestTargetItem.from.split('T')[1].replace('Z', '');
          const hour = parseInt(timePart.split(':')[0], 10);
          const startHourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
          const endHour = (hour + 1) % 24;
          const endHourStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
          targetMatchString = `${startHourStr} - ${endHourStr}`;
        } catch (e) {}
      }
      setGreenestWindowString(targetMatchString);

      const topOfHourEntries = res.data.filter(item => {
        const rawFrom = item.from || '';
        if (rawFrom.includes('T')) {
          const timePart = rawFrom.split('T')[1].replace('Z', '');
          const minute = timePart.split(':')[1];
          return minute === '00';
        }
        return true;
      });

      const convertedTimeline = topOfHourEntries.map(item => {
        const rawFrom = item.from || '';
        let displayWindow = "00:00 - 00:00";
        
        try {
          if (rawFrom.includes('T')) {
            const timePart = rawFrom.split('T')[1].replace('Z', '');
            const hour = parseInt(timePart.split(':')[0], 10);
            const minute = timePart.split(':')[1];
            
            const startHourStr = hour < 10 ? `0${hour}:${minute}` : `${hour}:${minute}`;
            const endHour = (hour + 1) % 24;
            const endHourStr = endHour < 10 ? `0${endHour}:${minute}` : `${endHour}:${minute}`;
            displayWindow = `${startHourStr} - ${endHourStr}`;
          }
        } catch(e) { 
          displayWindow = rawFrom; 
        }

        const intensityObj = item.intensity || {};
        const apiIndex = (intensityObj.index || 'moderate').toLowerCase();
        
        let conciseIndex = "M";
        let labelText = "Baseline Grid";
        let helperDesc = "Standard Load";

        if (apiIndex === 'very low') { 
          conciseIndex = "VL"; labelText = "Optimal Window"; helperDesc = "Eco Ingest Active"; 
        } else if (apiIndex === 'low') { 
          conciseIndex = "L"; labelText = "Optimal Window"; helperDesc = "Plug In"; 
        } else if (apiIndex === 'high') { 
          conciseIndex = "H"; labelText = "Peak Pollution"; helperDesc = "Unplug"; 
        } else if (apiIndex === 'very high') { 
          conciseIndex = "VH"; labelText = "Critical Surge"; helperDesc = "Avoid Usage"; 
        }

        return {
          timeWindow: displayWindow,
          index: conciseIndex,
          label: labelText,
          desc: helperDesc
        };
      });

      setForecastTimeline(convertedTimeline);
    } catch (err) {
      console.error("Could not fetch live grid demand timeline tracking data bounds:", err);
    }
  }, [token]);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchPropertyDetails();
      fetchLiveGridTimeline(); 
    }
  }, [selectedPropertyId, refreshTrigger, fetchPropertyDetails, fetchLiveGridTimeline]);

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

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-3">
              <div className="flex flex-col mb-4">
                <h3 className="font-bold flex items-center gap-2 text-gray-800">
                  <Zap size={18} className="text-yellow-500" fill="currentColor"/> 24-Hour Demand Flexibility Forecast
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Cross-referencing live load predictions to isolate efficiency windows across localized wall-clock thresholds.
                </p>
              </div>
              
              <div className="flex flex-row overflow-x-auto gap-4 py-4 px-1 select-none scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent custom-scrollbar">
                {forecastTimeline.map((block, idx) => {
                  const isGreen = block.index === 'L' || block.index === 'VL';
                  const isRed = block.index === 'H' || block.index === 'VH';
                  
                  const isAbsoluteGreenest = block.timeWindow === greenestWindowString && greenestWindowString !== "";

                  let cardStyles = "bg-yellow-50/40 border-yellow-200/70 text-yellow-700";
                  let badgeStyles = "bg-yellow-100/80 text-yellow-800 border-yellow-200";
                  let svgFill = "text-yellow-500";
                  
                  if (isGreen) {
                    cardStyles = "bg-emerald-50/50 border-emerald-100 text-emerald-800";
                    badgeStyles = "bg-emerald-100/70 text-emerald-700 border-emerald-200/50";
                    svgFill = "text-emerald-500";
                  } else if (isRed) {
                    cardStyles = "bg-rose-50/50 border-rose-100 text-rose-800";
                    badgeStyles = "bg-rose-100/70 text-rose-700 border-rose-200/50";
                    svgFill = "text-rose-500";
                  }

                  const highlightStyles = isAbsoluteGreenest 
                    ? "ring-2 ring-emerald-400 ring-offset-2 shadow-lg" 
                    : "";

                  return (
                    <div 
                      key={idx} 
                      className={`flex-shrink-0 w-44 p-4 rounded-2xl border flex flex-col items-center text-center justify-between transition hover:shadow-md duration-200 ${cardStyles} ${highlightStyles}`}
                    >
                      <span className="text-xs font-black tracking-tight text-gray-500 mb-2 flex items-center gap-1 block">
                        {block.timeWindow}
                        {isAbsoluteGreenest && (
                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-100 px-1 py-0.25 rounded uppercase tracking-wider animate-pulse">
                            ★ Greenest
                          </span>
                        )}
                      </span>
                      
                      <div className="my-2 flex flex-col items-center gap-1">
                        <svg className={`w-12 h-12 ${svgFill}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-black text-sm tracking-wide block">
                          {block.index}
                        </span>
                      </div>

                      <div className="space-y-1.5 w-full mt-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg border block ${badgeStyles}`}>
                          {block.label}
                        </span>
                        <span className="text-[11px] font-bold text-gray-600 block truncate">
                          {block.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {forecastTimeline.length === 0 && (
                  <div className="w-full text-center py-6 text-sm italic text-gray-400">
                    Awaiting grid lookahead serialization synchronization...
                  </div>
                )}
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