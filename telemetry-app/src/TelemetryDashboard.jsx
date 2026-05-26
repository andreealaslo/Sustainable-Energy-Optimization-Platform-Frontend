import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area 
} from 'recharts';
import { 
  Cpu, Zap, ShieldAlert, Server, HardDrive, CpuIcon, Activity, RefreshCw 
} from 'lucide-react';

const containerColors = {
  recommendation: '#6366f1', // Indigo
  carbon: '#10b981',         // Emerald
  kafka: '#f59e0b',          // Amber
  rabbitmq: '#f97316',       // Orange
  postgres: '#3b82f6',       // Blue
  notification: '#ec4899',   // Pink
  api: '#8b5cf6',            // Purple
  nginx: '#64748b',          // Slate
  zookeeper: '#14b8a6',      // Teal
  user: '#a855f7',           // Purple-Light
  billing: '#eab308'         // Yellow
};

const TelemetryDashboard = ({ latestTelemetry = null }) => {
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);

  useEffect(() => {
    if (!latestTelemetry) return;

    setCurrentMetrics(latestTelemetry);
    setMetricsHistory(prev => {
      const updated = [...prev, latestTelemetry];
      // Keep trailing 15 transactional logs to prevent client DOM leaks
      if (updated.length > 15) return updated.slice(1);
      return updated;
    });
  }, [latestTelemetry]);

  // Map individual key-pairs to structured chart arrays dynamically
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
      
      {/* Infrastructure Topline Cards */}
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

      {/* Main Analysis Charting Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Horizontal Container Component Load Breakdown */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 md:col-span-2">
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

        {/* Real-time Infrastructure Footprint Gauge Information Box */}
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-yellow-400 font-bold flex items-center gap-2 mb-3">
              <Activity size={18}/> Green-Ops Core Status
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Polling native Linux container metadata via mapped host domain socket <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-amber-200">/var/run/docker.sock</code>.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-gray-400">Model Definition</span>
                <span className="font-medium text-gray-200">Linear Power Model</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-gray-400">Baseline Capacity</span>
                <span className="font-medium text-gray-200">15.00 Watts</span>
              </div>
              <div className="flex justify-between pb-2 text-sm">
                <span className="text-gray-400">Peak Scaling Threshold</span>
                <span className="font-medium text-gray-200">60.00 Watts</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Telemetry Generation Frame</span>
            <span className="font-mono text-xs truncate block text-indigo-300">{new Date(currentMetrics.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Dynamic Structural Power Load Continuum Timeline */}
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
                  tickFormatter={(t) => new Date(t).toLocaleTimeString()} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}}
                />
                <YAxis domain={[10, 65]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
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