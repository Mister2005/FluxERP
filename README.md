<div align="center">

# ⚡ FluxERP

### AI-First Product Lifecycle Management for Modern Manufacturing

[![Version](https://img.shields.io/badge/version-2.0.0-8D6E63?style=for-the-badge)](https://github.com/Mister2005/FluxERP/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

**Unify product data, engineering changes, manufacturing, and supplier quality — powered by multi-provider AI intelligence.**

[Live Demo](#live-demo) · [Getting Started](#getting-started) · [API Docs](#api-reference) · [Deploy](#deployment)

</div>

---

## Overview

FluxERP is an enterprise-grade **Product Lifecycle Management (PLM)** system with lightweight ERP capabilities, purpose-built for small and medium manufacturers who require structured product lifecycle control without the complexity and cost of SAP or Oracle.

It consolidates product catalogs, Bills of Materials, Engineering Change Orders, work order tracking, and supplier quality management into a single, cohesive platform — augmented by a **multi-provider AI engine** (Gemini → Groq → Ollama) that delivers intelligent risk scoring, demand forecasting, and natural-language insights with automatic failover.

### Why FluxERP?

- **Low Barrier to Entry** — No license fees, no consulting overhead. Deploy in minutes.
- **AI-Native** — AI is not bolted on; it's woven into every decision surface.
- **Security-Hardened** — Helmet, input sanitization, prompt injection protection, RBAC with granular permissions.
- **Cloud-Ready** — First-class support for Vercel, Render, Neon, and Upstash deployment out of the box.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Modules](#modules)
- [Security](#security)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

| Area | Capabilities |
|:-----|:-------------|
| **Product Management** | Centralized catalog, SKU tracking, revision history, category management, lifecycle status, CSV bulk import/export |
| **Bill of Materials** | Multi-level BOM structures, interactive canvas visualization (React Flow), component costing, revision control |
| **Engineering Change Orders** | Configurable approval workflows (Submit → Review → Approve → Apply), impact analysis, full audit trail |
| **Work Orders** | Kanban board with drag-and-drop, status transitions, priority tracking, production scheduling |
| **Supplier Quality** | Supplier scorecards, defect tracking by severity, on-time delivery metrics, quality ratings |
| **AI Intelligence** | Multi-provider engine (Gemini / Groq / Ollama) with circuit-breaker failover, risk scoring, demand forecasting, NLP assistant |
| **Reports & Analytics** | Executive dashboards, ECO summaries, production metrics, supplier quality reports with interactive charts |
| **Access Control** | Role-based permissions (RBAC), granular module-level access, IAM role management UI |
| **Security** | Helmet headers, rate limiting, input sanitization, prompt injection protection, bcrypt hashing, Zod validation |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Frontend · Next.js 16 (App Router)              │
│         React 19 · Tailwind CSS · Recharts · React Flow             │
│      Turbopack · Vercel Analytics · Speed Insights · Skeletons      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ REST API (HTTPS / JSON)
┌───────────────────────────────▼──────────────────────────────────────┐
│                   Backend · Express 4 + TypeScript 5                  │
│                                                                       │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Auth &    │  │  Business  │  │ Validators│  │   AI Service    │  │
│  │ Middleware │  │  Services  │  │   (Zod)   │  │ Gemini → Groq  │  │
│  │ (JWT)     │  │            │  │           │  │  → Ollama       │  │
│  └───────────┘  └────────────┘  └───────────┘  └─────────────────┘  │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ Helmet &  │  │  BullMQ    │  │ CSV       │  │   Email         │  │
│  │ Rate Limit│  │  Workers   │  │ Import    │  │   (Nodemailer)  │  │
│  └───────────┘  └────────────┘  └───────────┘  └─────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Sanitization · Prompt Injection Guard · Error Masking        │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ Prisma ORM
┌───────────────────────────────▼──────────────────────────────────────┐
│                       PostgreSQL (Neon-compatible)                     │
│       Products · BOMs · ECOs · Work Orders · Suppliers · Defects     │
│       Users · Roles · Permissions · Audit Logs · Settings            │
└──────────────────────────────────────────────────────────────────────┘
          ┌──────────────────────┐
          │  Redis (Upstash)     │
          │  BullMQ Queues       │
          │  Rate Limit Store    │
          └──────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| [Next.js](https://nextjs.org/) | 16.1 | React framework — App Router, Turbopack, standalone output |
| [React](https://react.dev/) | 19.2 | UI component library with concurrent features |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Static type safety across the entire codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first CSS framework |
| [Recharts](https://recharts.org/) | 3.7 | Composable charting library for dashboards |
| [React Flow](https://reactflow.dev/) | 12.10 | Interactive BOM canvas visualization |
| [Lucide React](https://lucide.dev/) | 0.563 | Modern icon library |
| [Vercel Analytics](https://vercel.com/analytics) | 1.6 | Real user performance monitoring |
| [Vercel Speed Insights](https://vercel.com/docs/speed-insights) | 1.3 | Core Web Vitals tracking |

### Backend

| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| [Express](https://expressjs.com/) | 4.21 | HTTP server, routing, and middleware |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety |
| [Prisma](https://www.prisma.io/) | 6.19 | ORM, migrations, and type-safe database queries |
| [PostgreSQL](https://www.postgresql.org/) | 16+ | Relational database (Neon serverless supported) |
| [Helmet](https://helmetjs.github.io/) | 8.0 | HTTP security headers (CSP, HSTS, etc.) |
| [JSON Web Tokens](https://jwt.io/) | 9.0 | Stateless authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.4 | Password hashing (12 salt rounds) |
| [Zod](https://zod.dev/) | 3.24 | Runtime request validation |
| [BullMQ](https://docs.bullmq.io/) | 5.67 | Background job processing (Redis-backed) |
| [Pino](https://getpino.io/) | 9.5 | High-performance structured logging |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.5 | API rate limiting |
| [Swagger / OpenAPI](https://swagger.io/) | 6.2 | Interactive API documentation |

### AI Providers (Multi-Provider with Circuit-Breaker Failover)

| Provider | Package | Use Case |
|:---------|:--------|:---------|
| [Google Gemini](https://ai.google.dev/) | `@google/generative-ai` | Primary — risk scoring, forecasting, NLP chat |
| [Groq](https://groq.com/) | `groq-sdk` | Fallback — ultra-fast inference via Llama/Mixtral models |
| [Ollama](https://ollama.ai/) | `ollama` | Tertiary — self-hosted / local / cloud API support |

> The AI service automatically detects provider failures and cascades to the next available provider using a circuit-breaker pattern. No user intervention required.

### Infrastructure & DevOps

| Service | Purpose |
|:--------|:--------|
| [Vercel](https://vercel.com/) | Frontend hosting with edge CDN, preview deployments |
| [Render](https://render.com/) | Backend hosting with auto-deploy from GitHub |
| [Neon](https://neon.tech/) | Serverless PostgreSQL with branching |
| [Upstash](https://upstash.com/) | Serverless Redis for BullMQ queues |
| [Docker](https://www.docker.com/) | Containerized deployment (dev & production compose files) |
| [GitHub Actions](https://github.com/features/actions) | CI/CD pipeline support |

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|:------------|:--------|:------|
| Node.js | ≥ 18.x | 20+ recommended |
| PostgreSQL | ≥ 14 | Or use [Neon](https://neon.tech/) serverless |
| Redis | Optional | Required for BullMQ background jobs |
| Gemini API Key | — | [Get one free](https://aistudio.google.com/app/apikey) |

### 1. Clone the Repository

```bash
git clone https://github.com/Mister2005/FluxERP.git
cd FluxERP
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fluxerp"

# Authentication
JWT_SECRET="your-strong-secret-key-min-32-chars"

# AI Providers (at least one required)
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"          # Optional fallback
OLLAMA_URL="http://localhost:11434"        # Optional fallback
OLLAMA_API_KEY=""                          # Optional for cloud Ollama

# Infrastructure
REDIS_URL="redis://localhost:6379"         # Optional — enables BullMQ
PORT=5001

# CORS
FRONTEND_URL="http://localhost:3000"
```

Initialize the database and start the server:

```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Apply schema to database
npm run db:seed          # Seed demo data (4 roles, 4 users, sample products)
npm run dev              # Start development server with hot reload
```

> Backend available at **http://localhost:5001** · Swagger docs at **http://localhost:5001/api-docs**

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Start the development server:

```bash
npm run dev              # Starts with Turbopack for fast refresh
```

> Frontend available at **http://localhost:3000**

### 4. Demo Credentials

| Role | Email | Password |
|:-----|:------|:---------|
| Administrator | `priya.sharma@adani.com` | `demo123` |
| Engineering | `rajesh.kumar@adani.com` | `demo123` |
| Approver | `amit.patel@adani.com` | `demo123` |
| Operations | `sneha.desai@adani.com` | `demo123` |

---

## Project Structure

```
FluxERP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (20+ models)
│   │   ├── seed.ts                    # Demo data seeding
│   │   └── migrations/               # Versioned database migrations
│   ├── src/
│   │   ├── server.ts                  # Application entry point & routes
│   │   ├── server.new.ts             # Modular server (refactored architecture)
│   │   ├── config/                    # App configuration & Swagger setup
│   │   ├── lib/                       # Core libraries (auth, db, AI, Redis)
│   │   ├── middleware/                # Auth, error handling, rate limiting, validation
│   │   ├── services/                  # Business logic layer (AI, BOM, ECO, etc.)
│   │   ├── validators/               # Zod request validation schemas
│   │   ├── routes/                    # Modular route definitions
│   │   ├── types/                     # TypeScript type definitions & error types
│   │   ├── utils/                     # Helpers, logger, sanitization, shutdown
│   │   └── docs/                      # OpenAPI/Swagger YAML specifications
│   ├── __tests__/                     # Jest test suite
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                           # Next.js App Router pages
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── page.tsx                   # Landing page
│   │   ├── login/ & signup/          # Authentication flows
│   │   ├── dashboard/                 # Analytics dashboard
│   │   ├── products/                  # Product management CRUD
│   │   ├── boms/                      # Bill of Materials with canvas
│   │   ├── ecos/                      # Engineering Change Orders
│   │   ├── work-orders/              # Kanban board
│   │   ├── suppliers/                 # Supplier management
│   │   ├── reports/                   # Reports & analytics
│   │   ├── ai/                        # AI assistant chat
│   │   └── settings/                  # System settings & IAM
│   ├── components/                    # Shared UI & module components
│   ├── lib/                           # API client, permissions utility
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml                 # Development containers
├── docker-compose.prod.yml            # Production containers
├── DOCKER.md                          # Docker deployment guide
├── Project_Details.md                 # Detailed project specification
└── README.md
```

---

## API Reference

The backend exposes **67+ RESTful endpoints** organized by module. Interactive Swagger documentation is available at `/api-docs` when the server is running.

### Endpoint Overview

| Module | Base Path | Key Endpoints |
|:-------|:----------|:--------------|
| **Auth** | `/api/auth` | `POST /login` · `POST /register` · `GET /me` · `GET /roles` |
| **Products** | `/api/products` | Full CRUD + search, filtering, pagination |
| **BOMs** | `/api/boms` | Full CRUD + multi-level structure management |
| **ECOs** | `/api/ecos` | Full CRUD + status transitions (submit, review, approve, reject, apply) |
| **Work Orders** | `/api/workorders` | Full CRUD + Kanban status updates |
| **Suppliers** | `/api/suppliers` | Full CRUD + quality metrics & scorecards |
| **Reports** | `/api/reports` | Dashboard, ECO summary, production, supplier quality |
| **AI** | `/api/ai` | Risk scoring, demand forecast, BOM optimization, chat |
| **Users** | `/api/users` | User management (create, update, deactivate) |
| **Roles** | `/api/roles` | IAM role & permission management |
| **Settings** | `/api/settings` | System configuration, SMTP, permission refresh |
| **CSV** | `/api/csv` | Bulk import/export for products and BOMs |
| **Health** | `/api/health` | Service health check with AI provider status |

---

## Authentication & Authorization

FluxERP implements a comprehensive **Role-Based Access Control (RBAC)** system:

- **JWT Authentication** — Stateless tokens issued on login/register, validated via middleware on every request
- **Password Security** — bcrypt hashing with 12 salt rounds; enforced policy (8+ characters, uppercase, lowercase, digit)
- **Role-Based Access** — Four default roles with configurable permissions
- **Granular Permissions** — Module-level access control (e.g., `products.view`, `ecos.approve`, `settings.iam`)
- **Middleware Enforcement** — `authenticate` and `requirePermission()` guards on every protected route

### Default Roles

| Role | Access Level |
|:-----|:-------------|
| **Administrator** | Full system access across all modules including IAM and settings |
| **Engineering** | Products, BOMs, ECOs, Work Orders (create/edit), Reports (view) |
| **Approver** | ECO review and approval workflow, read-only across other modules |
| **Operations** | Work order management, ECO submission, read-only product data |

---

## Modules

### Product Management
Centralized product catalog with detailed specifications, SKU tracking, revision history, category classification, and lifecycle status management. Supports search, filtering, pagination, and CSV bulk import/export.

### Bill of Materials (BOM)
Multi-level component hierarchies with an **interactive canvas visualization** powered by React Flow. Track quantities, unit costs, and total material costs. Full revision control with AI-powered optimization suggestions.

### Engineering Change Orders (ECO)
Structured change management with configurable approval workflows. Submit changes, perform AI-driven impact analysis, route through review and approval stages, and apply approved changes — all with a complete audit trail.

### Work Order Tracking
Kanban-style production board with drag-and-drop status management. Create and schedule manufacturing work orders, assign priorities, and track progress from planning through completion.

### Supplier Quality Management
Comprehensive supplier scorecards with defect tracking by severity, on-time delivery rate monitoring, lead time analysis, and computed quality ratings. Identify at-risk suppliers and drive continuous improvement.

### AI Assistant
Multi-provider AI engine with **automatic failover** (Gemini → Groq → Ollama). Features include:
- **Risk Scoring** — Automated risk assessment for ECOs and work orders
- **Demand Forecasting** — Production planning recommendations with confidence scores
- **BOM Optimization** — Cost reduction and supplier diversification suggestions
- **NLP Chat** — Natural-language queries about system data and operations
- **Prompt Injection Protection** — Input sanitization prevents LLM manipulation

### Reports & Analytics
Real-time dashboards with interactive Recharts visualizations covering ECO status distribution, production metrics, supplier quality trends, and executive KPIs. Export-ready data for stakeholder reporting.

---

## Security

FluxERP has been security-audited and hardened against common attack vectors:

| Layer | Protection |
|:------|:-----------|
| **HTTP Headers** | Helmet.js — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **Input Validation** | Zod schemas on all endpoints; HTML stripping and input sanitization |
| **Authentication** | bcrypt (12 rounds), JWT with expiry, active-user verification |
| **Password Policy** | Minimum 8 characters with uppercase, lowercase, and digit requirements |
| **Rate Limiting** | express-rate-limit on authentication and AI endpoints |
| **CORS** | Strict origin allowlist with Vercel project slug verification |
| **AI Safety** | Prompt injection sanitization, system prompt boundaries, input truncation |
| **Error Handling** | Production error masking — no stack traces or internal details leaked to clients |
| **Body Limits** | Request body size capped at 5 MB to prevent payload abuse |
| **SMTP Validation** | Hostname regex, port range, and email format validation to prevent SSRF |

---

## Deployment

### Cloud Deployment (Recommended)

FluxERP is designed for zero-cost cloud deployment:

| Service | Provider | Tier |
|:--------|:---------|:-----|
| Frontend | [Vercel](https://vercel.com/) | Free (Hobby) |
| Backend | [Render](https://render.com/) | Free tier |
| Database | [Neon](https://neon.tech/) | Free (0.5 GB) |
| Redis | [Upstash](https://upstash.com/) | Free (10K commands/day) |

**Backend (Render)**
1. Connect your GitHub repository
2. Set build command: `npm install && npx prisma generate && npm run build`
3. Set start command: `npm start`
4. Add environment variables (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`)

**Frontend (Vercel)**
1. Import the repository, set root directory to `frontend/`
2. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`
3. Deploy — Vercel auto-detects Next.js and configures builds

### Docker Deployment

```bash
# Development (with hot reload)
docker-compose up -d

# Production (optimized multi-stage builds)
docker-compose -f docker-compose.prod.yml up -d
```

See [DOCKER.md](DOCKER.md) for detailed container configuration, environment variables, and scaling options.

---

## Scripts Reference

### Backend

| Script | Description |
|:-------|:------------|
| `npm run dev` | Start development server with hot reload (tsx watch) |
| `npm run dev:new` | Start modular server architecture |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run typecheck` | Run TypeScript type checking (no emit) |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |

### Frontend

| Script | Description |
|:-------|:------------|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Create optimized production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "feat: add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request with a clear description of the changes

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Purpose |
|:-------|:--------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `security:` | Security patch |
| `docs:` | Documentation |
| `refactor:` | Code restructuring |
| `test:` | Test additions/fixes |
| `chore:` | Maintenance |

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with precision for manufacturing teams that demand traceability, quality, and speed.**

[Report Bug](https://github.com/Mister2005/FluxERP/issues) · [Request Feature](https://github.com/Mister2005/FluxERP/issues) · [Discussions](https://github.com/Mister2005/FluxERP/discussions)

</div>
