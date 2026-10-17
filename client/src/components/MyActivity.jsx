import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, List, Search, Phone, MessageSquare, 
  ChevronDown, RefreshCw, ExternalLink, Play, Pause, Volume2, 
  Building2, MapPin, User, Hash, CheckCircle2, AlertCircle, Clock, 
  ArrowRight, X, UserCheck, ShieldCheck, Flame, Filter
} from 'lucide-react';
import { activityService, STAGE_CONFIG } from '../utils/activityService';

export default function MyActivity({ currentUser }) {
  const [view, setView] = useState('board');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('144'); // Default: Vikram
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStageFilter, setActiveStageFilter] = useState('all');
  const [sortBy, setSortBy] = useState('oldest'); // 'oldest' (FIFO Priority: earlier = higher priority) or 'newest'

  // Modal / Detail Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Initial load of agents
  useEffect(() => {
    const initAgents = async () => {
      const list = await activityService.getAgents();
      setAgents(list);

      // Match current logged-in user email or name to an agent
      if (currentUser?.email) {
        const lowerEmail = currentUser.email.toLowerCase();
        const matched = list.find(a => (a.email || '').toLowerCase() === lowerEmail);
        if (matched) {
          setSelectedAgentId(matched.id);
          return;
        }
      }

      // Default to Vikram if present, otherwise first agent
      const hasVikram = list.find(a => a.id === '144');
      if (hasVikram) {
        setSelectedAgentId('144');
      } else if (list.length > 0) {
        setSelectedAgentId(list[0].id);
      }
    };
    initAgents();
  }, [currentUser]);

  // Fetch activity cards whenever selectedAgentId or sortBy changes
  const loadActivity = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await activityService.getActivity(selectedAgentId, {
        limit: 100,
        sortBy
      });
      setItems(data.items || []);
      setTotalItems(data.total || (data.items || []).length);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [selectedAgentId, sortBy]);

  // Open item detail modal & load audio / transcript timeline
  const handleOpenDetail = async (item) => {
    setSelectedItem(item);
    setAudioPlaying(false);
    setLoadingTimeline(true);
    try {
      const tl = await activityService.getItemTimeline(item.id);
      setTimeline(tl);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Stage change handler
  const handleStageChange = async (itemId, newStageId) => {
    const res = await activityService.updateStage(itemId, newStageId, selectedAgentId);
    if (res.success) {
      // Optimistic update
      setItems(prev => prev.map(it => {
        if (it.id === itemId) {
          const meta = STAGE_CONFIG[newStageId] || { name: 'Updated', key: 'other', color: '#385175' };
          return {
            ...it,
            stage_id: newStageId,
            stage_name: meta.name,
            stage_key: meta.key,
            stage_color: meta.color
          };
        }
        return it;
      }));
      if (selectedItem?.id === itemId) {
        const meta = STAGE_CONFIG[newStageId] || { name: 'Updated', key: 'other', color: '#385175' };
        setSelectedItem(prev => ({
          ...prev,
          stage_id: newStageId,
          stage_name: meta.name,
          stage_key: meta.key,
          stage_color: meta.color
        }));
      }
    }
  };

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    let list = items;
    if (activeStageFilter !== 'all') {
      list = list.filter(it => it.stage_key === activeStageFilter);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(it => 
      (it.title || '').toLowerCase().includes(q) ||
      (it.project_name || '').toLowerCase().includes(q) ||
      (it.location || '').toLowerCase().includes(q) ||
      (it.owner_name || '').toLowerCase().includes(q) ||
      (it.unit_number || '').toLowerCase().includes(q) ||
      (it.contact_number || '').includes(q)
    );
  }, [items, searchQuery, activeStageFilter]);

  // Columns definition for Kanban
  const kanbanColumns = [
    { key: 'ready', title: 'Ready for Call', border: 'border-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400', stageId: 'DT1100_44:ASQ_READY_CALL' },
    { key: 'contacted', title: 'Contacted / In Progress', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', stageId: 'DT1100_44:UC_5B620Q' },
    { key: 'has_property', title: 'Has Property', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', stageId: 'DT1100_44:UC_HGMTGR' },
    { key: 'interested', title: 'Interested to Sell/Rent', border: 'border-emerald-500/40 shadow-emerald-500/10', bg: 'bg-emerald-500/15', text: 'text-emerald-400', highlight: true, stageId: 'DT1100_44:UC_4IMVM8' },
    { key: 'success', title: 'Won / Deal Converted', border: 'border-teal-500/30', bg: 'bg-teal-500/10', text: 'text-teal-400', stageId: 'DT1100_44:SUCCESS' },
    { key: 'failed', title: 'Archived / Lost', border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', stageId: 'DT1100_44:FAIL' }
  ];

  // Group items by kanban column
  const columnData = useMemo(() => {
    const grouped = {};
    kanbanColumns.forEach(c => { grouped[c.key] = []; });
    
    filteredItems.forEach(item => {
      let k = item.stage_key;
      if (k === 'no_answer') k = 'contacted';
      if (k === 'not_interested') k = 'failed';
      if (k === 'import') k = 'ready';
      if (!grouped[k]) k = 'ready';
      grouped[k].push(item);
    });
    return grouped;
  }, [filteredItems]);

  // Selected agent object
  const currentAgent = agents.find(a => a.id === selectedAgentId) || {
    id: selectedAgentId,
    name: selectedAgentId === 'all' ? 'All Telesales Fleet' : `Agent #${selectedAgentId}`,
    email: '',
    photo: null
  };

  const filteredAgentsList = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const q = agentSearch.toLowerCase().trim();
    return agents.filter(a => 
      (a.name || '').toLowerCase().includes(q) || 
      (a.email || '').toLowerCase().includes(q)
    );
  }, [agents, agentSearch]);

  const interestedCount = items.filter(it => it.stage_key === 'interested').length;
  const contactedCount = items.filter(it => it.stage_key === 'contacted' || it.stage_key === 'no_answer').length;
  const readyCount = items.filter(it => it.stage_key === 'ready' || it.stage_key === 'import').length;
  const wonCount = items.filter(it => it.stage_key === 'success').length;

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 selection:bg-blue-500/30">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>MY ACTIVITY &amp; PIPELINE</span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Bitrix24 Live Sync
              </span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time telesales owner cards, voice recordings, sentiment qualification, and agent follow-up.
          </p>
        </div>

        {/* Right Controls: Agent Selector, Refresh & View Mode */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Agent Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAgentDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 bg-[#09182b] hover:bg-[#0f243d] border border-[#233b59] px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
                {currentAgent.photo ? (
                  <img src={currentAgent.photo} alt={currentAgent.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-300" />
                )}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Responsible</span>
                <span className="text-xs font-bold text-white">{currentAgent.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Agent Select Menu */}
            {isAgentDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#061324] border border-[#233b59] rounded-2xl shadow-2xl z-50 p-2 animate-fade-in backdrop-blur-xl">
                <div className="p-2 border-b border-white/[0.08]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search active agent..."
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                      className="w-full bg-[#030a13] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar py-1 space-y-0.5">
                  <button
                    onClick={() => { setSelectedAgentId('all'); setIsAgentDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      selectedAgentId === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold">All Leads / Fleet Pool</div>
                      <div className="text-[10px] text-slate-400">View cards across all agents</div>
                    </div>
                  </button>

                  {filteredAgentsList.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedAgentId(a.id); setIsAgentDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        selectedAgentId === a.id ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                        {a.photo ? (
                          <img src={a.photo} alt={a.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold truncate">{a.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{a.email || `ID: ${a.id}`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Priority Sort Button (Earlier/Older leads = Higher Priority) */}
          <button
            onClick={() => setSortBy(prev => prev === 'oldest' ? 'newest' : 'oldest')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm cursor-pointer ${
              sortBy === 'oldest'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : 'bg-[#09182b] text-slate-300 border-[#233b59] hover:bg-[#0f243d] hover:text-white'
            }`}
            title="Every interested lead is important: earlier (older) leads have higher priority"
          >
            <Clock className={`w-3.5 h-3.5 ${sortBy === 'oldest' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>{sortBy === 'oldest' ? 'FIFO Priority (Oldest First)' : 'Newest First'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadActivity(true)}
            disabled={refreshing}
            className="p-2.5 bg-[#09182b] hover:bg-[#0f243d] border border-[#233b59] rounded-xl text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
            title="Refresh Bitrix24 cards"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Board / List Switcher */}
          <div className="flex gap-1 bg-[#071322] border border-[#1b2b3d] p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === 'board' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Quick Stats Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="bg-[#081729]/80 border border-[#1d324d] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Assigned</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalItems}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Hash className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#081729]/80 border border-[#1d324d] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Ready for Call</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{readyCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Phone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#081729]/80 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between shadow-lg shadow-emerald-500/5">
          <div>
            <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <span>Interested</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{interestedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#081729]/80 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between shadow-lg shadow-rose-500/5">
          <div>
            <div className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <span>Overdue (&gt;48h)</span>
              {items.filter(it => it.priority_level === 'critical').length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
            </div>
            <div className="text-xl font-bold text-rose-300 mt-0.5">
              {items.filter(it => it.priority_level === 'critical').length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#081729]/80 border border-[#1d324d] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Won / Success</div>
            <div className="text-xl font-bold text-teal-400 mt-0.5">{wonCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by owner name, project, unit, or phone number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#071526] border border-[#1b2f4a] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stage Filter Pills */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => setActiveStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStageFilter === 'all' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-[#081729] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            All Stages ({items.length})
          </button>
          <button
            onClick={() => setActiveStageFilter('interested')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeStageFilter === 'interested' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-[#081729] text-emerald-400 hover:text-white border border-emerald-500/20'
            }`}
          >
            <span>Interested ({interestedCount})</span>
          </button>
          <button
            onClick={() => setActiveStageFilter('contacted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStageFilter === 'contacted' 
                ? 'bg-cyan-600 text-white shadow-sm' 
                : 'bg-[#081729] text-cyan-400 hover:text-white border border-cyan-500/20'
            }`}
          >
            Contacted ({contactedCount})
          </button>
          <button
            onClick={() => setActiveStageFilter('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStageFilter === 'ready' 
                ? 'bg-sky-600 text-white shadow-sm' 
                : 'bg-[#081729] text-sky-400 hover:text-white border border-sky-500/20'
            }`}
          >
            Ready ({readyCount})
          </button>
        </div>
      </div>

      {/* Main Content Area: Board or List */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <div className="text-sm font-semibold text-white">Connecting to Bitrix24 SPA (Entity #1100)...</div>
            <div className="text-xs text-slate-400 mt-1">Retrieving cards assigned to {currentAgent.name}</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-[#071322]/50 border border-white/5 rounded-2xl">
            <AlertCircle className="w-10 h-10 text-slate-500 mb-2" />
            <div className="text-sm font-semibold text-white">No activity cards found</div>
            <div className="text-xs text-slate-400 max-w-sm mt-1">
              {searchQuery ? `No cards match "${searchQuery}". Try clearing the search.` : `There are currently no Telesales cards assigned to ${currentAgent.name}.`}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-all cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : view === 'board' ? (
          /* Kanban Board View */
          <div className="h-full overflow-x-auto custom-scrollbar pb-2">
            <div className="flex gap-4 min-w-max h-full">
              {kanbanColumns.map(col => {
                const colItems = columnData[col.key] || [];
                return (
                  <div
                    key={col.key}
                    className="w-[310px] flex flex-col h-full bg-[#081628] border border-[#1e3450] rounded-2xl shadow-xl overflow-hidden"
                  >
                    {/* Column Header */}
                    <div className="p-3.5 border-b border-[#1e3450] flex items-center justify-between bg-[#05101d]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.highlight ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                        <h3 className="font-bold text-xs text-white uppercase tracking-wider">{col.title}</h3>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${col.bg} ${col.text} border ${col.border}`}>
                        {colItems.length}
                      </span>
                    </div>

                    {/* Column Items Container */}
                    <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                      {colItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleOpenDetail(item)}
                          className={`bg-[#050f1c] border rounded-2xl p-3.5 cursor-pointer transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 relative group ${
                            col.highlight 
                              ? 'border-emerald-500/50 hover:border-emerald-400 bg-gradient-to-br from-[#051a14]/60 to-[#050f1c]' 
                              : 'border-[#1b2f48] hover:border-[#385987]'
                          }`}
                        >
                          {/* Green left accent border matching Image 1 */}
                          {col.highlight && (
                            <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-emerald-400 rounded-r-full shadow-lg shadow-emerald-400/50" />
                          )}

                          {/* Priority Ranking & SLA Waiting Badge (Earlier = Higher Priority) */}
                          <div className="flex items-center justify-between mb-2 pl-1.5 pr-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight inline-flex items-center gap-1.5 ${
                              item.priority_level === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                                : item.priority_level === 'high'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : item.priority_level === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              <span>Priority #{item.priority_rank || 1}</span>
                              <span className="text-white/30">•</span>
                              <span>{item.waiting_human || 'Recent'}</span>
                            </span>

                            {item.priority_level === 'critical' && (
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                                Overdue
                              </span>
                            )}
                          </div>

                          {/* Card Header matching Image 1 */}
                          <div className="flex items-start justify-between mb-2.5 pl-1.5">
                            <div>
                              <div className="text-[12px] font-bold text-white tracking-tight leading-snug">
                                Telesales - Owners data
                              </div>
                              <div className="text-[11px] font-mono font-semibold text-blue-400">
                                #{item.id}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              {item.contact_number && (
                                <a
                                  href={`tel:${item.contact_number}`}
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 hover:text-emerald-400 transition-colors"
                                  title="Direct Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {item.whatsapp_link && (
                                <a
                                  href={item.whatsapp_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 hover:text-emerald-400 transition-colors"
                                  title="WhatsApp Chat"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Responsible Person row */}
                          <div className="mb-2.5 pl-1.5 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium">Responsible person</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                                {currentAgent.photo ? (
                                  <img src={currentAgent.photo} alt={currentAgent.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3 h-3 text-blue-300" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-blue-400 truncate">{currentAgent.name}</span>
                            </div>
                          </div>

                          {/* Project Name */}
                          <div className="mb-1.5 pl-1.5">
                            <span className="text-[10px] text-slate-400 block font-medium">Project Name</span>
                            <span className="text-xs font-bold text-white block truncate leading-tight">
                              {item.project_name}
                            </span>
                          </div>

                          {/* Location */}
                          <div className="mb-1.5 pl-1.5">
                            <span className="text-[10px] text-slate-400 block font-medium">Location</span>
                            <span className="text-xs text-slate-300 block truncate leading-tight">
                              {item.location}
                            </span>
                          </div>

                          {/* Owner Name */}
                          <div className="mb-1.5 pl-1.5">
                            <span className="text-[10px] text-slate-400 block font-medium">Owner Name</span>
                            <span className="text-xs font-semibold text-slate-200 block truncate uppercase leading-tight">
                              {item.owner_name}
                            </span>
                          </div>

                          {/* Unit Number & Contact */}
                          <div className="grid grid-cols-2 gap-2 mb-2 pl-1.5 pt-1 border-t border-white/[0.05]">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Unit Number</span>
                              <span className="text-xs font-mono font-semibold text-white block">
                                {item.unit_number || 'TBD'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Contact Number</span>
                              <span className="text-xs font-mono text-slate-300 block truncate">
                                {item.contact_number || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* WhatsApp Link */}
                          {item.whatsapp_link && (
                            <div className="pl-1.5 mb-2">
                              <span className="text-[10px] text-slate-400 block font-medium">Whatsapp Link</span>
                              <a
                                href={item.whatsapp_link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[11px] text-blue-400 hover:text-blue-300 truncate block underline font-mono"
                              >
                                {item.whatsapp_link}
                              </a>
                            </div>
                          )}

                          {/* Bottom Row: Date & Action */}
                          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 pl-1.5">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{item.updated_time ? new Date(item.updated_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-400 group-hover:underline flex items-center gap-1">
                              <span>Notes &amp; Audio</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}

                      {colItems.length === 0 && (
                        <div className="text-center py-10 text-slate-500 text-xs italic">
                          No cards in {col.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List / Table View */
          <div className="h-full bg-[#081628] border border-[#1e3450] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#05101d] sticky top-0 z-10 text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e3450]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">Card ID</th>
                    <th className="py-3 px-4 font-semibold">Project &amp; Location</th>
                    <th className="py-3 px-4 font-semibold">Owner Name</th>
                    <th className="py-3 px-4 font-semibold">Unit</th>
                    <th className="py-3 px-4 font-semibold">Contact &amp; WhatsApp</th>
                    <th className="py-3 px-4 font-semibold">Stage</th>
                    <th className="py-3 px-4 font-semibold">Aging / Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight inline-flex items-center gap-1.5 ${
                          item.priority_level === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : item.priority_level === 'high'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                            : item.priority_level === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>#{item.priority_rank}</span>
                          <span className="text-white/30">•</span>
                          <span>{item.waiting_human}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        #{item.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.project_name}</div>
                        <div className="text-[11px] text-slate-400">{item.location}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200 uppercase">
                        {item.owner_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        {item.unit_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-300">{item.contact_number || '—'}</div>
                        {item.whatsapp_link && (
                          <a
                            href={item.whatsapp_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block"
                          style={{
                            backgroundColor: `${item.stage_color}20`,
                            color: item.stage_color,
                            border: `1px solid ${item.stage_color}40`
                          }}
                        >
                          {item.stage_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.updated_time ? new Date(item.updated_time).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenDetail(item); }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail & Voice Audio Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#071322] border border-[#233b59] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#233b59] bg-[#05101d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">
                    {selectedItem.project_name} <span className="font-mono text-blue-400 text-sm">#{selectedItem.id}</span>
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {selectedItem.location} • Unit {selectedItem.unit_number || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              {/* Owner & Contact Card */}
              <div className="bg-[#050f1c] border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Owner Name</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">{selectedItem.owner_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Responsible Agent</span>
                  <span className="font-bold text-blue-400 text-sm mt-0.5 block">{currentAgent.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Contact Phone</span>
                  <a href={`tel:${selectedItem.contact_number}`} className="font-mono font-bold text-white hover:text-emerald-400 mt-0.5 block">
                    {selectedItem.contact_number || 'Unlisted'}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">WhatsApp Direct</span>
                  {selectedItem.whatsapp_link ? (
                    <a
                      href={selectedItem.whatsapp_link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-400 hover:text-blue-300 underline mt-0.5 block truncate"
                    >
                      Open Chat
                    </a>
                  ) : (
                    <span className="text-slate-500 mt-0.5 block">N/A</span>
                  )}
                </div>
              </div>

              {/* Stage Transition Selector */}
              <div className="bg-[#050f1c] border border-white/10 rounded-xl p-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                  Update Pipeline Stage in Bitrix24
                </span>
                <div className="flex flex-wrap gap-2">
                  {kanbanColumns.map(c => {
                    const isActive = selectedItem.stage_id === c.stageId || selectedItem.stage_key === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => handleStageChange(selectedItem.id, c.stageId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-[#081729] text-slate-300 hover:bg-[#0f243d] border border-white/10'
                        }`}
                      >
                        {c.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Call AI Recordings & Sentiment Timeline */}
              <div className="bg-[#050f1c] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Voice Call Intelligence &amp; Audio Recordings
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {timeline.length} call log(s)
                  </span>
                </div>

                {loadingTimeline ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                    Loading call recordings from Supabase &amp; Bitrix timeline...
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No automated voice call recordings logged on this card yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry, idx) => (
                      <div key={idx} className="bg-[#030912] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                        {/* Audio Player if URL exists */}
                        {entry.recording_url && (
                          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Volume2 className="w-3.5 h-3.5" /> Stereo Audio Recording
                              </span>
                              <a
                                href={entry.recording_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-300 underline font-mono flex items-center gap-1"
                              >
                                Download .wav <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            <audio controls className="w-full h-8" src={entry.recording_url}>
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}

                        {/* Call Note / Sentiment */}
                        {entry.call_note && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">AI Sentiment Note</span>
                            <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed bg-white/[0.03] p-2 rounded-lg border border-white/5">
                              {entry.call_note}
                            </p>
                          </div>
                        )}

                        {/* Voice Status */}
                        {entry.voice_status && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-slate-400">Call Status:</span>
                            <span className="font-semibold text-sky-400">{entry.voice_status}</span>
                          </div>
                        )}

                        {/* Transcript Link */}
                        {entry.transcript_url && (
                          <div className="pt-1">
                            <a
                              href={entry.transcript_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline font-mono flex items-center gap-1"
                            >
                              <span>View Full Call Transcript</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-[10px] text-slate-500 text-right pt-1 font-mono">
                          {entry.created ? new Date(entry.created).toLocaleString() : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#233b59] bg-[#05101d] flex items-center justify-between">
              <a
                href={selectedItem.crm_link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1.5"
              >
                <span>Open in Bitrix24 CRM</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-[#1b2b3d] hover:bg-[#283e58] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
