# School ERP – Multi-Tenant SaaS Platform

A production-grade, multi-tenant ERP system for educational institutions built with **TypeScript** across the entire stack.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TypeScript |
| **UI Library** | Tailwind CSS + Framer Motion |
| **State Management** | Redux Toolkit + RTK Query |
| **Backend** | Express 5 + TypeScript |
| **Database** | PostgreSQL (multi-schema per tenant) |
| **ORM** | Sequelize + sequelize-typescript |
| **Auth** | Keycloak (SSO) + JWT |
| **Cache / Queue** | Redis + Bull |
| **Monorepo** | pnpm workspaces |

---

## 📁 Project Structure

```
app/
├── client/                     # Frontend monorepo
│   ├── apps/
│   │   ├── school/             # Main tenant app (Admin/Teacher/Student/Staff portals)
│   │   ├── super_admin/        # Platform admin dashboard
│   │   └── landing/            # Public marketing site
│   └── packages/
│       └── common/             # Shared UI library (@erp/common)
│
├── server/                     # Backend API server
│   └── src/
│       ├── config/             # Environment, Redis, Keycloak config
│       ├── core/               # Shared infrastructure (middleware, auth, utils)
│       ├── database/           # Models, migrations, seeders
│       ├── modules/            # Feature modules (school, auth, tenant, etc.)
│       └── scripts/            # CLI scripts (migrate, seed, create-tenant)
│
└── docs/                       # 📖 This documentation
    ├── ARCHITECTURE.md          # System architecture & design patterns
    ├── GETTING-STARTED.md       # Setup & development guide
    ├── BACKEND.md               # Backend structure & conventions
    ├── FRONTEND.md              # Frontend structure & conventions
    ├── API-CONVENTIONS.md       # API design & endpoint patterns
    ├── ACADEMIC-SESSION.md      # Global session context system
    └── DATABASE.md              # Multi-tenant schema & models
```

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd school-erp/app

# 2. Server setup
cd server
cp .env.example .env        # Configure database, Redis, Keycloak
pnpm install
pnpm migrate                # Run database migrations
pnpm seed:global            # Seed global permissions
pnpm seed:admin             # Create root admin user
pnpm dev                    # Start server on :3000

# 3. Client setup (new terminal)
cd client
pnpm install
pnpm dev:school             # Start school app on :5173
pnpm dev:admin              # Start super admin on :5174
```

---

## 📖 Documentation Index

| Document | Description |
|----------|-------------|
| **[Architecture](docs/ARCHITECTURE.md)** | System design, multi-tenancy, module structure |
| **[Getting Started](docs/GETTING-STARTED.md)** | Prerequisites, setup, environment variables |
| **[Backend Guide](docs/BACKEND.md)** | Controller → Service → Repository pattern, middleware |
| **[Frontend Guide](docs/FRONTEND.md)** | Component design, RTK Query, routing, shared packages |
| **[API Conventions](docs/API-CONVENTIONS.md)** | API design & endpoint patterns |
| **[Auth & Permissions](docs/AUTH-RBAC.md)** | Keycloak, JWT, and the RBAC system |
| **[Academic Session](docs/ACADEMIC-SESSION.md)** | Global session selector & context system |
| **[Attendance Module](docs/ATTENDANCE.md)** | Queue-based high-volume attendance system |
| **[Timetable Module](docs/TIMETABLE.md)** | Timetable templates and slot management |
| **[Database Guide](docs/DATABASE.md)** | Multi-tenant schema & models |

---

## 🔑 Key Concepts

- **Multi-Tenancy**: Each institution gets its own PostgreSQL schema (`tenant_<slug>`)
- **RBAC**: Permission-based access control with configurable role templates
- **Portal System**: Admin, Teacher, Student, Staff portals — each with its own layout, navigation, and permissions
- **Academic Session Context**: Global session selector in the header drives data across all pages
- **Shared UI Package**: `@erp/common` provides reusable components, themes, and hooks

---

## 🤝 Contributing

Please read the following before contributing:

1. Follow the coding conventions in [Backend Guide](docs/BACKEND.md) and [Frontend Guide](docs/FRONTEND.md)
2. Use the established patterns (don't reinvent)
3. Write TypeScript with strict typing — no `any`
4. Test your changes before pushing

---

*Built with ❤️ for educational institutions*
# erp
