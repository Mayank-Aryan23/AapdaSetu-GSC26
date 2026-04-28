// Database Configuration
const SUPABASE_URL = 'https://cphqdgqtrosaxosdwdrz.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaHFkZ3F0cm9zYXhvc2R3ZHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MjU4NDQsImV4cCI6MjA3OTMwMTg0NH0.CGhmghdxQaPpD6uxDjaoAmnhZZsOKiiwacNw-ZrpDQc';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    startLiveFeed(); // Start the background animations
    
    // Attach listener to the form
    const authForm = document.getElementById('adminAuthForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAdminLogin);
    }
});

// Session Check
async function checkSession() {
    const isAdmin = sessionStorage.getItem('admin_logged_in');
    if (isAdmin === 'true') {
        console.log("Admin session active. Redirecting...");
        window.location.href = 'admin.html';
    }
}

// Admin Authentication Logic
async function handleAdminLogin(e) {
    e.preventDefault(); 

    const emailInput = document.getElementById('adminEmail');
    const passInput = document.getElementById('adminPass');
    const loginBtn = document.getElementById('adminAccessBtn'); 

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
        alert("Please enter Government ID and Password.");
        return;
    }

    // UI Feedback
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> AUTHENTICATING...';
    loginBtn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('admin_directory')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single(); 

        if (error || !data) {
            console.warn("Login Failed:", error);
            alert("❌ Access Denied: Invalid Government Credentials.");
            
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            passInput.value = ''; 
        } else {
            console.log("Admin Verified:", data.name);
            
            sessionStorage.setItem('admin_logged_in', 'true');
            sessionStorage.setItem('admin_name', data.name);
            
            window.location.href = 'admin/index.html'; 
        }
    } catch (err) {
        console.error("Unexpected Error:", err);
        alert("System Error. Please contact technical support.");
        
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// --- LIVE COMMAND VISUALIZATION ANIMATIONS ---
const logMessages = [
    "CITIZEN_RPT: Anomalous wind speeds detected (Sec-4).",
    "SYS_CHK: Verifying IMD satellite downlink...",
    "ALERT: Water level rising at river gauge Alpha.",
    "CITIZEN_RPT: Power grid failure reported in Zone 2.",
    "AI_CORE: Analyzing probability of impact...",
    "SYS_CHK: Neural model recalibrating parameters.",
    "LOG: NDRF Unit 7 standing by."
];

function spawnLiveLog() {
    const container = document.getElementById('liveFeedContainer');
    if (!container) return;

    const logNode = document.createElement('div');
    logNode.className = 'floating-log';
    
    const randomMsg = logMessages[Math.floor(Math.random() * logMessages.length)];
    const randomX = Math.floor(Math.random() * 70) + 10; 
    
    logNode.innerText = `[${new Date().toLocaleTimeString('en-US', {hour12: false})}] ${randomMsg}`;
    logNode.style.left = `${randomX}%`;

    container.appendChild(logNode);

    setTimeout(() => {
        if (container.contains(logNode)) {
            container.removeChild(logNode);
        }
    }, 8000);
}

function startLiveFeed() {
    (function loop() {
        const randTime = Math.round(Math.random() * 2000) + 1500;
        setTimeout(function() {
            spawnLiveLog();
            loop();  
        }, randTime);
    }());
}