const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'n8n_session.json');
const agent = new https.Agent({ rejectUnauthorized: false });

function getSession(callback) {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data.cookie && data.expiresAt > Date.now()) {
        return callback(null, data.cookie);
      }
    } catch(e) {}
  }

  // Need new login
  console.log('Logging in to n8n...');
  const postData = JSON.stringify({ emailOrLdapLoginId: 'akarshrarora@gmail.com', password: 'Asquared@1234' });
  const req = https.request('https://n8n.asquared.ae/rest/login', {
    method: 'POST',
    agent,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        return callback(new Error(`Login failed with status ${res.statusCode}: ${body}`));
      }
      const rawCookie = res.headers['set-cookie'];
      if (!rawCookie || !rawCookie[0]) {
        return callback(new Error('No set-cookie in response'));
      }
      const cookie = rawCookie[0].split(';')[0];
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        cookie,
        expiresAt: Date.now() + 6 * 24 * 3600 * 1000 // 6 days
      }));
      callback(null, cookie);
    });
  });
  req.on('error', callback);
  req.write(postData);
  req.end();
}

function fetchN8n(cookie, endpoint, callback) {
  https.get(`https://n8n.asquared.ae${endpoint}`, {
    agent,
    headers: { Cookie: cookie }
  }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        callback(null, json);
      } catch(e) {
        callback(new Error(`Parse error: ${e.message}`));
      }
    });
  }).on('error', callback);
}

getSession((err, cookie) => {
  if (err) return console.error('Session error:', err.message);
  console.log('Authenticated with cookie!');
  fetchN8n(cookie, '/rest/workflows', (wErr, wJson) => {
    if (wErr) return console.error('Workflow error:', wErr.message);
    const workflows = wJson.data || [];
    console.log(`Total Workflows: ${workflows.length}`);

    fetchN8n(cookie, '/rest/executions?limit=250', (eErr, eJson) => {
      if (eErr) return console.error('Executions error:', eErr.message);
      const executions = (eJson.data && eJson.data.results) ? eJson.data.results : [];
      console.log(`Total Executions in batch: ${executions.length}`);

      const today = new Date().toISOString().split('T')[0];
      const statsByWorkflow = {};

      executions.forEach(ex => {
        const wid = ex.workflowId;
        if (!statsByWorkflow[wid]) {
          statsByWorkflow[wid] = {
            todayCount: 0,
            successCount: 0,
            errorCount: 0,
            runningCount: 0,
            latestStatus: ex.status,
            lastExecutedAt: ex.startedAt || ex.createdAt
          };
        }
        if ((ex.createdAt || '').startsWith(today)) {
          statsByWorkflow[wid].todayCount++;
          if (ex.status === 'success') statsByWorkflow[wid].successCount++;
          if (ex.status === 'error') statsByWorkflow[wid].errorCount++;
          if (ex.status === 'running') statsByWorkflow[wid].runningCount++;
        }
      });

      console.log('\nTop Active Workflows:');
      const activeWfs = workflows.filter(w => w.active).slice(0, 10);
      activeWfs.forEach(w => {
        const st = statsByWorkflow[w.id] || { todayCount: 0, latestStatus: 'idle', errorCount: 0 };
        console.log(`- [${w.active ? 'ACTIVE' : 'OFF'}] ${w.name}: ${st.todayCount} runs today, status=${st.latestStatus}`);
      });
    });
  });
});
