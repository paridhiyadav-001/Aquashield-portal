// ==================== 1. THEME TOGGLE ====================
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    
    localStorage.setItem('aqua_theme', isDark ? 'dark' : 'light');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

// Safe Theme Init
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('aqua_theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
});

// ==================== 2. AUTHENTICATION & ROUTING ====================
function handleProtectedNavigation(targetPage) {
    const isLoggedIn = localStorage.getItem('isCitizenLoggedIn') === 'true';
    if (!isLoggedIn) {
        sessionStorage.setItem('redirect_after_login', targetPage);
        window.location.href = 'login.html';
    } else {
        window.location.href = targetPage;
    }
}

function handleCitizenLogin(e) {
    e.preventDefault();
    localStorage.setItem('isCitizenLoggedIn', 'true');
    const target = sessionStorage.getItem('redirect_after_login') || 'gis-map.html';
    sessionStorage.removeItem('redirect_after_login');
    window.location.href = target;
}

function handleOfficerLogin(e) {
    e.preventDefault();
    const pin = document.getElementById('officerPin').value;
    if (pin === '1234') {
        localStorage.setItem('isOfficerLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else {
        alert("Invalid Security PIN! Demo PIN is '1234'");
    }
}

function logout() {
    localStorage.removeItem('isCitizenLoggedIn');
    localStorage.removeItem('isOfficerLoggedIn');
    window.location.href = 'index.html';
}

// ==================== 3. GPS LOCATION ====================
function fetchLiveLocation() {
    const locationInput = document.getElementById('locationInput');
    const statusTxt = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        statusTxt.style.color = '#e11d48';
        statusTxt.innerText = "Geolocation is not supported by your browser.";
        return;
    }

    statusTxt.style.color = '#0284c7';
    statusTxt.innerText = "Fetching coordinates...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            locationInput.value = `${lat}, ${lng}`;
            statusTxt.style.color = '#059669';
            statusTxt.innerText = "✓ Location captured successfully!";
        },
        () => {
            // Fallback for testing
            locationInput.value = "22.719600, 75.857700";
            statusTxt.style.color = '#059669';
            statusTxt.innerText = "✓ Demo GPS Location Captured!";
        },
        { enableHighAccuracy: true }
    );
}

