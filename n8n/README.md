# 🚨 Automated Disaster Alert Scraping & Intelligence System

An AI-powered **n8n workflow** that continuously scrapes official weather sources, detects critical disaster alerts, and stores structured intelligence in Supabase for real-time applications.

---

# ⚙️ Workflow Overview

This workflow runs automatically every **15 minutes** and performs:

```plaintext
Scrape → Analyze → Detect → Filter → Store
```

---

# 🔁 Workflow Steps

## ⏰ 1. Scheduled Trigger

* Runs every **15 minutes**
* Ensures near real-time monitoring

---

## 🌐 2. Web Scraping

* Source: IMD Weather Website
* Node: `HTTP Request`
* Fetches raw HTML / markdown content

---

## 🧠 3. AI Analysis (Gemini)

* Uses **Google Gemini model**
* Extracts:

  * Disaster type
  * Severity
  * Location (lat/lng)
  * Radius of impact
  * Safety steps

---

## 📦 4. Structured Output Parsing

* Converts AI output into strict JSON format
* Ensures consistency for database insertion

---

## ⚠️ 5. Critical Alert Detection

* Filters only:

  * Red Alerts
  * Cyclones
  * Floods
  * Severe Warnings

---

## 🔁 6. Duplicate Check

* Queries Supabase `alerts` table
* Prevents duplicate entries based on:

  * Latitude
  * Longitude
  * Status

---

## 🆕 7. New Alert Validation

* Ensures only **new alerts** are processed

---

## 🗄️ 8. Store in Supabase

* Inserts structured alert data:

  * title
  * severity
  * summary
  * latitude / longitude
  * radius_km
  * safety_steps

---

# 🧠 AI Prompt Intelligence

The system uses a **strict disaster extraction prompt** that:

```plaintext
✔ Detects critical threats only
✔ Generates actionable safety steps
✔ Estimates geo-coordinates
✔ Avoids hallucination
✔ Outputs strict JSON
```

---

# 📊 Data Output Format

```json
{
  "found": true,
  "title": "Cyclone Alert",
  "severity": "Critical",
  "summary": "Severe cyclone expected in coastal region.",
  "latitude": 20.94,
  "longitude": 86.45,
  "radius_km": 50,
  "safety_steps": [
    "Stay indoors",
    "Avoid coastal travel",
    "Stock essentials"
  ]
}
```

---

# 🗃️ Supabase Integration

* Table: `alerts`
* Used for:

  * Mobile app alerts
  * AI chatbot context
  * Real-time disaster system

---

# 🚀 Use Cases

```plaintext
✔ Disaster alert mobile apps
✔ Government monitoring dashboards
✔ Emergency response systems
✔ AI-powered safety assistants
```

---

# 🔐 Requirements

```plaintext
✔ n8n instance
✔ Supabase project
✔ Google Gemini API key
✔ Internet access for scraping
```

---

# ⚠️ Important Notes

```plaintext
✔ Ensure API keys are secured
✔ Adjust scraping frequency based on rate limits
✔ Validate AI output before production use
✔ Monitor Supabase query limits
```

---

# 🔮 Future Improvements

```plaintext
🔥 Multi-source scraping (news, Twitter, APIs)
🔥 Real-time push notifications
🔥 Geo-fencing alerts
🔥 Map-based visualization
🔥 Severity prediction model
```

---

# 📁 Workflow File

The workflow JSON is included here:


---

# 👨‍💻 Author

Kashyap

---

# ⭐ Support

If you find this useful, consider giving it a ⭐
