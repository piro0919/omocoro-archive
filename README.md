# Omocoro Archive

> Unofficial archive site for [Omocoro](https://omocoro.jp/). Search and browse articles as a PWA.

[🔗 Live Site](https://omocoro-archive.kkweb.io/)

## ✨ Features

- 🔍 Full-text article search
- 📖 Browse archived articles offline
- 📱 Installable PWA
- ⚡ Server-side rendering for fast loads

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: CSS Modules
- **PWA**: Serwist (Service Worker)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with DATABASE_URL
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📄 License

MIT

---

This is an unofficial archive and is not affiliated with Omocoro or its publisher.