// --- 1. DYNAMIC ENVIRONMENT CONFIGURATION ---
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// When deployed, replace the second string with your Node.js backend Render URL
const BACKEND_URL = isLocalhost 
    ? 'http://localhost:5000' 
    : 'https://aapdaseta-backend.onrender.com'; // <--- Update this after deploying Node.js!

// --- 2. DATABASE CONFIGURATION ---
const SUPABASE_URL = 'https://cphqdgqtrosaxosdwdrz.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaHFkZ3F0cm9zYXhvc2R3ZHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MjU4NDQsImV4cCI6MjA3OTMwMTg0NH0.CGhmghdxQaPpD6uxDjaoAmnhZZsOKiiwacNw-ZrpDQc';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Variables
let meshMap;
let liveNodeMemory = {}; 
let mapCircles = {}; 
let mapMarkers = {}; 

// Google Maps Initialization
window.initMeshMap = function() {
    const center = { lat: 22.0, lng: 82.0 }; 
    
    meshMap = new google.maps.Map(document.getElementById("meshMap"), {
        zoom: 5, 
        center: center,
        disableDefaultUI: true,
        mapId: "DEMO_MAP_ID_MESH",
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#1a252f' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a252f' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] }
        ]
    });
    
    fetchMeshNodes();
    setupRealtime();
}

// Data Fetching & Realtime Sync
async function fetchMeshNodes() {
    const { data: nodes, error } = await supabaseClient.from('ai_mesh_nodes').select('*');
    if (error || !nodes) return console.error("DB Error:", error);

    nodes.forEach(node => {
        liveNodeMemory[node.id] = node;
        const pos = { lat: node.latitude, lng: node.longitude };

        const centerDot = document.createElement("div");
        centerDot.className = "mesh-center-dot";
        centerDot.title = node.region_name;

        mapMarkers[node.id] = new google.maps.marker.AdvancedMarkerElement({
            position: pos,
            map: meshMap,
            title: node.region_name,
            content: centerDot 
        });

        const maxProb = Math.max(node.heatwave_prob, node.landslide_prob, node.flood_prob);
        const statusColor = maxProb > 50 ? "#ffc107" : "#198754"; 

        mapCircles[node.id] = new google.maps.Circle({
            strokeColor: statusColor,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: statusColor,
            fillOpacity: 0.25,
            map: meshMap,
            center: pos,
            radius: 10000
        });
    });

    renderAllNodesList();
    evaluateGlobalWarning();
    renderAllTelemetry();
}

