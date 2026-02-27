<p align="center">
  <strong>⚡ FluxERP</strong>
</p>

<p align="center">
  <em>AI-First Product Lifecycle Management for Modern Manufacturing</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-8D6E63?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

FluxERP is an enterprise-grade Product Lifecycle Management (PLM) system with light ERP capabilities. It unifies product data, engineering changes, manufacturing operations, and supplier quality management into a single platform — augmented by Google Gemini AI for intelligent insights and decision support.

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Modules](#modules)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## Key Features

| Area | Capabilities |
|------|-------------|
| **Product Management** | Centralized product catalog, SKU tracking, revision history, category management, lifecycle status |
| **Bill of Materials** | Multi-level BOM structures, interactive canvas visualization, component costing, revision control |
| **Engineering Change Orders** | Configurable approval workflows (Submit → Review → Approve → Apply), impact analysis, audit trail |
| **Work Orders** | Kanban board with drag-and-drop, status transitions, priority tracking, production scheduling |
| **Supplier Quality** | Supplier scorecards, defect tracking, on-time delivery metrics, quality ratings |
| **AI Intelligence** | Risk scoring, demand forecasting, natural-language assistant, data-driven recommendations |
| **Reports & Analytics** | Executive dashboards, ECO summaries, production metrics, supplier quality reports |
| **Access Control** | Role-based permissions (RBAC), granular module-level access, IAM role management |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                    │
│               React 19 · Tailwind CSS · Recharts                │
│                    Turbopack Dev · App Router                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (HTTP/JSON)
┌────────────────────────────▼────────────────────────────────────┐
│                     Backend (Express + TypeScript)               │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Auth &   │  │  Business   │  │ Validators│  │  AI Service  │  │
│  │ Middleware │  │  Services   │  │  (Zod)    │  │ (Gemini API) │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Rate     │  │  Queue &    │  │  CSV      │  │  Email       │  │
│  │ Limiting  │  │  Workers    │  │  Import   │  │  Service     │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────▼────────────────────────────────────┐
│                      PostgreSQL Database                         │
│          Products · BOMs · ECOs · Work Orders · Suppliers        │
│          Users · Roles · Permissions · Audit Logs · Defects     │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| Next.js 16 | React framework with App Router and Turbopack |
| React 19 | UI component library |
| TypeScript 5 | Type safety |
| Tailwind CSS 3 | Utility-first styling |
| Recharts 3 | Interactive charts and data visualization |
| React Flow | BOM canvas visualization |
| Lucide React | Icon library |

### Backend

| Technology | Purpose |
|-----------|---------|
| Express 4 | HTTP server and routing |
| TypeScript 5 | Type safety |
| Prisma 6 | ORM and database migrations |
| PostgreSQL | Relational database |
| JSON Web Tokens | Stateless authentication |
| Zod | Request validation |
| BullMQ | Background job queue (Redis-backed) |
| Pino | Structured logging |
| Helmet | Security headers |
| Swagger/OpenAPI | API documentation |
| Google Gemini AI | AI-powered features |

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14
- **Redis** (optional — for background job queue)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/fluxerp.git
cd fluxerp
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fluxerp"
JWT_SECRET="your-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
REDIS_URL="redis://localhost:6379"      # Optional
PORT=5001
```

Initialize the database and start the server:

```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Apply schema to database
npm run db:seed          # Seed demo data
npm run dev              # Start development server
```

Backend will be available at **http://localhost:5001**

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
npm run dev
```

Frontend will be available at **http://localhost:3000**

### 4. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | priya.sharma@adani.com | demo123 |
| Engineering | rajesh.kumar@adani.com | demo123 |
| Approver | amit.patel@adani.com | demo123 |
| Operations | sneha.desai@adani.com | demo123 |

## Project Structure

```
FluxERP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.ts                # Demo data seeding
│   │   └── migrations/            # Database migrations
│   ├── src/
│   │   ├── server.ts              # Application entry point & routes
│   │   ├── config/                # App configuration & Swagger setup
│   │   ├── lib/                   # Core libraries (auth, db, AI, redis)
│   │   ├── middleware/            # Auth, error handling, rate limiting, validation
│   │   ├── services/              # Business logic layer
│   │   ├── validators/            # Zod request validation schemas
│   │   ├── routes/                # Route definitions (CSV, reports)
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── utils/                 # Helpers, logger, graceful shutdown
│   │   └── docs/                  # OpenAPI/Swagger YAML specs
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # Landing page
│   │   ├── login/                 # Authentication
│   │   ├── signup/                # Registration
│   │   ├── dashboard/             # Analytics dashboard
│   │   ├── products/              # Product management
│   │   ├── boms/                  # Bill of Materials
│   │   ├── ecos/                  # Engineering Change Orders
│   │   ├── work-orders/           # Work order Kanban
│   │   ├── suppliers/             # Supplier management
│   │   ├── reports/               # Reports & analytics
│   │   ├── ai/                    # AI assistant
│   │   └── settings/              # System settings & IAM
│   ├── components/                # Shared UI components
│   ├── lib/                       # API client utilities
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml             # Development containers
├── docker-compose.prod.yml        # Production containers
├── SETUP_GUIDE.md
├── IMPROVEMENT_PLAN.md
└── Project_Details.md
```

## API Reference

The backend exposes **67+ RESTful endpoints** organized by module. Full Swagger documentation is available at `http://localhost:5001/api-docs` when the server is running.

### Endpoint Overview

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/auth` | `POST /login`, `POST /register`, `GET /me`, `GET /roles` |
| Products | `/api/products` | CRUD + search, filtering, pagination |
| BOMs | `/api/boms` | CRUD + multi-level structure management |
| ECOs | `/api/ecos` | CRUD + status transitions (submit, review, approve, reject, apply) |
| Work Orders | `/api/workorders` | CRUD + Kanban status updates |
| Suppliers | `/api/suppliers` | CRUD + quality metrics |
| Reports | `/api/reports` | Dashboard, ECO summary, production, supplier quality |
| AI | `/api/ai` | Risk scoring, demand forecast, recommendations, chat |
| Users | `/api/users` | User management |
| Roles | `/api/roles` | IAM role & permission management |
| Settings | `/api/settings` | System configuration, permission refresh |
| CSV | `/api/csv` | Bulk import/export for products and BOMs |

## Authentication & Authorization

FluxERP implements a comprehensive RBAC system:

- **JWT Authentication** — Stateless tokens issued on login/register, validated via middleware
- **Role-Based Access** — Four default roles: Administrator, Engineering, Approver, Operations
- **Granular Permissions** — Module-level permissions (e.g., `products.view`, `ecos.approve`, `settings.iam`)
- **Middleware Enforcement** — `authenticate` and `requirePermission()` guards on every protected route

### Default Roles

| Role | Access Level |
|------|-------------|
| Administrator | Full system access across all modules including IAM |
| Engineering | Products, BOMs, ECOs, Work Orders (create/edit), Reports (view) |
| Approver | ECO review and approval workflow, read-only across other modules |
| Operations | Work order management, ECO submission, read-only product data |

## Modules

### Product Management
Maintain a centralized product catalog with detailed specifications, SKU tracking, revision history, category classification, and lifecycle status management. Supports search, filtering, and CSV bulk import/export.

### Bill of Materials (BOM)
Define multi-level component hierarchies with an interactive canvas visualization. Track quantities, unit costs, and total material costs. Full revision control with approval workflows.

### Engineering Change Orders (ECO)
Structured change management with configurable approval workflows. Submit changes, perform impact analysis, route through review and approval stages, and apply approved changes — all with complete audit trail.

### Work Order Tracking
Kanban-style production board with drag-and-drop status management. Create and schedule manufacturing work orders, assign priorities, and track progress from planning through completion.

### Supplier Quality Management
Comprehensive supplier scorecards with defect tracking by severity, on-time delivery rate monitoring, lead time analysis, and quality ratings. Identify at-risk suppliers and drive continuous improvement.

### AI Assistant
Powered by Google Gemini 2.5 Flash. Features include automated risk scoring for ECOs and work orders, demand forecasting, natural-language queries about system data, and intelligent recommendations.

### Reports & Analytics
Real-time dashboards with interactive charts covering ECO status distribution, production metrics, supplier quality trends, and executive KPIs. Export-ready data for stakeholder reporting.

## Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

See [DOCKER.md](DOCKER.md) for detailed container configuration.

## Scripts Reference

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage report |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Create production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

<p align="center">
  Built with precision for manufacturing teams that demand traceability, quality, and speed.
</p>