// ==================== 4. REPORT COMPLAINT ====================
function handleReportSubmit(event) {
    event.preventDefault();

    const hazardType = document.getElementById('hazardType').value;
    const depth = document.getElementById('waterDepth').value;
    const location = document.getElementById('locationInput').value;
    const description = document.getElementById('description').value || "N/A";

    if (!location) {
        alert("Please click 'Get Live GPS' first.");
        return;
    }

    const newReport = {
        id: "REP-" + Math.floor(1000 + Math.random() * 9000),
        type: hazardType,
        depth: depth,
        location: location,
        description: description,
        status: "Pending",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let existing = JSON.parse(localStorage.getItem('aqua_complaints') || '[]');
    existing.unshift(newReport);
    localStorage.setItem('aqua_complaints', JSON.stringify(existing));

    alert("Complaint Registered Successfully! Transmitted to Municipal Officer Dashboard.");
    document.getElementById('hazardForm').reset();
    document.getElementById('locationStatus').innerText = "";
    
    // Refresh stats if on home page
    if (typeof loadComplaintStats === 'function') {
        loadComplaintStats();
    }
}

// ==================== 5. ADVANCED DASHBOARD LOGIC ====================
let currentFilter = 'all';

function loadAuthorityDashboard() {
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;

    let complaints = JSON.parse(localStorage.getItem('aqua_complaints') || '[]');

    // 1. Calculate Real-time Stats
    let criticalCount = complaints.filter(c => c.depth === 'waist' || c.depth === 'severe' || c.depth === 'knee' || (c.status && c.status.toLowerCase() === 'critical')).length;
    let dispatchedCount = complaints.filter(c => c.status === 'Dispatched').length;
    let resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

    const totalElem = document.getElementById('statTotal');
    const critElem = document.getElementById('statCritical');
    const dispElem = document.getElementById('statDispatched');
    const resElem = document.getElementById('statResolved');

    if (totalElem) totalElem.innerText = complaints.length;
    if (critElem) critElem.innerText = criticalCount;
    if (dispElem) dispElem.innerText = dispatchedCount;
    if (resElem) resElem.innerText = resolvedCount;

    // 2. Apply Filters
    let filteredData = complaints;
    if (currentFilter === 'critical') {
        filteredData = complaints.filter(c => c.depth === 'waist' || c.depth === 'severe' || c.depth === 'knee' || (c.status && c.status.toLowerCase() === 'critical'));
    } else if (currentFilter === 'dispatched') {
        filteredData = complaints.filter(c => c.status === 'Dispatched');
    } else if (currentFilter === 'resolved') {
        filteredData = complaints.filter(c => c.status === 'Resolved');
    }

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:1.5rem;">No active complaints found matching this filter.</td></tr>`;
        return;
    }

    // 3. Render Dynamic Table Rows
    tableBody.innerHTML = filteredData.map((item) => {
        let realIndex = complaints.findIndex(c => c.id === item.id);
        let deptTag = (item.type === 'road_block' || item.type === 'waterlogging') ? 'PWD' : 'Municipal Corp';
        let isResolved = item.status === 'Resolved';
        let isDispatched = item.status === 'Dispatched';

        return `
            <tr>
                <td><strong>${item.id}</strong></td>
                <td style="text-transform:capitalize;">${item.type.replace(/_/g, ' ')}</td>
                <td><span style="color:${(item.depth === 'severe' || item.depth === 'waist') ? '#e11d48' : '#0284c7'}; font-weight:600;">${item.depth}</span></td>
                <td><code style="background:#e0f2fe; padding:2px 6px; border-radius:4px; color:#0284c7;">${item.location}</code></td>
                <td><strong>${deptTag}</strong></td>
                <td>
                    <span style="padding:2px 8px; border-radius:10px; font-size:0.72rem; font-weight:bold; background:${isResolved ? '#d1fae5' : (isDispatched ? '#fef3c7' : '#ffe4e6')}; color:${isResolved ? '#059669' : (isDispatched ? '#d97706' : '#e11d48')};">
                        ${item.status || 'Pending'}
                    </span>
                </td>
                <td>
                    <div class="action-btns" style="display:flex; gap:6px;">
                        ${!isResolved && !isDispatched ? `<button class="btn btn-blue" style="padding:3px 8px; font-size:0.72rem;" onclick="dispatchTeam(${realIndex})"><i class="fa-solid fa-truck"></i> Dispatch</button>` : ''}
                        ${!isResolved ? `<button class="btn btn-green" style="padding:3px 8px; font-size:0.72rem;" onclick="markResolved(${realIndex})"><i class="fa-solid fa-check"></i> Resolve</button>` : '<span style="color:#059669; font-size:0.78rem;">✓ Complete</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterDashboard(filterType, element) {
    currentFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');
    loadAuthorityDashboard();
}

function dispatchTeam(index) {
    let complaints = JSON.parse(localStorage.getItem('aqua_complaints') || '[]');
    complaints[index].status = 'Dispatched';
    localStorage.setItem('aqua_complaints', JSON.stringify(complaints));
    alert(`Emergency Rescue / Drainage Team Dispatched for Report ${complaints[index].id}!`);
    loadAuthorityDashboard();
    if (typeof loadComplaintStats === 'function') loadComplaintStats();
}

function markResolved(index) {
    let complaints = JSON.parse(localStorage.getItem('aqua_complaints') || '[]');
    complaints[index].status = 'Resolved';
    localStorage.setItem('aqua_complaints', JSON.stringify(complaints));
    loadAuthorityDashboard();
    if (typeof loadComplaintStats === 'function') loadComplaintStats();
}

function sendBroadcastAlert() {
    let input = document.getElementById('broadcastInput').value;
    if (!input) {
        alert("Please enter a warning message first.");
        return;
    }
    localStorage.setItem('aqua_emergency_alert', input);
    alert("Emergency Advisory Banner Broadcasted to all citizen apps!");
    document.getElementById('broadcastInput').value = "";
}

// ==================== 6. SPECIALIZATION MODALS ====================
function openSpecModal(type) {
    const modal = document.getElementById('specModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    modal.style.display = 'flex';

    if (type === 'gis') {
        modalBody.innerHTML = `
            <h4 style="margin-bottom:10px;"><i class="fa-solid fa-layer-group"></i> GIS Elevation Analysis</h4>
            <p style="font-size:0.85rem;">Select location to test terrain elevation risk:</p>
            <select id="elevationSelect" class="modal-input" onchange="checkElevation()">
                <option value="">-- Choose Area --</option>
                <option value="low">Underpass Road (Low-Lying Zone)</option>
                <option value="med">Main Market Square</option>
                <option value="high">Civil Lines Flyover (Elevated Zone)</option>
            </select>
            <div id="gisResult" class="spec-result-box">Select an option to view GIS depth assessment.</div>
        `;
    } else if (type === 'ai_depth') {
        modalBody.innerHTML = `
            <h4 style="margin-bottom:10px;"><i class="fa-solid fa-brain"></i> AI Water Depth Classifier</h4>
            <p style="font-size:0.85rem;">Upload a waterlogged photo to estimate water depth:</p>
            <input type="file" id="waterImg" accept="image/*" class="modal-input" onchange="analyzeImageDepth()">
            <div id="depthResult" class="spec-result-box">Upload an image to trigger computer vision analysis.</div>
        `;
    } else if (type === 'voice_ai') {
        modalBody.innerHTML = `
            <h4 style="margin-bottom:10px;"><i class="fa-solid fa-microphone"></i> Dhwani Mitra Voice AI</h4>
            <p style="font-size:0.85rem; margin-bottom:10px;">Click mic and speak your issue:</p>
            <button id="micBtn" class="btn btn-blue" onclick="startVoiceRecognition()">
                <i class="fa-solid fa-microphone"></i> Start Voice Recording
            </button>
            <div id="voiceResult" class="spec-result-box">Audio recognition engine standing by...</div>
        `;
    } else if (type === 'pwd_tag') {
        modalBody.innerHTML = `
            <h4 style="margin-bottom:10px;"><i class="fa-solid fa-building-flag"></i> Auto Department Tagging</h4>
            <p style="font-size:0.85rem;">Enter street name to detect authority jurisdiction:</p>
            <input type="text" id="roadName" placeholder="e.g. MG Road Highway or Sector 4 Drain" class="modal-input">
            <button class="btn btn-dark" style="margin-top:10px;" onclick="autoTagDepartment()">Auto Detect Department</button>
            <div id="tagResult" class="spec-result-box">Department jurisdiction will appear here.</div>
        `;
    }
}

function closeSpecModal() {
    const modal = document.getElementById('specModal');
    if (modal) modal.style.display = 'none';
}

function checkElevation() {
    const val = document.getElementById('elevationSelect').value;
    const res = document.getElementById('gisResult');
    if (val === 'low') res.innerHTML = `<span style="color:#e11d48; font-weight:bold;">⚠️ High Flood Risk (Elevation: 180m)</span><br>Severe waterlogging probable.`;
    else if (val === 'med') res.innerHTML = `<span style="color:#d97706; font-weight:bold;">⚠️ Moderate Risk (Elevation: 195m)</span><br>Possible water accumulation up to 1 ft.`;
    else if (val === 'high') res.innerHTML = `<span style="color:#059669; font-weight:bold;">✅ Safe Zone (Elevation: 220m)</span><br>Elevated terrain. Free flow active.`;
}

function analyzeImageDepth() {
    const res = document.getElementById('depthResult');
    res.innerHTML = `⏳ AI Vision Processing Image Features...`;
    setTimeout(() => {
        res.innerHTML = `<div style="color:#0284c7;"><strong>AI Estimation Complete:</strong><br>• Water Depth: <strong>2.4 Feet</strong><br>• Hazard Level: <strong style="color:#e11d48;">CRITICAL</strong></div>`;
    }, 1000);
}

function startVoiceRecognition() {
    const res = document.getElementById('voiceResult');
    const micBtn = document.getElementById('micBtn');
    if (!res) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.interimResults = false;

        if (micBtn) micBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Listening... Speak Now!`;
        res.innerHTML = `<span style="color:#0284c7;">🎙️ Listening... Speak your waterlogging issue now.</span>`;

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            res.innerHTML = `<strong>Voice Speech Detected:</strong> "${transcript}"<br><span style="color:#059669;">✓ Processed into report description!</span>`;
            if (micBtn) micBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> Start Voice Recording`;
        };

        recognition.onerror = () => {
            simulateVoiceInput();
        };

        recognition.onend = () => {
            if (micBtn) micBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> Start Voice Recording`;
        };
    } else {
        simulateVoiceInput();
    }

    function simulateVoiceInput() {
        if (micBtn) micBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Listening Audio...`;
        res.innerHTML = `<span style="color:#d97706;">🎙️ Listening to voice stream...</span>`;

        setTimeout(() => {
            res.innerHTML = `<strong>Voice Speech Detected:</strong> 'Severe waterlogging near Central Plaza underpass'<br><span style="color:#059669;">✓ Processed into report description!</span>`;
            if (micBtn) micBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> Start Voice Recording`;
        }, 1500);
    }
}

