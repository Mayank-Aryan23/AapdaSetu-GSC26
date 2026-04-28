# 🚨 AI-Powered Disaster Management System

A full-stack, real-time disaster response ecosystem that combines **mobile reporting, AI intelligence, automated alert scraping, and an admin control platform** to improve emergency response and public safety.

---

# 🌐 Project Overview

This system is designed to bridge the gap between **citizens, authorities, and real-time disaster intelligence**.

```plaintext
Citizen App → Supabase → AI + n8n → Admin Platform → Response System
```

### 🎯 Goal

```plaintext
✔ Detect disasters early
✔ Provide real-time alerts
✔ Enable faster emergency response
✔ Use AI for decision support
```

---

# 🧩 System Components

---

## 📱 Citizen Mobile App

* Report incidents (fire, medical, flood, etc.)
* Upload images & audio
* Receive alerts
* AI chatbot for safety guidance
* Offline sync support

---

## 🤖 AI Disaster Assistant

* Built using Gemini API
* Context-aware responses using:

  * User location
  * Nearby alerts
  * Conversation history

---

## 🔁 Automated Alert System (n8n)

* Scrapes official sources (IMD)
* Runs every 15 minutes
* Uses AI to:

  * Detect critical threats
  * Extract structured alert data
* Stores alerts in Supabase

---

## 🛠️ Admin Web Platform (Control Center)

A centralized dashboard for authorities to monitor and manage disaster response.

---

### 📊 Dashboard

```plaintext
✔ Active alerts overview
✔ User reports summary
✔ System status
✔ Quick action panels
```

---

### 🚨 Alert Monitoring

```plaintext
✔ View AI-generated + user alerts
✔ Filter by severity/location
✔ Detailed alert insights
```

---

### 🚑 Resource Allocation

```plaintext
✔ Assign rescue teams
✔ Deploy emergency units
✔ Track response progress
```

---

### 🧠 AI Mesh Network

```plaintext
✔ Connect citizens & middlemen
✔ Smart data routing
✔ AI-assisted coordination
```

---

### 📈 Analytics

```plaintext
✔ Disaster trends
✔ Region-wise impact
✔ Resource efficiency
✔ AI insights
```

---

# 🏗️ System Architecture

```plaintext
n8n (Scraping + AI)
        ↓
Supabase (Database + Auth)
        ↓
Admin Platform
        ↓
Mobile App + AI Chatbot
```

---

# 🛠️ Tech Stack

```plaintext
Frontend: Flutter (Mobile) / Web (Admin)
Backend: Supabase
AI: Google Gemini
Automation: n8n
Local Storage: Hive
Location: Geolocator
```

---

# 🔐 Security & Access

```plaintext
✔ Supabase Authentication
✔ Role-based access (Admin / Citizen)
✔ Secure API handling
```

---

# 🚀 Key Highlights

```plaintext
✔ Real-time disaster detection
✔ AI-powered alert analysis
✔ Offline-first mobile app
✔ Automated alert scraping system
✔ Scalable backend with Supabase
```

---

# ⚙️ Setup Instructions

## Mobile App

```bash
flutter pub get
flutter run
```

## Admin Platform

```bash
npm install
npm run dev
```

---

# 🔐 Environment Variables

```plaintext
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
GEMINI_API_KEY=your_key
```

---

# ⚠️ Important Notes

```plaintext
✔ Do not expose API keys publicly
✔ Configure Supabase RLS properly
✔ Monitor API rate limits
```

---

# ⭐ Support

If you find this project useful, give it a ⭐ on GitHub
