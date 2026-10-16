import axios from 'axios';

const BITRIX_REST_BASE = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
const ENTITY_TYPE_ID = 1100; // Telesales - Owners data

// Determine base URL for Hostinger PHP endpoints
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'https://admin.asquared.ae/dashboard';
  const origin = window.location.origin;
  if (origin.includes('admin.asquared.ae')) {
    return window.location.pathname.startsWith('/dashboard') 
      ? `${origin}/dashboard` 
      : `${origin}/dashboard`;
  }
  return 'https://admin.asquared.ae/dashboard';
};

export const STAGE_CONFIG = {
  'DT1100_44:ASQ_READY_CALL': { name: 'Ready for Call', key: 'ready', color: '#39A8EF', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  'DT1100_44:UC_5B620Q': { name: 'Contacted', key: 'contacted', color: '#00c4fb', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  'DT1100_44:UC_HGMTGR': { name: 'Has Property', key: 'has_property', color: '#468ee5', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  'DT1100_44:UC_4IMVM8': { name: 'Interested to Sell/Rent', key: 'interested', color: '#75d900', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  'DT1100_44:SUCCESS': { name: 'Won / Success', key: 'success', color: '#10b981', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  'DT1100_44:FAIL': { name: 'Failed / Archive', key: 'failed', color: '#f43f5e', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  'DT1100_44:CLIENT': { name: 'No Answer', key: 'no_answer', color: '#06b6d4', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  'DT1100_44:UC_QE3TNO': { name: 'Not Interested', key: 'not_interested', color: '#ef4444', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  'DT1100_44:NEW': { name: 'Import Data', key: 'import', color: '#a855f7', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
};

export const activityService = {
  // Fetch active Bitrix24 agents
  async getAgents() {
    try {
      const url = `${getApiBaseUrl()}/api_activity.php?action=get_agents`;
      const res = await axios.get(url, { timeout: 10000 });
      if (res.data?.success && Array.isArray(res.data.agents)) {
        return res.data.agents;
      }
    } catch (e) {
      console.warn('api_activity.php failed, falling back to direct Bitrix query:', e);
    }

    // Direct Bitrix fallback
    try {
      const direct = await axios.post(`${BITRIX_REST_BASE}user.get.json`, {
        filter: { ACTIVE: true }
      });
      const users = direct.data?.result || [];
      return users.map(u => ({
        id: String(u.ID),
        name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim() || u.EMAIL,
        email: u.EMAIL || '',
        position: u.WORK_POSITION || '',
        photo: u.PERSONAL_PHOTO || null
      }));
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      return [
        { id: '144', name: 'Vikram', email: 'vikram@asquared.ae', photo: 'https://crm.asquared.ae/upload/main/cf4/jfzs23qdmfxj07lgp0bykm4wtnyyb0k3/Polished Corporate Headshot on White.png' },
        { id: '75', name: 'Mayannk Agarwal', email: 'mayank@asquared.ae', photo: null },
        { id: '68', name: 'Angel', email: 'angel@asquared.ae', photo: null },
        { id: '6', name: 'Melanie Simsiman', email: 'admin@asquared.ae', photo: null },
        { id: '11', name: 'Mridul Sethi', email: 'Mridul@asquared.ae', photo: null },
        { id: '12', name: 'nouman tayyab', email: 'it@asquared.ae', photo: null }
      ];
    }
  },

  // Fetch activity cards for an agent
  async getActivity(agentId = '144', options = {}) {
    const { stageId = '', search = '', limit = 100, start = 0 } = options;
    try {
      const url = `${getApiBaseUrl()}/api_activity.php?action=get_activity&agent_id=${encodeURIComponent(agentId)}&stage_id=${encodeURIComponent(stageId)}&search=${encodeURIComponent(search)}&limit=${limit}&start=${start}`;
      const res = await axios.get(url, { timeout: 15000 });
      if (res.data?.success) {
        return res.data;
      }
    } catch (e) {
      console.warn('api_activity.php get_activity failed, falling back to direct Bitrix query:', e);
    }

    // Direct Bitrix Fallback
    try {
      const filter = {};
      if (agentId !== 'all') filter.assignedById = agentId;
      if (stageId) filter.stageId = stageId;

      const direct = await axios.post(`${BITRIX_REST_BASE}crm.item.list.json`, {
        entityTypeId: ENTITY_TYPE_ID,
        filter,
        select: [
          'id', 'title', 'stageId', 'createdTime', 'updatedTime', 'lastActivityTime', 'assignedById',
          'ufCrm19_1776147554', 'ufCrm19_1776147607', 'ufCrm19_1776147625',
          'ufCrm19_1776147649', 'ufCrm19_1776186597', 'ufCrm19_1776186627', 'ufCrm19_1785239877'
        ],
        order: { updatedTime: 'desc', id: 'desc' },
        start
      });

      const rawItems = direct.data?.result?.items || [];
      const total = direct.data?.total || rawItems.length;

      const items = rawItems.map(item => {
        const sId = item.stageId || '';
        const meta = STAGE_CONFIG[sId] || { name: 'In Progress', key: 'other', color: '#385175' };
        const contact = String(item.ufCrm19_1776186627 || '').replace(/[^0-9]/g, '');
        let wa = item.ufCrm19_1785239877 || '';
        if (!wa && contact) wa = `https://wa.me/${contact}`;

        return {
          id: Number(item.id),
          title: item.title || `Telesales - Owners data #${item.id}`,
          project_name: item.ufCrm19_1776147607 || 'Project Unspecified',
          location: item.ufCrm19_1776147625 || 'Dubai',
          owner_name: item.ufCrm19_1776147649 || 'Owner Unspecified',
          unit_number: item.ufCrm19_1776186597 || '',
          contact_number: contact,
          whatsapp_link: wa,
          property_category: item.ufCrm19_1776147554 || 'Apartment',
          stage_id: sId,
          stage_name: meta.name,
          stage_key: meta.key,
          stage_color: meta.color,
          assigned_by_id: String(item.assignedById || '6'),
          assigned_by_name: 'Agent #' + item.assignedById,
          assigned_by_photo: null,
          created_time: item.createdTime || '',
          updated_time: item.updatedTime || '',
          last_activity_time: item.lastActivityTime || '',
          crm_link: `https://crm.asquared.ae/crm/type/${ENTITY_TYPE_ID}/details/${item.id}/`
        };
      });

      return {
        success: true,
        agent_id: agentId,
        total,
        count: items.length,
        items
      };
    } catch (err) {
      console.error('Direct Bitrix fallback failed:', err);
      return { success: false, items: [], total: 0 };
    }
  },

  // Fetch timeline comments (voice call audio recordings, summaries, transcripts)
  async getItemTimeline(itemId) {
    try {
      const url = `${getApiBaseUrl()}/api_activity.php?action=get_item_timeline&item_id=${itemId}`;
      const res = await axios.get(url, { timeout: 10000 });
      if (res.data?.success) {
        return res.data.timeline || [];
      }
    } catch (e) {
      console.warn('api_activity.php get_item_timeline failed, falling back:', e);
    }

    try {
      const direct = await axios.post(`${BITRIX_REST_BASE}crm.timeline.comment.list.json`, {
        filter: {
          ENTITY_TYPE: `DYNAMIC_${ENTITY_TYPE_ID}`,
          ENTITY_ID: itemId
        }
      });
      const comments = direct.data?.result || [];
      return comments.map(c => {
        const raw = c.COMMENT || '';
        let recordingUrl = '';
        const recMatch = raw.match(/Recording URL:\s*([^\s\|]+)/i);
        if (recMatch) recordingUrl = recMatch[1].trim();

        let transcriptUrl = '';
        const trMatch = raw.match(/Voice Transcripts:\s*([^\s\|]+)/i);
        if (trMatch) transcriptUrl = trMatch[1].trim();

        let callNote = '';
        const noteMatch = raw.match(/Call Note:\s*([^\|]+)/i);
        if (noteMatch) callNote = noteMatch[1].trim();

        let voiceStatus = '';
        const statMatch = raw.match(/voice call Status:\s*([^\|]+)/i);
        if (statMatch) voiceStatus = statMatch[1].trim();

        return {
          id: c.ID,
          created: c.CREATED,
          author_id: c.AUTHOR_ID,
          raw_comment: raw,
          recording_url: recordingUrl,
          transcript_url: transcriptUrl,
          call_note: callNote,
          voice_status: voiceStatus,
          is_voice_call: Boolean(recordingUrl || voiceStatus)
        };
      });
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      return [];
    }
  },

  // Update card stage in Bitrix
  async updateStage(itemId, stageId, assignedById = null) {
    try {
      const url = `${getApiBaseUrl()}/api_activity.php?action=update_stage`;
      const res = await axios.post(url, {
        item_id: itemId,
        stage_id: stageId,
        assigned_by_id: assignedById
      });
      if (res.data?.success) return { success: true };
    } catch (e) {
      console.warn('api_activity.php update_stage failed, falling back to direct:', e);
    }

    try {
      const fields = { stageId };
      if (assignedById) fields.assignedById = Number(assignedById);
      const direct = await axios.post(`${BITRIX_REST_BASE}crm.item.update.json`, {
        entityTypeId: ENTITY_TYPE_ID,
        id: itemId,
        fields
      });
      return { success: Boolean(direct.data?.result?.item) };
    } catch (err) {
      console.error('Failed to update stage:', err);
      return { success: false, error: err.message };
    }
  },

  // Reassign agent in Bitrix
  async reassignAgent(itemId, newAgentId) {
    try {
      const url = `${getApiBaseUrl()}/api_activity.php?action=reassign_agent`;
      const res = await axios.post(url, {
        item_id: itemId,
        agent_id: newAgentId
      });
      if (res.data?.success) return { success: true };
    } catch (e) {
      console.warn('api_activity.php reassign_agent failed, falling back:', e);
    }

    try {
      const direct = await axios.post(`${BITRIX_REST_BASE}crm.item.update.json`, {
        entityTypeId: ENTITY_TYPE_ID,
        id: itemId,
        fields: { assignedById: Number(newAgentId) }
      });
      return { success: Boolean(direct.data?.result?.item) };
    } catch (err) {
      console.error('Failed to reassign agent:', err);
      return { success: false, error: err.message };
    }
  }
};
