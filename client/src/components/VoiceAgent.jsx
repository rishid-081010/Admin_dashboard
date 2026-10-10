import React, { useState } from 'react';
import { Mic, Activity, PhoneOff, PhoneOutgoing, Clock } from 'lucide-react';

export default function VoiceAgent() {
  const [timeFilter, setTimeFilter] = useState('All Time');

  const data = {
    'Daily': { calls: '1,240', drops: '420', leads: '185', duration: '1m 12s', sarah: '840', james: '400' },
    'Weekly': { calls: '8,450', drops: '3,100', leads: '1,420', duration: '1m 25s', sarah: '5,100', james: '3,350' },
    'Monthly': { calls: '32,100', drops: '14,200', leads: '5,800', duration: '1m 35s', sarah: '18,400', james: '13,700' },
    'All Time': { calls: '79,903', drops: '41,200', leads: '14,290', duration: '1m 42s', sarah: '45,102', james: '34,801' }
  };

  const currentData = data[timeFilter];

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            AI VOICE AGENT CENTRE
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Connected to Vapi.ai and Supabase (79,903 call logs).
          </p>
        </div>
        <div className="flex gap-2 bg-[#0f172a]/80 p-1 rounded-xl border border-[#1e293b]">
          {['Daily', 'Weekly', 'Monthly', 'All Time'].map(filter => (
            <button 
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${timeFilter === filter ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <PhoneOutgoing className="w-6 h-6 text-blue-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Total Calls Dialed</div>
          <div className="text-3xl font-bold text-white transition-all">{currentData.calls}</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <PhoneOff className="w-6 h-6 text-red-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Voicemails/Drops</div>
          <div className="text-3xl font-bold text-white transition-all">{currentData.drops}</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <Activity className="w-6 h-6 text-green-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Hot Leads Generated</div>
          <div className="text-3xl font-bold text-white transition-all">{currentData.leads}</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <Clock className="w-6 h-6 text-purple-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Avg Call Duration</div>
          <div className="text-3xl font-bold text-white transition-all">{currentData.duration}</div>
        </div>
      </div>

      <div className="flex-1 bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] flex flex-col p-6">
        <h3 className="font-bold text-white mb-6">Agent Persona Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-[#1e293b] rounded-xl p-5 bg-[#0a1321]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Mic className="w-5 h-5 text-blue-400" /></div>
                <div>
                  <h4 className="text-white font-bold">"Sarah" - British Accent</h4>
                  <span className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Calls Handled:</span> <span className="text-white transition-all">{currentData.sarah}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Conversion Rate:</span> <span className="text-white">18.4%</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Cost per Lead:</span> <span className="text-white">$1.12</span></div>
            </div>
          </div>
          <div className="border border-[#1e293b] rounded-xl p-5 bg-[#0a1321]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"><Mic className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <h4 className="text-white font-bold">"James" - American Accent</h4>
                  <span className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Calls Handled:</span> <span className="text-white transition-all">{currentData.james}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Conversion Rate:</span> <span className="text-white">16.1%</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Cost per Lead:</span> <span className="text-white">$1.45</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