// --- 3. SECURE AI PREDICTION SYNC ---
// Call this function when you want to ask the Python model for new data
window.syncModelPredictions = async function() {
    const statusBadge = document.getElementById('sync-status');
    statusBadge.innerHTML = `<span class="spinner-grow spinner-grow-sm text-info me-2"></span> Analyzing Data...`;

    try {
        // Send our node list to our Node.js backend (NOT Python directly)
        const response = await fetch(`${BACKEND_URL}/api/mesh/update-predictions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes: Object.values(liveNodeMemory) })
        });

        if (!response.ok) throw new Error("Backend proxy failed");
        
        // Note: We don't even need to update the UI manually here!
        // Because the backend updates Supabase, and we have setupRealtime() running,
        // the map and cards will update themselves automatically as soon as the DB changes!

    } catch (error) {
        console.error("Failed to sync AI:", error);
        statusBadge.innerText = "Sync Failed";
    }
}

function setupRealtime() {
    supabaseClient.channel('mesh-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_mesh_nodes' }, payload => {
            
            liveNodeMemory[payload.new.id] = payload.new;

            const statusBadge = document.getElementById('sync-status');
            statusBadge.innerHTML = `<i class="bi bi-check-circle-fill"></i> Data Synced!`;
            statusBadge.parentElement.classList.replace('border-info', 'border-success');
            statusBadge.parentElement.classList.replace('text-info', 'text-success');
            
            setTimeout(() => {
                statusBadge.innerHTML = `<span class="spinner-grow spinner-grow-sm text-info me-2"></span> Mesh Active`;
                statusBadge.parentElement.classList.replace('border-success', 'border-info');
                statusBadge.parentElement.classList.replace('text-success', 'text-info');
            }, 3000);
            
            updateMapCircle(payload.new);
            renderAllNodesList();
            evaluateGlobalWarning();
            renderAllTelemetry();

        }).subscribe();
}

// Map Update Helpers
// --- NEW ALARM LOGIC (Strict Confidence Checks) ---
function isNodeInWarning(node) {
    let t = node.ai_telemetry;
    if (typeof t === 'string') {
        try { t = JSON.parse(t); } catch(e) { t = {}; }
    }

    if (!t) return false; // No data, no warning

    // Both probability MUST be > 50 AND confidence MUST be > 50% (0.50)
    let heatWarning = t.heatwave && (node.heatwave_prob > 50) && (t.heatwave.confidence > 0.50);
    let cycWarning = t.cyclone && (node.landslide_prob > 50) && (t.cyclone.confidence > 0.50);
    let floodWarning = t.flood && (node.flood_prob > 50) && (t.flood.confidence > 0.50);

    return heatWarning || cycWarning || floodWarning;
}

// Map Update Helpers
function updateMapCircle(node) {
    if(mapCircles[node.id]) {
        // Use our strict new logic
        const statusColor = isNodeInWarning(node) ? "#ffc107" : "#198754";
        
        mapCircles[node.id].setOptions({
            strokeColor: statusColor,
            fillColor: statusColor
        });
    }
}

function focusNode(lat, lng) {
    meshMap.panTo({lat, lng});
    meshMap.setZoom(9);
}

// UI Rendering
function renderAllNodesList() {
    const container = document.getElementById('mesh-cards-container');
    container.innerHTML = ''; 
    let latestTime = null;

    Object.values(liveNodeMemory).forEach(node => {
        // Use our strict new logic
        const isWarning = isNodeInWarning(node);
        const warningClass = isWarning ? 'warning-state' : '';
        const nodeTime = new Date(node.last_updated);
        if(!latestTime || nodeTime > latestTime) latestTime = nodeTime;

        container.innerHTML += `
            <div class="compact-node-card shadow-sm ${warningClass}" onclick="focusNode(${node.latitude}, ${node.longitude})">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold ${isWarning ? 'text-warning' : 'text-success'}">
                        <i class="bi bi-geo-alt-fill"></i> ${node.region_name}
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <div class="stat-pill text-light">🌊 Flood: <span class="${getColor(node.flood_prob)}">${node.flood_prob}%</span></div>
                    <div class="stat-pill text-light">🌡️ Heat: <span class="${getColor(node.heatwave_prob)}">${node.heatwave_prob}%</span></div>
                    <div class="stat-pill text-light">🌀 Cyclone: <span class="${getColor(node.landslide_prob)}">${node.landslide_prob}%</span></div>
                </div>
            </div>
        `;
    });

    if(latestTime) {
        document.getElementById('last-update-time').innerText = `Updated: ${latestTime.toLocaleTimeString()}`;
    }
}

function evaluateGlobalWarning() {
    const banner = document.getElementById('global-warning-banner');
    let warningNodes = [];
    
    Object.values(liveNodeMemory).forEach(node => {
        // Use our strict new logic
        if (isNodeInWarning(node)) {
            warningNodes.push(node.region_name);
        }
    });

    if (warningNodes.length > 0) {
        banner.className = "alert alert-warning d-flex align-items-center fw-bold shadow-sm mb-4 border-warning";
        banner.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill fs-3 me-3 text-danger pulse"></i> 
            <div>
                <span class="text-danger">⚠️ HIGH CONFIDENCE THREAT DETECTED</span><br>
                <small class="fw-normal text-dark">Verified AI prediction > 50% in: <strong>${warningNodes.join(', ')}</strong>.</small>
            </div>
        `;
        banner.style.display = "flex";
    } else {
        banner.style.display = "none";
    }
}

function getColor(prob) {
    if (prob > 50) return "text-danger-custom";
    if (prob > 30) return "text-warning-custom";
    return "text-success-custom";
}

// --- RENDER ALL DEEP TELEMETRY DATA ---
function renderAllTelemetry() {
    const container = document.getElementById('all-telemetry-container');
    container.innerHTML = ''; 
    
    const nodes = Object.values(liveNodeMemory);

    if (nodes.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-4">No AI Nodes currently deployed.</div>`;
        return;
    }

    nodes.forEach(node => {
        let t = node.ai_telemetry;
        if (typeof t === 'string') {
            try { t = JSON.parse(t); } catch(e) { t = {}; }
        }

        if (!t || Object.keys(t).length === 0 || !t.heatwave) {
            container.innerHTML += `
                <div class="col-xl-6">
                    <div class="card stat-card h-100 shadow-sm" style="background-color: #1a252f; border: 1px solid #2c3e50;">
                        <div class="card-header border-bottom border-secondary py-3">
                            <h6 class="fw-bold text-light mb-0"><i class="bi bi-geo-alt-fill text-info"></i> ${node.region_name}</h6>
                        </div>
                        <div class="card-body text-center text-warning py-5">
                            <i class="bi bi-hourglass-split d-block fs-3 mb-2"></i> Awaiting Multi-Model Sync...
                        </div>
                    </div>
                </div>
            `;
            return; 
        }

        container.innerHTML += `
            <div class="col-xl-6">
                <div class="card stat-card h-100 shadow-sm" style="background-color: #1a252f; border: 1px solid #2c3e50;">
                    
                    <div class="card-header border-bottom border-secondary py-3 d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold text-light mb-0"><i class="bi bi-geo-alt-fill text-info"></i> ${node.region_name}</h6>
                    </div>
                    
                    <div class="card-body p-0">
                        ${t.heatwave ? `
                        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                            <div>
                                <span class="d-block small text-muted text-uppercase fw-bold"><i class="bi bi-brightness-high text-warning"></i> Heatwave</span>
                                <span class="${t.heatwave.heatwave === 1 ? 'text-danger' : 'text-success'} fw-bold">${t.heatwave.verdict}</span>
                            </div>
                            <div class="text-end">
                                <h5 class="mb-0 text-white">${(t.heatwave.probability_heat * 100).toFixed(0)}%</h5>
                            </div>
                        </div>` : ''}

                        ${t.cyclone ? `
                        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                            <div>
                                <span class="d-block small text-muted text-uppercase fw-bold"><i class="bi bi-hurricane text-info"></i> Cyclone</span>
                                <span class="${t.cyclone.prediction_score > 0.5 ? 'text-danger' : 'text-success'} fw-bold">${t.cyclone.verdict}</span>
                            </div>
                            <div class="text-end">
                                <h5 class="mb-0 text-white">${(t.cyclone.probability_cyclone * 100).toFixed(0)}%</h5>
                            </div>
                        </div>` : ''}

                        ${t.flood ? `
                        <div class="d-flex justify-content-between align-items-center p-3">
                            <div>
                                <span class="d-block small text-muted text-uppercase fw-bold"><i class="bi bi-water text-primary"></i> Flood</span>
                                <span class="${t.flood.flood === 1 || t.flood.heatwave === 1 ? 'text-danger' : 'text-success'} fw-bold">${t.flood.verdict}</span>
                            </div>
                            <div class="text-end">
                                <h5 class="mb-0 text-white">${((t.flood.probability_flood || t.flood.probability_heat || 0) * 100).toFixed(0)}%</h5>
                            </div>
                        </div>` : ''}
                    </div>

                    <div class="card-footer border-top border-secondary d-flex justify-content-between align-items-center py-2" style="background-color: rgba(0,0,0,0.1);">
                        <button class="btn btn-sm btn-outline-info" onclick="showRawData('${node.id}')"><i class="bi bi-code-square"></i> Show Data</button>
                        <small class="text-muted font-monospace" style="font-size: 0.65rem;">Last Sync: ${t.timestamp}</small>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- NEW RAW DATA POPUP MODAL ---
function showRawData(nodeId) {
    const node = liveNodeMemory[nodeId];
    if (!node) return;
    
    let t = node.ai_telemetry;
    if (typeof t === 'string') {
        try { t = JSON.parse(t); } catch(e) { t = {}; }
    }

    // Check if modal exists, if not inject it into the body
    let modalEl = document.getElementById('telemetryModal');
    if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="telemetryModal" tabindex="-1">
              <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content" style="background-color: #1a252f; border: 1px solid #0dcaf0;">
                  <div class="modal-header border-secondary">
                    <h5 class="modal-title text-info fw-bold" id="telemetryModalTitle">Raw Telemetry</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body bg-dark">
                    <pre id="telemetryModalBody" class="text-success m-0" style="font-size: 13px;"></pre>
                  </div>
                </div>
              </div>
            </div>
        `);
        modalEl = document.getElementById('telemetryModal');
    }

    // Fill the modal with data
    document.getElementById('telemetryModalTitle').innerHTML = `<i class="bi bi-cpu"></i> Deep AI Telemetry: ${node.region_name}`;
    document.getElementById('telemetryModalBody').innerText = JSON.stringify(t, null, 2);

    // Trigger Bootstrap Modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}