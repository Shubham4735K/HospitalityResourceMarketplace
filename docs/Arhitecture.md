# ResShare — Architecture

## 1. Architecture Overview

ResShare follows a client-server architecture:

```text
React Frontend
      ↓
REST API
      ↓
Node.js + Express
      ↓
Mongoose
      ↓
MongoDB Atlas


The frontend is responsible for the user interface and user interactions.

The Express backend provides REST API endpoints.

MongoDB Atlas provides persistent data storage.

Mongoose provides the schema and data-access layer between Node.js and MongoDB.

## 2. Current Technology Stack
Frontend
React.js
Vite
JavaScript
CSS
HTML
Backend
Node.js
Express.js
REST API
Database
MongoDB Atlas
Mongoose
Development
Git
GitHub
npm

## 3. Current Project Structure
HospitalityResourceMarketplace/
│
├── docs/
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Rules.md
│   ├── Phases.md
│   ├── Design.md
│   ├── API.md
│   └── Memory.md
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
│   ├── index.css
│   └── main.jsx
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── Request.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── GEMINI.md
├── package.json
└── .gitignore


## 4. Frontend Architecture

The React application contains:

App.jsx

Acts as the main application coordinator.

Responsibilities include:

Managing major application state
Fetching resources
Managing marketplace/request views
Managing selected resources
Managing request and confirmation modals
Connecting frontend components to backend APIs
Components

Reusable UI components should remain focused on a single responsibility.

Examples:

ResourceCard.jsx — displays one resource
ResourceGrid.jsx — displays the resource collection
FilterBar.jsx — search and filtering
ResourceDetailModal.jsx — resource details
BookingRequestModal.jsx — request form
ConfirmationModal.jsx — successful request confirmation

## 5. Backend Architecture

server/server.js is currently responsible for:

Creating the Express application
Configuring middleware
Enabling CORS
Connecting to MongoDB
Defining REST API routes
Handling API responses

Database connection logic is kept separately in:

server/config/db.js

MongoDB request schema is defined in:

server/models/Request.js

## 6. Database Architecture

MongoDB stores application data as documents.

The current Request document contains fields such as:

resourceId
resourceTitle
fullName
businessName
email
phone
requestedDate
startTime
endTime
message
status

The schema should evolve incrementally as new requirements are implemented.

## 7. Data Flow
Resource Discovery
User
 ↓
React Frontend
 ↓
GET /api/resources
 ↓
Express
 ↓
Resource Data
 ↓
React Resource Grid
Request Submission
User
 ↓
Booking Request Form
 ↓
POST /api/requests
 ↓
Express
 ↓
Mongoose
 ↓
MongoDB Atlas
 ↓
Created Request
 ↓
Confirmation UI
Request Tracking
My Requests
 ↓
GET /api/requests
 ↓
Express
 ↓
MongoDB Atlas
 ↓
Request Documents
 ↓
React UI
Future Request Status Update
Provider
 ↓
Accept / Reject
 ↓
PATCH /api/requests/:id
 ↓
Express
 ↓
MongoDB
 ↓
Updated Status
 ↓
Seeker sees new status

## 8. Architectural Principles
Keep frontend and backend responsibilities separated.
Keep reusable components focused.
Keep database access on the backend.
Frontend communicates with the backend through REST APIs.
Do not directly access MongoDB from React.
Keep environment secrets on the backend.
Prefer incremental changes over large rewrites.
Preserve existing working architecture unless a deliberate architectural change is approved.

## 9. Future Architecture

The architecture may later expand to support:

Authentication and authorization
Provider and seeker roles
Intelligent matching
Notifications
Negotiation
Booking calendars
Payments
Analytics
Mobile applications

Future architecture should be introduced through dedicated development phases rather than prematurely added to the current implementation.


---
