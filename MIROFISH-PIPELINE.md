# MiroFish.us — Full Pipeline Integration Spec

## Overview

Replace the current dummy chat implementation with a real integration to the MiroFish backend pipeline. When a user sends a message, the frontend orchestrates the full workflow: ontology generation → graph building → simulation creation → simulation preparation → simulation start → report generation → chat with report agent.

Backend URL: `http://161.35.124.54:5001`

---

## The Pipeline (7 Steps)

Each step is an API call to the backend. Some are async (return a task_id that must be polled). The frontend pipeline sidebar already has 4 stages — we map them to the real backend calls.

### Step 1: Ontology Generation (Stage: "Seed Analysis")

Creates a project and analyzes the uploaded text/files.

```
POST /api/graph/ontology/generate
Content-Type: multipart/form-data

Fields:
  - files: (optional) uploaded PDF/MD/TXT files
  - simulation_requirement: (required) the user's message/question
  - project_name: (optional) auto-generate from prompt
  - additional_context: (optional)

Response:
{
  "success": true,
  "data": {
    "project_id": "proj_xxxx",
    "ontology": { "entity_types": [...], "edge_types": [...] },
    "files": [...],
    "total_text_length": 12345
  }
}
```

**Save `project_id` — needed for all subsequent steps.**

### Step 2: Graph Building (Stage: "Graph Building")

Builds the knowledge graph from the project. This is ASYNC — returns a task_id.

```
POST /api/graph/build
Content-Type: application/json

{
  "project_id": "proj_xxxx"
}

Response:
{
  "success": true,
  "data": {
    "project_id": "proj_xxxx",
    "task_id": "task_xxxx",
    "message": "图谱构建任务已启动"
  }
}
```

**Poll for completion:**

```
GET /api/graph/task/{task_id}

Response:
{
  "success": true,
  "data": {
    "task_id": "task_xxxx",
    "status": "processing" | "completed" | "failed",
    ...
  }
}
```

Poll every 3 seconds until `status === "completed"`. On completion, get the graph_id from the project:

```
GET /api/graph/project/{project_id}

Response includes graph_id in the project data.
```

### Step 3: Create Simulation (Stage: "Multi-Agent Simulation")

```
POST /api/simulation/create
Content-Type: application/json

{
  "project_id": "proj_xxxx",
  "enable_twitter": true,
  "enable_reddit": true
}

Response:
{
  "success": true,
  "data": {
    "simulation_id": "sim_xxxx",
    "project_id": "proj_xxxx",
    "graph_id": "mirofish_xxxx",
    "status": "created"
  }
}
```

**Save `simulation_id` — needed for all remaining steps.**

### Step 4: Prepare Simulation (Stage: "Multi-Agent Simulation")

This is ASYNC — generates agent profiles and simulation config.

```
POST /api/simulation/prepare
Content-Type: application/json

{
  "simulation_id": "sim_xxxx"
}

Response:
{
  "success": true,
  "data": {
    "task_id": "task_xxxx",
    ...
  }
}
```

**Poll for completion:**

```
POST /api/simulation/prepare/status
Content-Type: application/json

{
  "simulation_id": "sim_xxxx"
}
```

Poll every 5 seconds until status is completed.

### Step 5: Start Simulation (Stage: "Multi-Agent Simulation")

```
POST /api/simulation/start
Content-Type: application/json

{
  "simulation_id": "sim_xxxx",
  "platform": "parallel"
}

Response:
{
  "success": true,
  "data": {
    "simulation_id": "sim_xxxx",
    "runner_status": "running"
  }
}
```

**Poll for completion:**

```
GET /api/simulation/{simulation_id}/run-status

Response:
{
  "success": true,
  "data": {
    "runner_status": "running" | "completed" | "failed",
    "current_round": 5,
    "total_rounds": 144,
    "progress_percent": 3.5
  }
}
```

Poll every 5 seconds. Update the sidebar stage detail with progress (e.g., "Round 5/144 — 3.5%").

### Step 6: Generate Report (Stage: "Structured Report")

This is ASYNC.

```
POST /api/report/generate
Content-Type: application/json

{
  "simulation_id": "sim_xxxx"
}

Response:
{
  "success": true,
  "data": {
    "simulation_id": "sim_xxxx",
    "task_id": "task_xxxx",
    "status": "generating"
  }
}
```

**Poll for completion:**

```
POST /api/report/generate/status
Content-Type: application/json

{
  "task_id": "task_xxxx",
  "simulation_id": "sim_xxxx"
}
```

Poll every 5 seconds until `status === "completed"`.

### Step 7: Chat with Report Agent (Follow-up messages)

Once the pipeline completes, all subsequent messages use the chat endpoint:

