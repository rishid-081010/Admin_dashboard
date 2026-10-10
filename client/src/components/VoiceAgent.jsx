import React from 'react';
import { Mic, Activity, PhoneOff, PhoneOutgoing, Clock } from 'lucide-react';

export default function VoiceAgent() {
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
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-white/10 text-white">Daily</button>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white">Weekly</button>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white">Monthly</button>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-white">All Time</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <PhoneOutgoing className="w-6 h-6 text-blue-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Total Calls Dialed</div>
          <div className="text-3xl font-bold text-white">79,903</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <PhoneOff className="w-6 h-6 text-red-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Voicemails/Drops</div>
          <div className="text-3xl font-bold text-white">41,200</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <Activity className="w-6 h-6 text-green-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Hot Leads Generated</div>
          <div className="text-3xl font-bold text-white">14,290</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <Clock className="w-6 h-6 text-purple-400 mb-3" />
          <div className="text-sm font-medium text-slate-400 mb-1">Avg Call Duration</div>
          <div className="text-3xl font-bold text-white">1m 42s</div>
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
              <div className="flex justify-between text-sm"><span className="text-slate-400">Calls Handled:</span> <span className="text-white">45,102</span></div>
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
              <div className="flex justify-between text-sm"><span className="text-slate-400">Calls Handled:</span> <span className="text-white">34,801</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Conversion Rate:</span> <span className="text-white">16.1%</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Cost per Lead:</span> <span className="text-white">$1.45</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
