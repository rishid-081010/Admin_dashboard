// n8n Service: Connects to n8n instance via Hostinger proxy to pull live active published workflows and executions

export async function fetchN8nWorkflows() {
  // In production on Hostinger, api_n8n.php is served at ./api_n8n.php or /dashboard/api_n8n.php
  const endpoints = [
    './api_n8n.php',
    '/dashboard/api_n8n.php',
    'https://admin.asquared.ae/dashboard/api_n8n.php'
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.workflows)) {
          // Filter strictly for active, published workflows
          const activeWfs = data.workflows.filter(w => w.active);
          
          return {
            timestamp: data.timestamp || new Date().toISOString(),
            summary: {
              totalWorkflows: data.summary?.totalWorkflows || data.workflows.length,
              activeWorkflows: activeWfs.length,
              healthyWorkflows: activeWfs.filter(w => w.status === 'healthy').length,
              errorWorkflows: activeWfs.filter(w => w.status === 'error').length,
              totalExecutionsToday: data.summary?.totalExecutionsToday ?? activeWfs.reduce((acc, w) => acc + (w.executionsToday || 0), 0),
              totalSuccessToday: data.summary?.totalSuccessToday ?? activeWfs.reduce((acc, w) => acc + (w.successToday || 0), 0),
              totalErrorsToday: data.summary?.totalErrorsToday ?? activeWfs.reduce((acc, w) => acc + (w.errorToday || 0), 0),
            },
            workflows: activeWfs
          };
        }
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  // Graceful fallback if proxy unreachable
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalWorkflows: 0,
      activeWorkflows: 0,
      healthyWorkflows: 0,
      errorWorkflows: 0,
      totalExecutionsToday: 0,
      totalSuccessToday: 0,
      totalErrorsToday: 0
    },
    workflows: []
  };
}