```
POST /api/report/chat
Content-Type: application/json

{
  "simulation_id": "sim_xxxx",
  "message": "user's follow-up question",
  "chat_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}

Response:
{
  "success": true,
  "data": {
    "response": "Agent's reply...",
    "tool_calls": [...],
    "sources": [...]
  }
}
```

---

## Frontend Implementation

### State to Track

```typescript
// Pipeline state
const [projectId, setProjectId] = useState<string | null>(null);
const [simulationId, setSimulationId] = useState<string | null>(null);
const [pipelineComplete, setPipelineComplete] = useState(false);
const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
```

### Flow Logic

**First message from user:**
1. Deduct credit (existing logic — keep as-is)
2. Run the full pipeline (Steps 1-6) sequentially
3. Update sidebar stages in real-time as each step progresses
4. When pipeline completes, fetch the report and display it as the first assistant message
5. Set `pipelineComplete = true`

**Subsequent messages:**
1. Deduct credit (existing logic)
2. Send to `POST /api/report/chat` with `simulation_id` and `chat_history`
3. Display response as assistant message
4. Append to `chatHistory`

### Sidebar Stage Mapping

| Sidebar Stage | Backend Steps | Detail Updates |
|---|---|---|
| Seed Analysis | Step 1 (ontology/generate) | "Analyzing N characters..." → "Created project proj_xxxx" |
| Graph Building | Step 2 (graph/build + poll) | "Building knowledge graph..." → "Built graph with N nodes" |
| Multi-Agent Simulation | Steps 3-5 (create + prepare + start + poll) | "Creating simulation..." → "Preparing agents..." → "Round X/Y — Z%" → "Simulation complete" |
| Structured Report | Step 6 (report/generate + poll) | "Generating report..." → "Report ready" |

### Error Handling

- If any step fails, set that stage to 'error' status with the error message
- Show a user-friendly error in the chat: "Pipeline failed at [stage name]: [error message]. Please try again."
- Allow the user to click "Reset" and start over
- Do NOT refund the credit on failure (the backend still consumed resources)

### Timeout Handling

- Each polling loop should have a maximum timeout:
  - Graph building: 5 minutes max
  - Simulation preparation: 5 minutes max
  - Simulation running: 15 minutes max (simulations can take a while)
  - Report generation: 5 minutes max
- If timeout is reached, set stage to error: "Step timed out. The simulation may still be running on the server."

### File Upload

The current file upload via FormData only works for Step 1 (ontology generation). Keep the file attachment UI as-is, but send the file in Step 1 instead of the chat endpoint.

### Modified sendMessage Function (Pseudocode)

```typescript
const sendMessage = async () => {
  // ... existing credit check/deduction ...

  if (!pipelineComplete) {
    // FIRST MESSAGE — run full pipeline
    try {
      // Stage 1: Seed Analysis
      updateStage('seed', 'running');
      const ontologyRes = await postFormData(`${API_URL}/api/graph/ontology/generate`, {
        simulation_requirement: text,
        files: file ? [file] : [],
      });
      const projectId = ontologyRes.data.project_id;
      setProjectId(projectId);
      updateStage('seed', 'done', `Project ${projectId} created`);

      // Stage 2: Graph Building
      updateStage('graph', 'running');
      const buildRes = await postJson(`${API_URL}/api/graph/build`, { project_id: projectId });
      const taskId = buildRes.data.task_id;
      await pollUntilComplete(`${API_URL}/api/graph/task/${taskId}`, 3000, 300000);
      updateStage('graph', 'done', 'Knowledge graph built');

      // Stage 3-5: Simulation
      updateStage('simulation', 'running', 'Creating simulation...');
      const simRes = await postJson(`${API_URL}/api/simulation/create`, { project_id: projectId });
      const simId = simRes.data.simulation_id;
      setSimulationId(simId);

      updateStage('simulation', 'running', 'Preparing agents...');
      await postJson(`${API_URL}/api/simulation/prepare`, { simulation_id: simId });
      await pollPrepareStatus(simId, 5000, 300000);

      updateStage('simulation', 'running', 'Running simulation...');
      await postJson(`${API_URL}/api/simulation/start`, { simulation_id: simId, platform: 'parallel' });
      await pollSimulationStatus(simId, 5000, 900000, (progress) => {
        updateStage('simulation', 'running', `Round ${progress.current_round}/${progress.total_rounds} — ${progress.progress_percent}%`);
      });
      updateStage('simulation', 'done', 'Simulation complete');

      // Stage 6: Report
      updateStage('report', 'running', 'Generating report...');
      const reportRes = await postJson(`${API_URL}/api/report/generate`, { simulation_id: simId });
      await pollReportStatus(reportRes.data.task_id, simId, 5000, 300000);
      updateStage('report', 'done', 'Report ready');

      setPipelineComplete(true);

      // Fetch the report and display as first assistant message
      const report = await fetchJson(`${API_URL}/api/report/by-simulation/${simId}`);
      // Display report content as assistant message

    } catch (err) {
      // Handle error — set current stage to error, show error message
    }

  } else {
    // FOLLOW-UP MESSAGE — chat with report agent
    const res = await postJson(`${API_URL}/api/report/chat`, {
      simulation_id: simulationId,
      message: text,
      chat_history: chatHistory,
    });
    const reply = res.data.response;
    // Display reply as assistant message
    // Append to chatHistory
  }
};
```