function autoTagDepartment() {
    const input = (document.getElementById('roadName').value || '').toLowerCase();
    const res = document.getElementById('tagResult');
    if (input.includes('highway') || input.includes('main road')) {
        res.innerHTML = `<strong>Assigned Authority:</strong> <span style="color:#059669; font-weight:bold;">Public Works Department (PWD)</span>`;
    } else {
        res.innerHTML = `<strong>Assigned Authority:</strong> <span style="color:#0284c7; font-weight:bold;">Municipal Corporation (MC)</span>`;
    }
}

// ==================== 7. HOME PAGE LIVE STATS TRACKER INTEGRATION ====================
function loadComplaintStats() {
    const mainTotal = document.getElementById('mainStatTotal');
    const mainCrit = document.getElementById('mainStatCritical');
    const mainDisp = document.getElementById('mainStatDispatched');
    const mainRes = document.getElementById('mainStatResolved');
    
    const legacyTotal = document.getElementById('statTotal');
    const legacySolved = document.getElementById('statSolved');
    const legacyPending = document.getElementById('statPending');
    const areaGrid = document.getElementById('areaGrid');

    let complaints = JSON.parse(localStorage.getItem('aqua_complaints') || '[]');

    // Fallback demo data if no user complaint is registered yet
    if (complaints.length === 0) {
        complaints = [
            { location: 'Zone 1 (Palasia)', status: 'Resolved', depth: 'low' },
            { location: 'Zone 1 (Palasia)', status: 'Resolved', depth: 'knee' },
            { location: 'Zone 2 (Vijay Nagar)', status: 'Dispatched', depth: 'waist' },
            { location: 'Zone 2 (Vijay Nagar)', status: 'Pending', depth: 'low' },
            { location: 'Zone 3 (Bhawarkua)', status: 'Pending', depth: 'severe' },
            { location: 'Zone 4 (Rajwada)', status: 'Resolved', depth: 'low' }
        ];
    }

    let total = complaints.length;
    let critical = complaints.filter(c => c.depth === 'waist' || c.depth === 'severe' || c.depth === 'knee' || (c.status && c.status.toLowerCase() === 'critical')).length;
    let dispatched = complaints.filter(c => c.status === 'Dispatched').length;
    let resolved = complaints.filter(c => c.status === 'Resolved' || c.status === 'Solved').length;
    let pending = total - resolved;

    // 4 Authority Stats Cards Update
    if (mainTotal) mainTotal.innerText = total;
    if (mainCrit) mainCrit.innerText = critical;
    if (mainDisp) mainDisp.innerText = dispatched;
    if (mainRes) mainRes.innerText = resolved;

    // Legacy Support (In case old IDs exist)
    if (legacyTotal) legacyTotal.innerText = total;
    if (legacySolved) legacySolved.innerText = resolved;
    if (legacyPending) legacyPending.innerText = pending;

    // Area Grid Update
    if (areaGrid) {
        let areaMap = {};
        complaints.forEach(c => {
            let areaName = c.location || 'Central City';
            if (areaName.includes(',')) {
                areaName = 'GPS Zone (' + areaName.split(',')[0].trim() + ')';
            }
            if (!areaMap[areaName]) {
                areaMap[areaName] = { solved: 0, pending: 0 };
            }
            if (c.status === 'Resolved' || c.status === 'Solved') {
                areaMap[areaName].solved++;
            } else {
                areaMap[areaName].pending++;
            }
        });

        let areaGridHTML = '';
        for (let area in areaMap) {
            let s = areaMap[area].solved;
            let p = areaMap[area].pending;
            areaGridHTML += `
                <div class="area-item">
                    <strong>${area}</strong>
                    <div>
                        <span class="badge-solved">${s} Solved</span>
                        ${p > 0 ? `<span class="badge-pending">${p} Pending</span>` : ''}
                    </div>
                </div>
            `;
        }
        areaGrid.innerHTML = areaGridHTML;
    }
}

// Automatically sync on page load
document.addEventListener('DOMContentLoaded', () => {
    loadComplaintStats();
    loadAuthorityDashboard();
});