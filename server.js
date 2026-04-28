// 1. Load environment variables
require('dotenv').config();

const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); 
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Initialize Supabase & Gemini
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================================
// GLOBAL HELPER FUNCTION (Must be up here so ALL routes can see it!)
// ============================================================================
const fetchSafely = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 900000); // 90-second timeout

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.status === 502) {
            console.warn(`⚠️ API (502) - Server Overloaded: ${url}`);
            return null;
        }

        return response.ok ? await response.json() : null;
    } catch (e) {
        if (e.name === 'AbortError') {
            console.error(`🚨 Timeout: API took too long (>90s) for ${url}`);
        } else {
            console.error(`🚨 Fetch failed for ${url} | Reason: ${e.message}`);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
};
// ============================================================================

// --- SECURE CONFIG ROUTE ---
app.get('/api/config', (req, res) => {
    res.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        googleMapsKey: process.env.GOOGLE_MAPS_KEY
    });
});

// --- HEALTH CHECK ---
app.get('/api/status', (req, res) => {
    res.status(200).json({ status: "Online", message: "AapdaSetu Backend is running." });
});

// --- AI DISPATCH ROUTE ---
app.post('/api/ai-dispatch', async (req, res) => {
    try {
        const { system, user } = req.body; 
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            generationConfig: { responseMimeType: "text/plain" } 
        });

        const fullPrompt = `${system}\n\n${user}`;
        const result = await model.generateContent(fullPrompt);
        const aiText = result.response.text().trim();

        res.status(200).json({ decision: aiText });
    } catch (error) {
        console.error("🚨 REAL ERROR CAUSE:", error);
        res.status(500).json({ error: "Failed to dispatch via AI Core." });
    }
});

// --- MANUAL AI MESH SYNC ROUTE ---
app.post('/api/mesh/update-predictions', async (req, res) => {
    const startTime = Date.now();
    try {
        const { nodes } = req.body; 
        if (!nodes || nodes.length === 0) return res.status(400).json({ error: "No nodes provided." });

        const nodePromises = nodes.map(async (node) => {
            const { latitude: lat, longitude: lon } = node;

            const [heatRes, cycRes, floodRes] = await Promise.all([
                fetchSafely(`${process.env.RENDER_HEATWAVE_URL}/predict?lat=${lat}&lon=${lon}`),
                fetchSafely(`${process.env.RENDER_CYCLONE_URL}/predict?lat=${lat}&lon=${lon}`),
                fetchSafely(`${process.env.RENDER_FLOOD_URL}/predict?lat=${lat}&lon=${lon}`)
            ]);

            const telemetry = {
                timestamp: new Date().toISOString(),
                heatwave: heatRes ? heatRes.result : null,
                cyclone: cycRes ? cycRes.result : null,
                flood: floodRes ? floodRes.result : null
            };

            const heatProb = telemetry.heatwave ? Math.round(telemetry.heatwave.probability_heat * 100) : node.heatwave_prob;
            const cycProb = telemetry.cyclone ? Math.round(telemetry.cyclone.probability_cyclone * 100) : node.landslide_prob;
            const floodProb = telemetry.flood ? Math.round(telemetry.flood.probability_flood * 100) : node.flood_prob;

            return {
                id: node.id,
                heatwave_prob: heatProb,
                landslide_prob: cycProb,
                flood_prob: floodProb,
                ai_telemetry: telemetry, 
                last_updated: new Date().toISOString()
            };
        });

        const bulkUpdateData = await Promise.all(nodePromises);
        
        const { error } = await supabase.from('ai_mesh_nodes').upsert(bulkUpdateData);
        if (error) throw error;

        console.log(`✅ Multi-Model Sync Complete in ${Date.now() - startTime}ms`);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("🚨 Mesh Sync Error:", error);
        res.status(500).json({ error: "Failed to sync Multi-Model AI" });
    }
});

// --- AUTOMATED CRON SYNC (Every 30 Mins) ---
cron.schedule('*/30 * * * *', async () => {
    console.log("\n⏳ CRON INITIATED: Running 30-Minute Automated Mesh Sync...");
    
    try {
        const { data: nodes, error: dbError } = await supabase.from('ai_mesh_nodes').select('*');
        if (dbError || !nodes || nodes.length === 0) return console.log("No nodes found.");

        const nodePromises = nodes.map(async (node) => {
            const { latitude: lat, longitude: lon } = node;

            const [heatRes, cycRes, floodRes] = await Promise.all([
                fetchSafely(`${process.env.RENDER_HEATWAVE_URL}/predict?lat=${lat}&lon=${lon}`),
                fetchSafely(`${process.env.RENDER_CYCLONE_URL}/predict?lat=${lat}&lon=${lon}`),
                fetchSafely(`${process.env.RENDER_FLOOD_URL}/predict?lat=${lat}&lon=${lon}`)
            ]);

            const telemetry = {
                timestamp: new Date().toISOString(),
                heatwave: heatRes ? heatRes.result : null,
                cyclone: cycRes ? cycRes.result : null,
                flood: floodRes ? floodRes.result : null
            };

            return {
                id: node.id,
                heatwave_prob: telemetry.heatwave ? Math.round(telemetry.heatwave.probability_heat * 100) : node.heatwave_prob,
                landslide_prob: telemetry.cyclone ? Math.round(telemetry.cyclone.probability_cyclone * 100) : node.landslide_prob,
                flood_prob: telemetry.flood ? Math.round(telemetry.flood.probability_flood * 100) : node.flood_prob,
                ai_telemetry: telemetry,
                last_updated: new Date().toISOString()
            };
        });

        const bulkUpdateData = await Promise.all(nodePromises);
        const { error: upsertError } = await supabase.from('ai_mesh_nodes').upsert(bulkUpdateData);

        if (upsertError) throw upsertError;
        console.log("✅ CRON SUCCESS: Background mesh synchronization complete.");

    } catch (error) {
        console.error("🚨 CRON FAILED:", error);
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Secure Server running on http://localhost:${PORT}`);
});