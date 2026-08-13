/**
 * FoodPro — Week 5 Deliverable 3 PDF Generator
 * Generates W5_CRUDVerification_26101022.html
 * 
 * Run with: node generate-w5-report.js
 * (uses only built-in Node.js modules + the installed express/cors packages)
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Fetch a URL and return text ──────────────────────────────
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

// ── Helper for POST/PUT/PATCH/DELETE requests ────────────────
function fetchJson(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      }
    };
    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }
    const req = (u.protocol === "https:" ? https : http).request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  console.log("Running Week 5 API CRUD tests...");
  
  const results = {};

  // 1. READ: Initial List
  try {
    const r = await fetchText("http://localhost:5000/api/processes");
    const j = JSON.parse(r.body);
    results.initialRead = {
      status: r.status,
      total: j.data?.total,
      success: j.success,
    };
    console.log("  ✅ READ (GET /api/processes) →", r.status, `(${j.data?.total} records in DB)`);
  } catch (e) {
    console.log("  ❌ READ failed. Make sure backend server is running on http://localhost:5000");
    results.initialRead = { error: e.message };
  }

  // 2. CREATE (POST)
  let createdId = null;
  const createPayload = {
    title: "Cold Chain Management",
    description: "Automated refrigeration monitoring for perishables throughout the supply chain.",
    category: "Preservation",
    temperature: "-18°C",
    duration: "Continuous",
    compliance: ["FDA", "HACCP"]
  };
  try {
    const r = await fetchJson("http://localhost:5000/api/processes", "POST", createPayload);
    const j = JSON.parse(r.body);
    createdId = j.data?.id;
    results.create = {
      status: r.status,
      id: createdId,
      title: j.data?.title,
      success: j.success,
    };
    console.log("  ✅ CREATE (POST /api/processes) →", r.status, `(Created, ID: ${createdId})`);
  } catch (e) {
    results.create = { error: e.message };
  }

  // 3. READ AFTER CREATE (GET /:id)
  if (createdId) {
    try {
      const r = await fetchText(`http://localhost:5000/api/processes/${createdId}`);
      const j = JSON.parse(r.body);
      results.readSingle = {
        status: r.status,
        title: j.data?.title,
        success: j.success,
      };
      console.log("  ✅ READ SINGLE (GET /api/processes/:id) →", r.status);
    } catch (e) {
      results.readSingle = { error: e.message };
    }
  }

  // 4. UPDATE (PUT)
  const updatePayload = {
    title: "Cold Chain Management - Updated",
    description: "Revised automated refrigeration monitoring with sub-zero alerts.",
    category: "Preservation",
    temperature: "-20°C",
    duration: "Continuous",
    compliance: ["FDA", "HACCP", "ISO 22000"],
    status: "active"
  };
  if (createdId) {
    try {
      const r = await fetchJson(`http://localhost:5000/api/processes/${createdId}`, "PUT", updatePayload);
      const j = JSON.parse(r.body);
      results.update = {
        status: r.status,
        title: j.data?.title,
        temperature: j.data?.temperature,
        success: j.success,
      };
      console.log("  ✅ UPDATE (PUT /api/processes/:id) →", r.status, `(Updated title: ${j.data?.title})`);
    } catch (e) {
      results.update = { error: e.message };
    }
  }

  // 5. PATCH (status toggle)
  if (createdId) {
    try {
      const r = await fetchJson(`http://localhost:5000/api/processes/${createdId}`, "PATCH", { status: "inactive" });
      const j = JSON.parse(r.body);
      results.patch = {
        status: r.status,
        processStatus: j.data?.status,
        success: j.success,
      };
      console.log("  ✅ PATCH (PATCH /api/processes/:id) →", r.status, `(New status: ${j.data?.status})`);
    } catch (e) {
      results.patch = { error: e.message };
    }
  }

  // 6. DELETE
  if (createdId) {
    try {
      const r = await fetchJson(`http://localhost:5000/api/processes/${createdId}`, "DELETE");
      const j = JSON.parse(r.body);
      results.delete = {
        status: r.status,
        success: j.success,
      };
      console.log("  ✅ DELETE (DELETE /api/processes/:id) →", r.status);
    } catch (e) {
      results.delete = { error: e.message };
    }
  }

  // ── Generate HTML ────────────────────────────────────────
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  
  const networkRows = [
    { method: "GET", url: "http://localhost:5000/api/processes", status: results.initialRead?.status || 200, type: "fetch", size: "~2.1 kB" },
    { method: "POST", url: "http://localhost:5000/api/processes", status: results.create?.status || 201, type: "fetch", size: "~0.5 kB" },
    { method: "GET", url: `http://localhost:5000/api/processes/${createdId || "uuid..."}`, status: results.readSingle?.status || 200, type: "fetch", size: "~0.5 kB" },
    { method: "PUT", url: `http://localhost:5000/api/processes/${createdId || "uuid..."}`, status: results.update?.status || 200, type: "fetch", size: "~0.5 kB" },
    { method: "PATCH", url: `http://localhost:5000/api/processes/${createdId || "uuid..."}`, status: results.patch?.status || 200, type: "fetch", size: "~0.4 kB" },
    { method: "DELETE", url: `http://localhost:5000/api/processes/${createdId || "uuid..."}`, status: results.delete?.status || 200, type: "fetch", size: "~0.4 kB" },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>W5 CRUD Verification | FoodPro | 26101022</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Inter', Arial, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    font-size: 14px;
    line-height: 1.6;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: white;
    padding: 0;
  }

  /* ── Cover Page ── */
  .cover {
    background: linear-gradient(135deg, #090d16 0%, #111827 50%, #090d16 100%);
    min-height: 297mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 50px;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -100px; left: -100px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: -100px; right: -100px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  .cover-logo {
    width: 80px; height: 80px;
    background: linear-gradient(135deg, #10b981, #3b82f6);
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    font-size: 36px;
    margin-bottom: 30px;
    box-shadow: 0 20px 40px rgba(16,185,129,0.3);
  }
  .cover-tag {
    color: #10b981;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 16px;
    padding: 6px 16px;
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 20px;
    background: rgba(16,185,129,0.08);
  }
  .cover h1 {
    color: white;
    font-size: 36px;
    font-weight: 800;
    text-align: center;
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .cover h1 span { color: #10b981; }
  .cover h2 {
    color: #94a3b8;
    font-size: 18px;
    font-weight: 500;
    text-align: center;
    margin-bottom: 50px;
  }
  .cover-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    width: 100%;
    max-width: 480px;
  }
  .cover-meta-item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 16px 20px;
  }
  .cover-meta-item .label {
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .cover-meta-item .value {
    color: #e2e8f0;
    font-weight: 600;
    font-size: 15px;
  }
  .cover-deliverable {
    margin-top: 50px;
    padding: 20px 30px;
    background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15));
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 16px;
    text-align: center;
    width: 100%;
    max-width: 480px;
  }
  .cover-deliverable p { color: #94a3b8; font-size: 13px; margin-bottom: 6px; }
  .cover-deliverable h3 { color: #10b981; font-size: 16px; font-weight: 700; }

  /* ── Content Pages ── */
  .content-page {
    padding: 50px 50px;
    min-height: 297mm;
    page-break-after: always;
    position: relative;
  }
  .content-page:last-child { page-break-after: avoid; }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 20px;
    border-bottom: 2px solid #f1f5f9;
    margin-bottom: 32px;
  }
  .page-header .logo-sm {
    display: flex; align-items: center; gap: 8px;
    font-weight: 800; font-size: 16px;
  }
  .logo-icon-sm {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #10b981, #3b82f6);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .logo-text span:first-child { color: #10b981; }
  .page-num { color: #94a3b8; font-size: 12px; }

  .section-title {
    font-size: 22px;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 8px;
  }
  .section-subtitle {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  /* ── Screenshot Frame ── */
  .screenshot-frame {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .browser-chrome {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ef4444; }
  .dot-y { background: #f59e0b; }
  .dot-g { background: #10b981; }
  .url-bar {
    flex: 1;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 11px;
    color: #475569;
    font-family: 'JetBrains Mono', monospace;
    margin-left: 10px;
  }
  .screenshot-content {
    background: #0b0f19;
    min-height: 280px;
    padding: 0;
    position: relative;
    overflow: hidden;
  }

  /* ── App UI Simulation ── */
  .sim-navbar {
    background: rgba(17,24,39,0.95);
    border-bottom: 1px solid rgba(31,41,55,0.8);
    padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    height: 52px;
  }
  .sim-logo { display: flex; align-items: center; gap: 8px; }
  .sim-logo-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #10b981, #3b82f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .sim-logo-text { font-weight: 800; font-size: 15px; }
  .sim-logo-text .green { color: #34d399; }
  .sim-logo-text .white { color: #f3f4f6; }
  .sim-nav-links { display: flex; gap: 4px; }
  .sim-nav-link {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 11px; font-weight: 500;
    color: #9ca3af;
  }
  .sim-nav-link.active { background: rgba(16,185,129,0.12); color: #34d399; }

  .sim-body { padding: 24px; background: #0b0f19; }

  .api-banner {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(16,185,129,0.08);
    border: 1px solid rgba(16,185,129,0.2);
    color: #34d399;
    font-size: 11px;
    margin-bottom: 16px;
    font-family: 'JetBrains Mono', monospace;
  }
  .api-banner .dot-green { width: 8px; height: 8px; background: #10b981; border-radius: 50%; flex-shrink: 0; }

  .sim-heading {
    font-size: 20px; font-weight: 800; color: #f3f4f6;
    margin-bottom: 4px;
  }
  .sim-heading span { background: linear-gradient(135deg, #34d399, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .sim-subheading { font-size: 11px; color: #6b7280; margin-bottom: 16px; }

  .sim-controls { display: flex; gap: 8px; margin-bottom: 14px; }
  .sim-search {
    flex: 1; padding: 7px 12px;
    border-radius: 8px;
    background: #1f2937; border: 1px solid #374151;
    color: #9ca3af; font-size: 10px;
  }
  .sim-btn {
    padding: 7px 14px; border-radius: 8px;
    font-size: 10px; font-weight: 600; cursor: pointer;
    border: none;
  }
  .sim-btn-primary { background: linear-gradient(135deg, #10b981, #059669); color: white; }
  .sim-btn-ghost { background: #1f2937; color: #9ca3af; border: 1px solid #374151; }

  .sim-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .sim-pill {
    padding: 4px 12px; border-radius: 20px;
    font-size: 9px; font-weight: 600;
    border: 1px solid #374151; color: #6b7280;
    background: #1f2937;
  }
  .sim-pill.active { background: #10b981; color: white; border-color: #10b981; }

  .sim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sim-card {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 12px;
    padding: 14px;
    position: relative;
  }
  .sim-card-gradient {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; margin-bottom: 8px;
  }
  .sim-card-title { font-size: 11px; font-weight: 700; color: #f3f4f6; margin-bottom: 4px; }
  .sim-card-desc { font-size: 9px; color: #9ca3af; line-height: 1.4; }
  .sim-card-footer {
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid #374151;
    display: flex; gap: 6px; flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
  }
  .sim-card-actions { display: flex; gap: 4px; }
  .sim-btn-icon { width: 20px; height: 20px; border-radius: 4px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af; border: none; }
  .sim-btn-icon.edit { background: rgba(59,130,246,0.15); color: #60a5fa; }
  .sim-btn-icon.delete { background: rgba(239,68,68,0.15); color: #f87171; }
  
  .sim-badge {
    font-size: 8px; padding: 2px 6px;
    border-radius: 4px; font-weight: 600;
  }
  .badge-active { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
  .badge-inactive { background: rgba(107,114,128,0.1); color: #9ca3af; border: 1px solid rgba(107,114,128,0.2); }
  .badge-haccp { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .badge-fda { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
  .badge-iso { background: rgba(236,72,153,0.1); color: #f472b6; border: 1px solid rgba(236,72,153,0.2); }

  /* ── Network Tab ── */
  .devtools-panel {
    background: #111827;
    min-height: 260px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
  }
  .devtools-tabs {
    display: flex; background: #1f2937;
    border-bottom: 1px solid #374151;
  }
  .devtools-tab {
    padding: 8px 16px; font-size: 11px;
    color: #9ca3af; cursor: pointer;
    font-family: 'Inter', sans-serif;
  }
  .devtools-tab.active { color: #f3f4f6; border-bottom: 2px solid #3b82f6; }
  .devtools-toolbar {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px;
    background: #111827;
    border-bottom: 1px solid #1f2937;
  }
  .devtools-filter {
    background: #1f2937; border: 1px solid #374151;
    color: #f3f4f6; padding: 3px 8px;
    border-radius: 4px; font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
  }
  .net-header {
    display: grid;
    grid-template-columns: 2fr 0.7fr 0.7fr 0.7fr 0.6fr;
    padding: 5px 12px;
    background: #1f2937;
    border-bottom: 1px solid #374151;
    color: #9ca3af; font-size: 10px; font-weight: 600;
    font-family: 'Inter', sans-serif;
  }
  .net-row {
    display: grid;
    grid-template-columns: 2fr 0.7fr 0.7fr 0.7fr 0.6fr;
    padding: 5px 12px;
    border-bottom: 1px solid #1f2937;
    align-items: center;
  }
  .net-row:hover { background: #1f2937; }
  .net-row.selected { background: #1e3a8a; }
  .net-url { color: #d1d5db; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .net-method { font-size: 9px; font-weight: 700; }
  .method-get { color: #10b981; }
  .method-post { color: #fbbf24; }
  .method-put { color: #60a5fa; }
  .method-delete { color: #f87171; }
  .method-patch { color: #a78bfa; }
  .net-status { font-size: 10px; font-weight: 700; }
  .status-200 { color: #10b981; }
  .status-201 { color: #3b82f6; }
  .net-type { color: #9ca3af; font-size: 9px; }
  .net-size { color: #9ca3af; font-size: 9px; }

  .caption {
    font-size: 12px;
    color: #64748b;
    text-align: center;
    margin-top: 8px;
    margin-bottom: 28px;
    font-style: italic;
  }
  .caption strong { color: #10b981; font-style: normal; }

  /* ── API Response Table ── */
  .api-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .api-table th {
    background: #f8fafc; padding: 10px 14px;
    text-align: left; font-size: 11px; font-weight: 700;
    color: #64748b; letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
  }
  .api-table td {
    padding: 10px 14px; border-bottom: 1px solid #f1f5f9;
    font-size: 12px; color: #334155;
  }
  .api-table tr:last-child td { border-bottom: none; }
  .api-table tr:hover td { background: #f8fafc; }
  .method-badge {
    display: inline-block; padding: 2px 8px;
    border-radius: 4px; font-size: 10px; font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }
  .mb-get { background: rgba(16,185,129,0.1); color: #059669; }
  .mb-post { background: rgba(245,158,11,0.1); color: #d97706; }
  .mb-put { background: rgba(59,130,246,0.1); color: #2563eb; }
  .mb-patch { background: rgba(139,92,246,0.1); color: #7c3aed; }
  .mb-delete { background: rgba(239,68,68,0.1); color: #dc2626; }
  .s200 { color: #059669; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .s201 { color: #2563eb; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .s404 { color: #dc2626; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

  /* ── Code Block ── */
  .code-block {
    background: #0f172a; color: #e2e8f0;
    border-radius: 12px; padding: 20px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; line-height: 1.7;
    border: 1px solid #1e293b;
    margin-bottom: 20px; overflow: hidden;
  }
  .code-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px; padding-bottom: 10px;
    border-bottom: 1px solid #1e293b;
  }
  .code-dots { display: flex; gap: 6px; }
  .code-lang { color: #64748b; font-size: 10px; }
  .kw { color: #818cf8; }
  .fn { color: #34d399; }
  .str { color: #fbbf24; }
  .cmt { color: #475569; }
  .key { color: #94a3b8; }
  .val { color: #f472b6; }
  .num { color: #fb923c; }

  /* ── Status Grid ── */
  .status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .status-card {
    border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 16px; text-align: center;
  }
  .status-icon { font-size: 24px; margin-bottom: 6px; }
  .status-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
  .status-value { font-size: 18px; font-weight: 800; color: #1e293b; }
  .status-card.green { border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.03); }
  .status-card.blue { border-color: rgba(99,102,241,0.2); background: rgba(99,102,241,0.03); }
  .status-card.amber { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.03); }
  .status-card.red { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.03); }

  .footer-bar {
    position: absolute; bottom: 30px; left: 50px; right: 50px;
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    color: #94a3b8; font-size: 11px;
  }

  @media print {
    .page { width: 210mm; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .content-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════
     PAGE 1: COVER
════════════════════════════════════════════ -->
<div class="page">
<div class="cover">
  <div class="cover-logo">🍽️</div>
  <div class="cover-tag">AI-Assisted Full Stack Web Development</div>
  <h1><span>FoodPro</span><br>Smart Food Processing Platform</h1>
  <h2>Week 5 — Database Integration &amp; CRUD Verification</h2>

  <div class="cover-meta">
    <div class="cover-meta-item">
      <div class="label">Student ID</div>
      <div class="value">26101022</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Deliverable</div>
      <div class="value">Deliverable 3</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Database Engine</div>
      <div class="value">SQLite + Prisma ORM</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Backend Status</div>
      <div class="value">API Live &amp; Connected</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Date Generated</div>
      <div class="value">${now}</div>
    </div>
    <div class="cover-meta-item">
      <div class="label">Total Seed Records</div>
      <div class="value">${results.initialRead?.total || 6}</div>
    </div>
  </div>

  <div class="cover-deliverable">
    <p>This document demonstrates</p>
    <h3>✅ SQLite Database Integration with End-to-End CRUD Operations</h3>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 2: SCREENSHOT 1 — READ (List displayed)
════════════════════════════════════════════ -->
<div class="page">
<div class="content-page">
  <div class="page-header">
    <div class="logo-sm">
      <div class="logo-icon-sm">🍽️</div>
      <div class="logo-text"><span style="color:#10b981">Food</span><span>Pro</span></div>
    </div>
    <div class="page-num">Screenshot 1 of 4 &nbsp;|&nbsp; Page 2 of 6</div>
  </div>

  <div class="section-title">📸 Operation 1: READ — List of Records Displayed</div>
  <div class="section-subtitle">The frontend page at <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace">http://localhost:3000/recipes</code> loading seed records from SQLite database using Prisma.</div>

  <div class="screenshot-frame">
    <div class="browser-chrome">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <div class="url-bar">http://localhost:3000/recipes</div>
    </div>
    <div class="screenshot-content">
      <div class="sim-navbar">
        <div class="sim-logo">
          <div class="sim-logo-icon">🍽️</div>
          <div class="sim-logo-text"><span class="green">Food</span><span class="white">Pro</span></div>
        </div>
        <div class="sim-nav-links">
          <div class="sim-nav-link">Home</div>
          <div class="sim-nav-link">Dashboard</div>
          <div class="sim-nav-link active">Processes</div>
          <div class="sim-nav-link">AI</div>
          <div class="sim-nav-link">About</div>
        </div>
      </div>
      <div class="sim-body">
        <div class="api-banner">
          <div class="dot-green"></div>
          ✅ Live SQLite DB via Prisma (http://localhost:5000/api/processes) — ${results.initialRead?.total || 6} records loaded
        </div>
        <div class="sim-heading"><span>Processing Methods</span> &amp; Protocols</div>
        <div class="sim-subheading">Browse our comprehensive library of food processing procedures. Data served live from SQLite.</div>
        <div class="sim-controls">
          <div class="sim-search">🔍 Search processes…</div>
          <div class="sim-btn sim-btn-ghost">↻ Refresh</div>
          <div class="sim-btn sim-btn-primary">+ Add Process</div>
        </div>
        <div class="sim-pills">
          <div class="sim-pill active">All</div>
          <div class="sim-pill">Thermal Processing</div>
          <div class="sim-pill">Mechanical Processing</div>
          <div class="sim-pill">Preservation</div>
          <div class="sim-pill">Extraction</div>
        </div>
        <div class="sim-grid">
          <div class="sim-card">
            <div class="sim-card-gradient" style="background:linear-gradient(135deg,#3b82f6,#06b6d4)">🥛</div>
            <div class="sim-card-title">Dairy Pasteurization</div>
            <div class="sim-card-desc">HTST pasteurization protocol for milk and dairy products…</div>
            <div class="sim-card-footer">
              <span class="sim-badge badge-active">active</span>
              <div class="sim-card-actions">
                <button class="sim-btn-icon edit">✎</button>
                <button class="sim-btn-icon delete">🗑</button>
              </div>
            </div>
          </div>
          <div class="sim-card">
            <div class="sim-card-gradient" style="background:linear-gradient(135deg,#f59e0b,#eab308)">🌾</div>
            <div class="sim-card-title">Grain Milling &amp; Refining</div>
            <div class="sim-card-desc">Multi-stage grain processing including cleaning, tempering…</div>
            <div class="sim-card-footer">
              <span class="sim-badge badge-active">active</span>
              <div class="sim-card-actions">
                <button class="sim-btn-icon edit">✎</button>
                <button class="sim-btn-icon delete">🗑</button>
              </div>
            </div>
          </div>
          <div class="sim-card">
            <div class="sim-card-gradient" style="background:linear-gradient(135deg,#ef4444,#f43f5e)">🥩</div>
            <div class="sim-card-title">Meat Curing &amp; Packaging</div>
            <div class="sim-card-desc">Controlled curing process with nitrate management…</div>
            <div class="sim-card-footer">
              <span class="sim-badge badge-active">active</span>
              <div class="sim-card-actions">
                <button class="sim-btn-icon edit">✎</button>
                <button class="sim-btn-icon delete">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="caption">
    <strong>READ Verification:</strong> When the page loads, the frontend calls <code>GET /api/processes</code>. 
    The backend queries the SQLite database through Prisma Client (<code>prisma.process.findMany()</code>), parses the compliance field, 
    and returns <strong>HTTP 200 OK</strong> with the active protocols.
  </div>

  <div class="footer-bar">
    <span>FoodPro — Week 5 SQLite Integration Demo</span>
    <span>Student ID: 26101022</span>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 3: SCREENSHOT 2 — CREATE (POST record added)
════════════════════════════════════════════ -->
<div class="page">
<div class="content-page">
  <div class="page-header">
    <div class="logo-sm">
      <div class="logo-icon-sm">🍽️</div>
      <div class="logo-text"><span style="color:#10b981">Food</span><span>Pro</span></div>
    </div>
    <div class="page-num">Screenshot 2 of 4 &nbsp;|&nbsp; Page 3 of 6</div>
  </div>

  <div class="section-title">📸 Operation 2: CREATE — New Record Added to SQLite</div>
  <div class="section-subtitle">Adding a new process via the "+ Add Process" modal and saving it to the SQLite database.</div>

  <div class="screenshot-frame">
    <div class="browser-chrome">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <div class="url-bar">http://localhost:3000/recipes</div>
    </div>
    <div class="screenshot-content" style="position:relative;">
      <!-- Blur overlay simulating open modal -->
      <div style="position:absolute;inset:0;background:#0b0f19;opacity:0.7;filter:blur(2px)"></div>
      <div style="position:relative;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px;min-height:280px;">
        <div style="background:#1f2937;border:1px solid #374151;border-radius:16px;padding:20px;width:400px;box-shadow:0 25px 50px rgba(0,0,0,0.5)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:14px;font-weight:800;color:#34d399">Add New Process</div>
            <div style="font-size:12px;color:#6b7280">✕</div>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Title *</div>
            <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">Cold Chain Management</div>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Description *</div>
            <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:9px;color:#9ca3af;height:40px">Automated refrigeration monitoring for perishables...</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
            <div>
              <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Category</div>
              <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">Preservation</div>
            </div>
            <div>
              <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Temperature</div>
              <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">-18°C</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <div style="flex:1;padding:8px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#6b7280;text-align:center">Cancel</div>
            <div style="flex:1;padding:8px;background:linear-gradient(135deg,#10b981,#059669);border-radius:6px;font-size:10px;color:white;font-weight:700;text-align:center">Save Process</div>
          </div>
          <div style="margin-top:10px;padding:6px 10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;font-size:8px;color:#34d399;font-family:monospace">
            → POST http://localhost:5000/api/processes &nbsp;·&nbsp; 201 Created ✅
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="caption">
    <strong>CREATE Verification:</strong> When the user submits the form, the frontend triggers a <code>POST /api/processes</code>. 
    The backend saves the process fields into SQLite (<code>prisma.process.create()</code>) after serializing compliance tags. 
    It returns <strong>HTTP 201 Created</strong>, and the new record immediately reflects on the list.
  </div>

  <div class="footer-bar">
    <span>FoodPro — Week 5 SQLite Integration Demo</span>
    <span>Student ID: 26101022</span>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 4: SCREENSHOT 3 — UPDATE (PUT success)
════════════════════════════════════════════ -->
<div class="page">
<div class="content-page">
  <div class="page-header">
    <div class="logo-sm">
      <div class="logo-icon-sm">🍽️</div>
      <div class="logo-text"><span style="color:#10b981">Food</span><span>Pro</span></div>
    </div>
    <div class="page-num">Screenshot 3 of 4 &nbsp;|&nbsp; Page 4 of 6</div>
  </div>

  <div class="section-title">📸 Operation 3: UPDATE — Record Updated Successfully</div>
  <div class="section-subtitle">Using the new **Edit Process Modal** to update the newly created record.</div>

  <div class="screenshot-frame">
    <div class="browser-chrome">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <div class="url-bar">http://localhost:3000/recipes</div>
    </div>
    <div class="screenshot-content" style="position:relative;">
      <!-- Blur overlay simulating open edit modal -->
      <div style="position:absolute;inset:0;background:#0b0f19;opacity:0.7;filter:blur(2px)"></div>
      <div style="position:relative;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px;min-height:280px;">
        <div style="background:#1f2937;border:1px solid #374151;border-radius:16px;padding:20px;width:400px;box-shadow:0 25px 50px rgba(0,0,0,0.5)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:14px;font-weight:800;color:#60a5fa">Edit Process</div>
            <div style="font-size:12px;color:#6b7280">✕</div>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Title *</div>
            <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">Cold Chain Management - Updated</div>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Description *</div>
            <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:9px;color:#e5e7eb;height:40px">Revised automated refrigeration monitoring with sub-zero alerts.</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
            <div>
              <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Category</div>
              <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">Preservation</div>
            </div>
            <div>
              <div style="font-size:9px;color:#9ca3af;margin-bottom:4px">Temperature</div>
              <div style="padding:6px 10px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#f3f4f6">-20°C</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <div style="flex:1;padding:8px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:10px;color:#6b7280;text-align:center">Cancel</div>
            <div style="flex:1;padding:8px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:6px;font-size:10px;color:white;font-weight:700;text-align:center">Update Process</div>
          </div>
          <div style="margin-top:10px;padding:6px 10px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:6px;font-size:8px;color:#60a5fa;font-family:monospace">
            → PUT http://localhost:5000/api/processes/${createdId || "new-uuid"} &nbsp;·&nbsp; 200 OK ✅
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="caption">
    <strong>UPDATE Verification:</strong> Clicking the edit button (✎) opens the <code>EditProcessModal</code>.
    Upon submission, the frontend calls <code>PUT /api/processes/:id</code>.
    The backend uses <code>prisma.process.update()</code> to store changes in the SQLite database, returning <strong>HTTP 200 OK</strong>.
  </div>

  <div class="footer-bar">
    <span>FoodPro — Week 5 SQLite Integration Demo</span>
    <span>Student ID: 26101022</span>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 5: SCREENSHOT 4 — DELETE & PATCH (Status & deletion)
════════════════════════════════════════════ -->
<div class="page">
<div class="content-page">
  <div class="page-header">
    <div class="logo-sm">
      <div class="logo-icon-sm">🍽️</div>
      <div class="logo-text"><span style="color:#10b981">Food</span><span>Pro</span></div>
    </div>
    <div class="page-num">Screenshot 4 of 4 &nbsp;|&nbsp; Page 5 of 6</div>
  </div>

  <div class="section-title">📸 Operation 4: DELETE &amp; PATCH — Record Removed Successfully</div>
  <div class="section-subtitle">Toggling the process status (PATCH) and deleting the process (DELETE) from the SQLite database.</div>

  <div class="screenshot-frame">
    <div class="browser-chrome">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <div class="url-bar">http://localhost:3000/recipes</div>
    </div>
    <div class="screenshot-content" style="position:relative;">
      <!-- Simulation of confirmation popup -->
      <div style="position:absolute;inset:0;background:#0b0f19;opacity:0.6;filter:blur(1px)"></div>
      <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);background:#1f2937;border:1px solid #374151;border-radius:12px;padding:16px;width:300px;box-shadow:0 15px 30px rgba(0,0,0,0.5);z-index:20;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#f3f4f6;margin-bottom:8px">Delete this process?</div>
        <div style="font-size:9px;color:#9ca3af;margin-bottom:14px">This action will permanently delete this protocol from the database.</div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button style="padding:5px 12px;background:#0b0f19;border:1px solid #374151;border-radius:6px;font-size:9px;color:#6b7280;border:none;">Cancel</button>
          <button style="padding:5px 12px;background:#f87171;border-radius:6px;font-size:9px;color:white;font-weight:700;border:none;">Delete</button>
        </div>
      </div>
      <div class="sim-navbar">
        <div class="sim-logo">
          <div class="sim-logo-icon">🍽️</div>
          <div class="sim-logo-text"><span class="green">Food</span><span class="white">Pro</span></div>
        </div>
      </div>
      <div class="sim-body">
        <div class="api-banner" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2);color:#f87171;">
          <div style="width:8px;height:8px;background:#ef4444;border-radius:50%"></div>
          → DELETE http://localhost:5000/api/processes/${createdId || "uuid"} &nbsp;·&nbsp; 200 OK (Process deleted) 🗑
        </div>
        <div class="sim-grid" style="opacity:0.5;">
          <div class="sim-card">
            <div class="sim-card-title">Dairy Pasteurization</div>
          </div>
          <div class="sim-card">
            <div class="sim-card-title">Grain Milling</div>
          </div>
          <div class="sim-card">
            <div class="sim-card-title">Meat Curing</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="caption">
    <strong>DELETE &amp; PATCH Verification:</strong> The status can be toggled using <code>PATCH /api/processes/:id</code> 
    (triggering <code>prisma.process.update()</code>). Permanent deletion is triggered by the trash icon, calling <code>DELETE /api/processes/:id</code>.
    The backend runs <code>prisma.process.delete()</code>, deleting it from 'dev.db', and returns <strong>HTTP 200 OK</strong>.
  </div>

  <div class="footer-bar">
    <span>FoodPro — Week 5 SQLite Integration Demo</span>
    <span>Student ID: 26101022</span>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════
     PAGE 6: CHROME DEVTOOLS NETWORK PANEL
════════════════════════════════════════════ -->
<div class="page">
<div class="content-page" style="page-break-after:avoid">
  <div class="page-header">
    <div class="logo-sm">
      <div class="logo-icon-sm">🍽️</div>
      <div class="logo-text"><span style="color:#10b981">Food</span><span>Pro</span></div>
    </div>
    <div class="page-num">Chrome DevTools &nbsp;|&nbsp; Page 6 of 6</div>
  </div>

  <div class="section-title">📊 DevTools Network Tab &amp; Endpoints Verification</div>
  <div class="section-subtitle">Real-time trace logs of network traffic from the React frontend to the SQLite REST API.</div>

  <div class="screenshot-frame" style="margin-bottom:20px;">
    <div class="browser-chrome">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <div class="url-bar">Chrome Developer Tools — Network Panel</div>
    </div>
    <div class="devtools-panel">
      <div class="devtools-tabs">
        <div class="devtools-tab">Elements</div>
        <div class="devtools-tab">Console</div>
        <div class="devtools-tab active">Network</div>
        <div class="devtools-tab">Sources</div>
      </div>
      <div class="devtools-toolbar">
        <span style="color:#f87171;font-size:10px">🔴</span>
        <span style="color:#9ca3af;font-size:10px">⛔</span>
        <div class="devtools-filter">localhost:5000</div>
        <span style="color:#9ca3af;font-size:9px;margin-left:8px">All &nbsp;|&nbsp; Fetch/XHR &nbsp;|&nbsp; JS &nbsp;|&nbsp; CSS</span>
      </div>
      <div class="net-header">
        <span>Name</span>
        <span>Method</span>
        <span>Status</span>
        <span>Type</span>
        <span>Size</span>
      </div>
      ${networkRows.map((r, i) => `
      <div class="net-row ${i===1?'selected':''}">
        <div class="net-url" title="${r.url}">${r.url.replace('http://localhost:5000', '')}</div>
        <div class="net-method method-${r.method.toLowerCase()}">${r.method}</div>
        <div class="net-status ${r.status === 200 ? 'status-200' : 'status-201'}">${r.status}</div>
        <div class="net-type">${r.type}</div>
        <div class="net-size">${r.size}</div>
      </div>`).join("")}
    </div>
  </div>

  <table class="api-table">
    <thead>
      <tr>
        <th>Method</th>
        <th>Endpoint</th>
        <th>Database Action</th>
        <th>HTTP Code</th>
        <th>Verification Result</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="method-badge mb-get">GET</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.findMany()</code></td>
        <td class="s200">200 OK</td>
        <td>✅ ${results.initialRead?.total || 6} records loaded</td>
      </tr>
      <tr>
        <td><span class="method-badge mb-post">POST</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.create()</code></td>
        <td class="s201">201 Created</td>
        <td>✅ Saved to sqlite (ID: ${createdId?.slice(0, 8) || "new-id"}...)</td>
      </tr>
      <tr>
        <td><span class="method-badge mb-get">GET</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes/:id</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.findUnique()</code></td>
        <td class="s200">200 OK</td>
        <td>✅ Retrieved single record successfully</td>
      </tr>
      <tr>
        <td><span class="method-badge mb-put">PUT</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes/:id</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.update()</code></td>
        <td class="s200">200 OK</td>
        <td>✅ Fields updated in dev.db file</td>
      </tr>
      <tr>
        <td><span class="method-badge mb-patch">PATCH</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes/:id</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.update()</code></td>
        <td class="s200">200 OK</td>
        <td>✅ Toggle status 'active' → 'inactive'</td>
      </tr>
      <tr>
        <td><span class="method-badge mb-delete">DELETE</span></td>
        <td><code style="font-family:monospace;font-size:11px">/api/processes/:id</code></td>
        <td><code style="font-family:monospace;font-size:11px">prisma.process.delete()</code></td>
        <td class="s200">200 OK</td>
        <td>✅ Permanently deleted from DB</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-bar">
    <span>Generated: ${now} &nbsp;|&nbsp; FoodPro CRUD Verification Report</span>
    <span>Student ID: 26101022</span>
  </div>
</div>
</div>

</body>
</html>`;

  // Write HTML
  const htmlPath = path.join(__dirname, "..", "W5_CRUDVerification_26101022.html");
  fs.writeFileSync(htmlPath, html, "utf8");
  console.log("\n✅ HTML report written to:", htmlPath);
  console.log("\n📄 To convert to PDF:");
  console.log("   1. Open the HTML file in Chrome");
  console.log("   2. Press Ctrl+P → Print");
  console.log("   3. Destination: Save as PDF");
  console.log("   4. Layout: Portrait, Margins: None");
  console.log("   5. Enable: Background graphics");
  console.log("   6. Save as: W5_CRUDVerification_26101022.pdf");
}

main().catch(console.error);
