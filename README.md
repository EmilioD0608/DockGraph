<div align="center">
  <h1>DockGraph</h1>
  <p>
    <strong>The Visual Command Center for Docker Architectures</strong>
  </p>
  
  <p>
    <a href="#overview">Overview</a> •
    <a href="#core-capabilities">Core Capabilities</a> •
    <a href="#getting-started">Getting Started</a>
  </p>

  <!-- Add status badges here if available in the future -->
  <br/>
</div>

**DockGraph** bridges the gap between static infrastructure code and dynamic system behavior. It is an advanced engineering tool designed to visualize, manage, and orchestrate Docker Compose environments with precision. 

By abstracting the complexity of multi-repository setups, DockGraph allows developers and architects to treat their entire distributed system as a single, cohesive logical unit—regardless of whether the code lives in a monorepo or across scattered polyrepos.

## ⚡ Core Capabilities

### 🌐 Repository-Agnostic Orchestration
Stop juggling terminal windows for different projects. DockGraph unifies your workflow by seamlessly integrating **Monorepo** and **Polyrepo** strategies. partial configuration management means you can visualize specific service subsets or the entire enterprise topology in one view.

### 🔍 Live Architectural Intelligence
Move beyond static diagrams. Our engine parses your `docker-compose.yml` files to generate a **real-time, interactive dependency graph**. Instantly identify circular dependencies, orphaned volumes, and network bottlenecks. The visualization evolves as your code changes.

### 🛡️ Smart Validation & Security
Deploy with confidence. The integrated environment manager handles sensitive variables and credentials securely, while our parsing engine validates configuration syntax before you even attempt a build. Avoid runtime errors with compile-time insights.

### 🛠️ Interactive Service Control
A robust "Mission Control" for your containers. Start, stop, rebuild, and inspect logs for individual services directly from the graph. No more memorizing CLI flags—just clear, visual operations.

---

## 🛠️ Technology Stack

Built with a commitment to performance and modern standards:

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 21 (Signals Architecture) |
| **Backend** | NestJS (Type-Safe Node.js) |
| **Data** | PostgreSQL + Prisma ORM |
| **Engine** | Docker & SSH Integration |

---

## 🚀 Getting Started

Deploy the platform locally to start visualizing your infrastructure.

### 1. Backend Service
Initialize the core requirements and database.

```bash
cd backend/api-app
npm install

# Configure environment & database
cp .env.example .env
npx prisma migrate dev
npx prisma db seed

# Launch core
npm run start:dev
```

### 2. Visual Interface
Launch the client application.

```bash
cd DockGraph
npm install
ng serve
```

Access the dashboard at `http://localhost:4200`.

---

## 🤝 Contributing

We are building the future of container orchestration tools. Whether you are fixing a bug, designing a new node layout algorithm, or improving documentation, your contributions are welcome.

Please review our [Contributing Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

## 📄 License

Copyright &copy; 2026. Released under the **Apache-2.0 License**.
