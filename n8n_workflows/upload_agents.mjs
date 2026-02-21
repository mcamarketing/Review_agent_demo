import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OWZiYzkzNi1lMjM4LTQ5N2UtOTgxMy04NTM5Mzc3ZGI4MzEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzlhYjRhYTctNzk5Yy00ZTAxLTlhODktNjFjY2NmZGNkMTJlIiwiaWF0IjoxNzcxNTU4MTc2fQ.YTdaL7V9YOdRUHeEl1OlchGCfMdfDO1eY0CTIyLQT8A';
const BASE = 'https://n8n.srv1334356.hstgr.cloud/api/v1';
const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

async function uploadWorkflow(filename, forceCreate = false) {
  const raw = fs.readFileSync(filename, 'utf8');
  const wf = JSON.parse(raw);

  // Extract only what we need for the update
  const body = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: { executionOrder: 'v1' }
  };

  // If forceCreate or no ID, create new
  if (forceCreate || !wf.id) {
    console.log('Creating new workflow: ' + wf.name);
    const res = await fetch(BASE + '/workflows', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.id) {
      console.log('Created ID:', result.id);
      // Activate it
      const actRes = await fetch(BASE + '/workflows/' + result.id + '/activate', {
        method: 'POST',
        headers
      });
      const actResult = await actRes.json();
      console.log('Activated:', actResult.active ? 'Yes' : 'No');
    } else {
      console.log('Error:', JSON.stringify(result));
    }
    return result;
  } else {
    // Update existing
    console.log('Updating workflow ' + wf.id + ': ' + wf.name);
    const res = await fetch(BASE + '/workflows/' + wf.id, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    const result = await res.json();
    console.log('Result:', result.id ? 'Success - ID: ' + result.id : JSON.stringify(result));
    return result;
  }
}

// Upload web agent (create new since the old one is different workflow)
console.log('\n=== Uploading Web Agent ===');
await uploadWorkflow('ai_ops_agent_web.json', true);

console.log('\n=== Uploading Voice Agent ===');
await uploadWorkflow('ai_ops_agent_voice.json', true);

console.log('\nDone!');
