import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area 
} from 'recharts';
import { TrendingUp, Leaf, Zap, History } from 'lucide-react';

const GATEWAY_URL = 'http://localhost:8080';

const Dashboard = ({ token }) => {
  const [data, setData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use a fixed property ID for the demo, or extract it from user token/context
  const propertyId = "METER-CBEAA6CF"; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Fetch Billing History
        const billingRes = await axios.get(`${GATEWAY_URL}/api/recommendations/property/${propertyId}`, config);
        
        // 2. Fetch Recommendations/Carbon Scores
        const recRes = await axios.get(`${GATEWAY_URL}/api/recommendations/property/${propertyId}`, config);

        // Sort billing history by date
        const sortedHistory = billingRes.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        setData(sortedHistory);
        setRecommendations(recRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 font-medium">
      Fetching Energy Profile...
    </div>
  );

  const latestRec = recommendations[recommendations.length - 1] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Zap size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Last Reading</p>
            <p className="text-2xl font-bold">{data.length > 0 ? data[data.length-1].kwhUsed : 0} <span className="text-sm font-normal text-gray-400">kWh</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 bg-green-50 rounded-2xl text-green-600"><Leaf size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Carbon Score</p>
            <p className="text-2xl font-bold text-green-600">{latestRec.carbonScore || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="p-4 bg-purple-50 rounded-2xl text-purple-600"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Current Status</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              latestRec.status === 'RED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            }`}>
              {latestRec.status || 'STABLE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Consumption Trend */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <History size={18} className="text-blue-500" /> Usage History
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="readingDate" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="kwhUsed" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.kwhUsed > 50 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carbon Intensity (FaaS Results) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-8 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" /> Carbon Intensity (FaaS)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recommendations}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis hide dataKey="id" />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="carbonScore" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ai Recommendations */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">Smart Analysis</h3>
          <p className="text-slate-400 text-sm max-w-lg mb-6">
            Based on your last {data.length} readings, our system suggests:
          </p>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
            <p className="italic text-yellow-400">"{latestRec.recommendationMessage || 'Data trend looks healthy. Continue monitoring consumption peaks during morning hours.'}"</p>
          </div>
        </div>
        <Zap className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64" />
      </div>
    </div>
  );
};

export default Dashboard;