### Helper Functions Needed

```typescript
// Post JSON to backend
async function postJson(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// Post FormData to backend (for file uploads)
async function postFormData(url: string, data: { simulation_requirement: string; files: File[] }) {
  const fd = new FormData();
  fd.append('simulation_requirement', data.simulation_requirement);
  data.files.forEach(f => fd.append('files', f));
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// Fetch JSON from backend
async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// Generic poll function
async function pollUntilComplete(
  url: string, 
  interval: number, 
  timeout: number,
  checkFn?: (data: any) => boolean
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetchJson(url);
    const status = res.data?.status ?? res.data?.runner_status;
    if (status === 'completed' || status === 'finished') return res;
    if (status === 'failed' || status === 'error') throw new Error(res.data?.error ?? 'Step failed');
    if (checkFn && checkFn(res.data)) return res;
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Polling timed out');
}

// Poll simulation prepare status
async function pollPrepareStatus(simId: string, interval: number, timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await postJson(`${API_URL}/api/simulation/prepare/status`, { simulation_id: simId });
    if (res.data?.status === 'completed' || res.data?.status === 'ready') return res;
    if (res.data?.status === 'failed') throw new Error('Preparation failed');
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Preparation timed out');
}

// Poll simulation run status with progress callback
async function pollSimulationStatus(
  simId: string, interval: number, timeout: number,
  onProgress: (data: { current_round: number; total_rounds: number; progress_percent: number }) => void
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetchJson(`${API_URL}/api/simulation/${simId}/run-status`);
    const d = res.data;
    if (d?.runner_status === 'completed' || d?.runner_status === 'finished') return res;
    if (d?.runner_status === 'failed') throw new Error('Simulation failed');
    if (d?.current_round) onProgress(d);
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Simulation timed out');
}

// Poll report generation status
async function pollReportStatus(taskId: string, simId: string, interval: number, timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await postJson(`${API_URL}/api/report/generate/status`, { task_id: taskId, simulation_id: simId });
    if (res.data?.status === 'completed') return res;
    if (res.data?.status === 'failed') throw new Error('Report generation failed');
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Report generation timed out');
}
```

---

## What to Keep from Existing Chat Page

- All UI components (messages, sidebar, header, file upload, credit system)
- Credit check/deduction logic
- Stage sidebar with icons and progress bar
- Reset functionality
- File attachment UI
- UserMenu component
- Toast notifications
- Responsive layout

## What to Change

- Remove `simulateStages()` function (fake stage animation) — replace with real stage updates
- Replace the single `fetch(${API_URL}/api/report/chat)` call with the full pipeline orchestration
- Add state for `projectId`, `simulationId`, `pipelineComplete`, `chatHistory`
- The `sendMessage` function becomes the pipeline orchestrator for the first message
- Subsequent messages go through the report chat endpoint
- Update stage details with real data from the backend (node counts, round progress, etc.)
- Send files via FormData to the ontology endpoint, not the chat endpoint

## What NOT to Change

- Do not touch: layout.tsx, admin page, auth pages, API routes for credits/payments
- Do not change the visual design or component structure
- Do not change how credits work
- Do not modify the backend — only the frontend

---

## CORS Note

The backend is at `http://161.35.124.54:5001` and the frontend is at `https://mirofish.us`. Flask-CORS is installed (it's in requirements.txt). If CORS errors occur, SSH into the VPS and check:

```bash
grep -r "CORS\|cors" /opt/MiroFish/backend/app/__init__.py
```

If CORS isn't configured, add it. But it should already be there since flask-cors is a dependency.

---

## Claude Code Prompt

> Read `MIROFISH-PIPELINE.md` in the project root at `C:\Users\asus\Downloads\mirofish`. This is the spec for integrating the real MiroFish backend pipeline into the chat page. Replace the current dummy chat implementation in `src/app/chat/page.tsx` with the full 7-step pipeline orchestration: ontology generation → graph building → simulation creation → preparation → start → report generation → chat. Keep ALL existing UI components, credit system, and design unchanged — only rewrite the sendMessage logic and stage management. Remove the fake simulateStages function and replace with real backend polling. Add state for projectId, simulationId, pipelineComplete, and chatHistory. First message triggers the full pipeline, subsequent messages use /api/report/chat. Add helper functions for postJson, postFormData, fetchJson, and polling. Handle errors and timeouts gracefully. Do not touch any other files. Build it all in one go, no questions.
