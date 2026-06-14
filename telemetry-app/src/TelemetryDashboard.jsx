import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area 
} from 'recharts';
import { 
  Cpu, Zap, ShieldAlert, Server, HardDrive, CpuIcon, Activity, RefreshCw 
} from 'lucide-react';

const containerColors = {
  recommendation: '#6366f1', 
  carbon: '#10b981',         
  kafka: '#f59e0b',          
  rabbitmq: '#f97316',       
  postgres: '#3b82f6',       
  notification: '#ec4899',   
  api: '#8b5cf6',            
  nginx: '#64748b',          
  zookeeper: '#14b8a6',      
  user: '#a855f7',          
  billing: '#eab308'         
};

const parseUtcTimestamp = (value) => {
  if (!value) return null;
  const hasTimeZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasTimeZone ? value : `${value}Z`);
};

const formatToRomanianTime = (isoString) => {
  if (!isoString) return 'N/A';
  const date = parseUtcTimestamp(isoString);
   return date ? date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Bucharest'
    }) : 'N/A';
};

const TelemetryDashboard = ({ latestTelemetry = null }) => {
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);

  useEffect(() => {
    if (!latestTelemetry) return;

    setCurrentMetrics(latestTelemetry);
    setMetricsHistory(prev => {
      const updated = [...prev, latestTelemetry];
      if (updated.length > 15) return updated.slice(1);
      return updated;
    });
  }, [latestTelemetry]);

  const buildContainerChartData = () => {
    if (!currentMetrics || !currentMetrics.containerCpuMetrics) return [];
    return Object.entries(currentMetrics.containerCpuMetrics).map(([name, value]) => ({
      name: name.toUpperCase(),
      cpu: value,
      fillColor: containerColors[name.toLowerCase()] || '#3b82f6'
    })).sort((a, b) => b.cpu - a.cpu);
  };

  if (!currentMetrics) {
    return (
      <div className="h-96 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-gray-400 gap-4 shadow-sm">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
        <p className="font-bold text-slate-700">Awaiting Ingestion Event Activity...</p>
        <p className="text-xs text-gray-400 max-w-xs text-center">Trigger a smart meter simulation frame from the household dashboard to capture host cgroup telemetry streams.</p>
      </div>
    );
  }

  const chartData = buildContainerChartData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600"><Server size={24}/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Monitored Stack Cluster</p>
            <p className="text-2xl font-black text-gray-800">{chartData.length} Live Containers</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-600"><Zap size={24}/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Dynamic Compute Power</p>
            <p className="text-2xl font-black text-gray-800">{currentMetrics.totalPowerWatts?.toFixed(2)} Watts</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert size={24}/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Transaction Carbon Overhead</p>
            <p className="text-2xl font-black text-gray-800">{currentMetrics.carbonOverheadMg?.toFixed(4)} mg CO₂</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-3">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Cpu size={18} className="text-indigo-500"/> Service Load Diagnostics
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} unit="%" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#141618', fontSize: 11, fontWeight: 'bold'}} />
                <Tooltip 
                  formatter={(value) => [`${value}% CPU Usage`, 'Load Capacity']}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                />
                <Bar dataKey="cpu" radius={[0, 4, 4, 0]} barSize={14}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-3">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <CpuIcon size={18} className="text-emerald-500"/> Infrastructure Cluster Power Tracking (Watts)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsHistory}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(t) => formatToRomanianTime(t)} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}}
                />
                <YAxis domain={[10, 65]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  labelFormatter={(t) => formatToRomanianTime(t)}
                  contentStyle={{borderRadius: '12px', border: 'none'}}
                />
                <Area type="monotone" dataKey="totalPowerWatts" stroke="#3b82f6" strokeWidth={3} fill="url(#powerGrad)" name="Total Watts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TelemetryDashboard;