# BookLeaf Author Support & Communication Portal

## Overview

BookLeaf is a full-stack web application for managing author support requests. It provides an author-facing portal and an admin-facing support dashboard.

### Key Features

- Email and password authentication using JWT.
- Role-based access for authors and administrators.
- Author dashboard displaying books, sales, and royalty information.
- Support ticket creation linked to a book or general account query.
- Automatic ticket categorization and priority assignment.
- Admin ticket queue with status management.
- AI-assisted response drafting using the BookLeaf knowledge base.
- Editable replies and conversation history.
- Near-real-time updates using frontend polling.

## Technology Stack

- Frontend: React, Vite, JavaScript, CSS
- Backend: Node.js, Express
- Database: MySQL
- Authentication: JSON Web Tokens and bcrypt
- AI integration: OpenAI API when configured, with a deterministic fallback

## Project Structure

```text
bookleaf-portal/
├── backend/
│   ├── scripts/
│   │   └── seed.js
│   └── src/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── db.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── style.css
├── bookleaf_sample_data.json
├── README.md
├── APPROACH.md
└── .gitignore
```

The exact folder structure may vary as the application evolves.

## Prerequisites

- Node.js and npm
- MySQL Server
- A modern web browser
- An OpenAI API key for optional live AI integration

## Local Setup

### 1. Configure MySQL

Create the database:

```sql
CREATE DATABASE bookleaf_portal;
```

Configure the database connection in the backend environment file.

### 2. Configure the backend

Open a terminal in the `backend` directory:

```bash
npm install
```

Create a `.env` file using the variables expected by the backend. These should include the database connection settings, `JWT_SECRET`, and admin seed credentials. Configure `OPENAI_API_KEY` if using live OpenAI integration.

Never commit real secrets to the repository.

### 3. Initialize and seed the database

Run the available project scripts:

```bash
npm run db:init
npm run seed
```

Place the supplied sample dataset at the location expected by the seed script before running the seed command.

### 4. Start the backend

```bash
npm run dev
```

The local backend runs on port 5000 in the current development setup.

### 5. Start the frontend

Open another terminal in the `frontend` directory:

```bash
npm install
npm run dev
```

Open the local Vite URL displayed in the terminal, normally `http://localhost:5173`.

Configure `VITE_API_URL` if your frontend needs a different backend API URL.

## Main API Endpoints

All endpoints use the `/api` prefix in the current local setup.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate a user |
| GET | `/books` | Retrieve books accessible to the authenticated user |
| GET | `/tickets` | List accessible support tickets |
| POST | `/tickets` | Create an author support ticket |
| GET | `/tickets/:id` | Retrieve a ticket and its conversation |
| POST | `/tickets/:id/draft` | Generate an admin reply draft |
| POST | `/tickets/:id/messages` | Send a ticket message |
| PATCH | `/tickets/:id/status` | Update ticket status |

Authenticated endpoints require a valid bearer token. Admin-only endpoints enforce role permissions.

## AI Approach

New tickets are categorized into the supported BookLeaf categories and assigned a priority. When an OpenAI API key is configured, the application attempts model-assisted classification and response drafting.

If AI is unavailable, deterministic classification and a predefined response fallback keep core ticket operations available.

Draft responses use BookLeaf policy information, including royalty calculations, payout timelines, ISBN handling, printing quality, distribution, and production stages. Administrators should review drafts before sending them.

## Security

- Passwords are stored as hashes.
- Protected API routes require JWT authentication.
- Role-based authorization restricts administrative operations.
- Authors should only access their own books and tickets.
- Environment files and API keys must remain private.

## Testing Checklist

- Author and admin login
- Author-specific books and tickets
- Ticket creation and classification
- Admin status updates
- AI draft generation and editing
- Sending replies and viewing conversation history as an author
- Database persistence after refresh
- Access-control checks

## Known Limitations

Document any features not yet implemented, such as file uploads, advanced date filtering, editable classification and priority, or production monitoring.

The current development setup uses polling for near-real-time updates. A production version could use WebSockets or Server-Sent Events if needed.

## Deployment

Configure the frontend, backend, database, CORS, environment variables, and HTTPS for the production environment. Seed the required sample dataset and verify both author and admin workflows using the deployed URL.

Do not publish development secrets or real credentials in this repository.
