# ResShare — Hospitality Resource Exchange

> A smart B2B marketplace that helps hospitality businesses discover, share, and utilize underused resources.

## 🚀 Overview

**ResShare** is a B2B hospitality resource exchange platform designed to connect hotels, restaurants, caterers, venues, and other hospitality businesses.

Hospitality businesses often have underutilized resources such as commercial kitchens, banquet spaces, equipment, cold storage, vehicles, furniture, and event supplies. At the same time, nearby businesses may need these resources temporarily.

ResShare provides a centralized platform where businesses can:

- Discover available hospitality resources
- Search and filter resources
- View detailed resource information
- Submit resource requests
- Track submitted requests
- Connect resource seekers with resource providers

The current prototype validates the core marketplace and request workflow, while advanced capabilities such as AI-powered matching, analytics, payments, and mobile applications are planned for future development.

---

## 🎯 Problem Statement

Hospitality businesses frequently deal with:

- Underutilized resources and idle capacity
- Difficulty finding nearby resources quickly
- Dependence on informal WhatsApp groups and phone calls
- Limited visibility into availability and pricing
- Intermediaries and additional costs
- Fragmented resource-sharing processes

There is a need for a dedicated B2B platform that makes hospitality resource sharing faster, more transparent, and more efficient.

---

## 💡 Proposed Solution

ResShare creates a dedicated B2B marketplace for hospitality resource sharing.

### Core Solution

**Resource Discovery**

Businesses can search and filter available kitchens, venues, equipment, cold storage, and event resources.

**Direct Resource Requests**

Users can view resource details and submit requests with their business information, requested date, time, and requirements.

**Centralized Request Management**

Submitted requests are stored and can be viewed through the **My Requests** section.

### Future Intelligence Layer

The planned production version will introduce **AI-powered smart matching** to rank resources based on factors such as:

- Location
- Availability
- Price
- Capacity
- Urgency
- Business requirements

---

## ✨ Key Features

### Current Prototype

- B2B hospitality resource marketplace
- Resource listings
- Search functionality
- Category filtering
- Resource detail modal
- Resource request form
- Client-side form validation
- REST API integration
- MongoDB data persistence
- My Requests section
- Responsive web interface
- Accessible modal interactions
- Loading and error states

### Planned Features

- AI-powered resource matching
- Intelligent recommendations
- Real-time availability
- Urgency-based / last-minute discovery
- Request, accept, and negotiation workflow
- Resource bundling
- Smart notifications
- Reviews and ratings
- Resource utilization analytics
- Mobile application
- Online payments
- Location intelligence

---

## 🔄 Core Workflow

```text
Browse Resources
       ↓
Search / Filter
       ↓
View Resource Details
       ↓
Request Resource
       ↓
Fill Request Form
       ↓
Submit Request
       ↓
Backend API
       ↓
MongoDB
       ↓
My Requests
````

The current prototype focuses on validating this core workflow.

---

## 🏗️ System Architecture

```text
                 ┌──────────────────────┐
                 │        Users         │
                 │ Provider / Seeker    │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │    React Frontend    │
                 │   Web Application    │
                 └──────────┬───────────┘
                            │
                       REST API
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Node.js + Express  │
                 │     Backend API      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │     MongoDB Atlas    │
                 │    Data Persistence  │
                 └──────────────────────┘
```

### Planned Architecture Expansion

```text
React / Mobile App
        ↓
Node.js + Express API
        ↓
AI Matching Engine
        ↓
Database + Redis
        ↓
Maps / Payments / Notifications
        ↓
