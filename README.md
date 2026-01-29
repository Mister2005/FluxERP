# FluxERP - AI-First PLM + Light ERP System

An intelligent Product Lifecycle Management (PLM) system with light ERP features, powered by Google Gemini 2.5 Flash AI.

## 📁 Project Structure

```
FluxERP/
├── backend/              # Node.js + Express API Server
│   ├── src/              # TypeScript source code
│   │   ├── lib/          # Core libraries (auth, db, AI)
│   │   └── routes/       # API route handlers
│   └── prisma/           # Database schema & seed
├── frontend/             # Next.js React Application
│   ├── app/              # Next.js App Router pages
│   └── components/       # Reusable React components
├── Project_Details.md    # Detailed project specifications
├── SETUP_GUIDE.md        # Installation guide
└── IMPROVEMENT_PLAN.md   # Future enhancements
```

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your Gemini API key to `.env`:
   - Get key from: https://aistudio.google.com/app/apikey
   - Update `GEMINI_API_KEY` in `.env`

5. Setup database:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

6. Start backend server:
   ```bash
   npm run dev
   ```

Backend runs on **http://localhost:5000**

### Frontend Setup

1. Open new terminal and navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

4. Start frontend:
   ```bash
   npm run dev
   ```

Frontend runs on **http://localhost:3000**

## 🔑 Demo Login

```
Email: priya.sharma@adani.com
Password: demo123
```

## 🛠️ Technology Stack

- **Backend**: Express + TypeScript + Prisma + SQLite + Gemini AI
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Database**: SQLite (file-based, no server needed)
- **AI**: Google Gemini 2.5 Flash

## 📝 Features

- Product & BOM Management
- Engineering Change Orders (ECO/ECR)
- AI-powered risk scoring
- Work Order tracking
- Supplier management
- Reports & Analytics
- Natural language AI assistant

## 📚 Documentation

See `SETUP_GUIDE.md` for detailed installation instructions and `Project_Details.md` for full specifications.

---

Built with ❤️ for small/medium manufacturing companies
