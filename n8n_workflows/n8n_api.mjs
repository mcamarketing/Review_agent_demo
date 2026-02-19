const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OWZiYzkzNi1lMjM4LTQ5N2UtOTgxMy04NTM5Mzc3ZGI4MzEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDlkMWE3ODQtZDgwMy00OGYyLTgzYTUtZmJkM2E5ZjIyOWZjIiwiaWF0IjoxNzcxNDQxMzQxfQ.l04pTAy9sYX2FQutPwnodZHuhv7FbkM5NtqxdjYMrK8";
const BASE = "https://n8n.srv1334356.hstgr.cloud/api/v1";
const SKIP_ID = "5NMYAFx8ynXLJ4iW"; // DO NOT TOUCH

const headers = {
  "X-N8N-API-KEY": API_KEY,
  "Content-Type": "application/json",
};

async function listWorkflows() {
  const res = await fetch(`${BASE}/workflows?limit=100`, { headers });
  const data = await res.json();
  return data;
}

async function getWorkflow(id) {
  const res = await fetch(`${BASE}/workflows/${id}`, { headers });
  return res.json();
}

async function createWorkflow(body) {
  const res = await fetch(`${BASE}/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function updateWorkflow(id, body) {
  const res = await fetch(`${BASE}/workflows/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function activateWorkflow(id) {
  const res = await fetch(`${BASE}/workflows/${id}/activate`, {
    method: "POST",
    headers,
  });
  return res.json();
}

const cmd = process.argv[2];

if (cmd === "list") {
  const data = await listWorkflows();
  console.log(`Total: ${data.data?.length ?? 0} workflows\n`);
  for (const wf of data.data ?? []) {
    const status = wf.active ? "ACTIVE  " : "inactive";
    const protect = wf.id === SKIP_ID ? " [PROTECTED]" : "";
    console.log(`${wf.id} | ${status} | ${wf.name}${protect}`);
  }
} else if (cmd === "get") {
  const id = process.argv[3];
  const wf = await getWorkflow(id);
  // Print summary: name, node count, webhook paths
  console.log(`Name: ${wf.name}`);
  console.log(`Active: ${wf.active}`);
  console.log(`Nodes (${wf.nodes?.length}):`);
  for (const n of wf.nodes ?? []) {
    const path = n.parameters?.path ? ` → /${n.parameters.path}` : "";
    console.log(`  - [${n.type}] ${n.name}${path}`);
  }
} else if (cmd === "get-full") {
  const id = process.argv[3];
  const wf = await getWorkflow(id);
  console.log(JSON.stringify(wf, null, 2));
} else {
  console.log("Usage: node n8n_api.mjs list | get <id> | get-full <id>");
}
