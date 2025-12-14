import React from 'react';
import { LogEntry } from '../types';
import { BarChart, Activity, Users, Send } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  logs: LogEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ logs }) => {
  const sentCount = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const queuedCount = logs.filter(l => l.status === 'queued').length;

  // Group logs by hour for the chart (mock data structure simulation)
  const data = [
    { name: '10 AM', sent: 4, failed: 0 },
    { name: '11 AM', sent: 7, failed: 1 },
    { name: '12 PM', sent: 12, failed: 0 },
    { name: '1 PM', sent: 8, failed: 2 },
    { name: '2 PM', sent: 15, failed: 0 },
  ];

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Sent" 
          value={sentCount} 
          icon={Send} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Failed Delivery" 
          value={failedCount} 
          icon={Activity} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Active Contacts" 
          value="142" 
          icon={Users} 
          color="bg-blue-500" 
        />
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-indigo-400" />
          Traffic Volume
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="sent" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;