Cloud Infrastructure
```

---

## 🛠️ Tech Stack

### Current Prototype

| Layer             | Technology    |
| ----------------- | ------------- |
| Frontend          | React.js      |
| Styling           | CSS           |
| Backend           | Node.js       |
| API               | Express.js    |
| Database          | MongoDB Atlas |
| ODM               | Mongoose      |
| API Communication | REST          |
| Version Control   | Git + GitHub  |

### Planned Production Stack

| Capability        | Planned Technology              |
| ----------------- | ------------------------------- |
| AI Matching       | Python + FastAPI + Scikit-learn |
| Mobile App        | Flutter                         |
| Location Services | Google Maps API                 |
| Caching           | Redis                           |
| Payments          | Razorpay                        |
| Authentication    | JWT + Role-Based Access         |
| Deployment        | AWS / Vercel / Render           |
| DevOps            | Docker + GitHub Actions         |

---

## 📁 Project Structure

```text
HospitalityResourceMarketplace/
│
├── src/
│   ├── components/
│   │   ├── BookingRequestModal.jsx
│   │   ├── ConfirmationModal.jsx
│   │   ├── FilterBar.jsx
│   │   ├── ResourceCard.jsx
│   │   ├── ResourceDetailModal.jsx
│   │   └── ResourceGrid.jsx
│   │
│   ├── data/
│   │   └── resources.js
│   │
│   ├── App.jsx
│   └── index.css
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── Request.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── public/
├── package.json
├── .gitignore
└── README.md
```

> `server/.env` contains environment-specific secrets and is intentionally excluded from Git.

---

## ⚙️ Running the Project Locally

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* MongoDB Atlas account

### 1. Clone the repository

```bash
git clone https://github.com/Shubham4735K/HospitalityResourceMarketplace.git
cd HospitalityResourceMarketplace
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

### 4. Configure environment variables

Create:

```text
server/.env
```

Add your MongoDB connection string:

```env
MONGO_URI=your_mongodb_connection_string
```

Do not commit the `.env` file.

### 5. Start the backend

From the `server` directory:

```
node -r dotenv/config server.js
```

The backend runs on:

```
http://localhost:5000
```

### 6. Start the frontend

Open another terminal from the project root:

```
npm run dev
```

The frontend will normally be available at:

```
http://localhost:5173
```

---

## 🔌 API Endpoints

### Get Resources

```
GET /api/resources
```

Returns the available hospitality resources.

### Get Requests

```
GET /api/requests
```

Returns submitted resource requests.

### Create Request

```
POST /api/requests
```

Creates and stores a new resource request in MongoDB.

---

## 🧪 Prototype Status

### ✅ Implemented

* Resource marketplace UI
* Search and filtering
* Resource details
* Request workflow
* Request validation
* REST backend
* MongoDB persistence
* My Requests
* Responsive design
* Modal accessibility and interactions

### 🔮 Planned

* AI smart matching
* Recommendation engine
* Authentication and role-based access
* Real-time availability
* Negotiation workflow
* Payments
* Notifications
* Reviews and ratings
* Analytics
* Mobile application
* Production deployment

---

## 🌱 Innovation

ResShare goes beyond a traditional marketplace by focusing specifically on **hospitality resource sharing**.

### Key Differentiators

* **AI Smart Matching** — recommends suitable resources based on multiple business requirements.
* **Cross-Business Resource Sharing** — enables businesses to monetize idle resources.
* **Urgency-Based Discovery** — supports last-minute resource requirements.
* **Hospitality-Specific Marketplace** — designed around real hospitality resource types and workflows.
* **Resource Utilization Analytics** — provides insights into resource usage and potential optimization.

---

## 🏆 Hackathon Prototype

This project was developed as a working prototype for **HackCelestial 3.0**.

The prototype demonstrates the core concept:

> **Discover → View → Request → Store → Track**

The architecture is designed to be extended into a complete intelligent B2B hospitality resource exchange platform.

---

## 👥 Team

**Team VITality**

HackCelestial 3.0
Mahatma Education Society's Pillai University

---

## 📌 Future Vision

ResShare aims to create a connected hospitality ecosystem where unused resources do not remain idle.

Instead, businesses can:

**Share resources → Reduce waste → Lower operational costs → Generate additional revenue → Collaborate efficiently**

---

## 📄 License

This project is currently developed as a hackathon prototype.

