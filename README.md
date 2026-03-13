# AI Commerce Ops Copilot

[![Backend CI](https://github.com/ON1RK1NG/ai-commerce-ops-copilot/actions/workflows/backend-ci.yml/badge.svg?branch=dev)](https://github.com/ON1RK1NG/ai-commerce-ops-copilot/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ON1RK1NG/ai-commerce-ops-copilot/actions/workflows/frontend-ci.yml/badge.svg?branch=dev)](https://github.com/ON1RK1NG/ai-commerce-ops-copilot/actions/workflows/frontend-ci.yml)

AI Commerce Ops Copilot is a full-stack application for managing commerce operations, product data, inventory visibility, and operational workflows.

It combines a .NET backend with a modern frontend client and a CI pipeline that validates both backend and frontend changes.

---

## Overview

This project is designed to provide a clean full-stack foundation for commerce operations tooling.

The application includes:

- a backend API for business logic and data access
- a frontend client for dashboards and operational views
- automated CI for backend and frontend validation
- a layered architecture for maintainability and scalability

---

## Key Features

- Product and inventory-focused backend APIs
- Frontend dashboard/client for operational workflows
- Backend query support for filtering, sorting, and pagination
- Inventory summary support for dashboard views
- Automated backend build and test pipeline
- Automated frontend lint and build pipeline
- Clean separation of concerns across solution layers

---

## Tech Stack

### Backend
- .NET 8
- ASP.NET Core Web API
- Clean Architecture-style layering
- xUnit test project

### Frontend
- React
- TypeScript
- Vite

### DevOps / Quality
- GitHub Actions
- Backend CI
- Frontend CI
- Protected `dev` branch workflow

---

## Project Structure

```text
AiCommerceOpsCopilot/
├── API/                         # API layer / HTTP endpoints
├── Application/                 # Application services, DTOs, use cases
├── Domain/                      # Core domain models and business rules
├── Infrastructure/              # Persistence and infrastructure concerns
├── AiCommerceOpsCopilot.Tests/  # Backend tests
├── client/                      # Frontend application
├── .github/workflows/           # GitHub Actions CI workflows
└── AiCommerceOpsCopilot.sln     # Solution file