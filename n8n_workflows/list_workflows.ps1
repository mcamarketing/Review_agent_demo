$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OWZiYzkzNi1lMjM4LTQ5N2UtOTgxMy04NTM5Mzc3ZGI4MzEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDlkMWE3ODQtZDgwMy00OGYyLTgzYTUtZmJkM2E5ZjIyOWZjIiwiaWF0IjoxNzcxNDQxMzQxfQ.l04pTAy9sYX2FQutPwnodZHuhv7FbkM5NtqxdjYMrK8"
$base = "https://n8n.srv1334356.hstgr.cloud/api/v1"
$headers = @{
    "X-N8N-API-KEY" = $key
    "Content-Type" = "application/json"
}

$resp = Invoke-RestMethod -Uri "$base/workflows?limit=50" -Headers $headers -Method GET
$resp | ConvertTo-Json -Depth 10
