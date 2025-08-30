# ARTISH - Project Overview

## Purpose

ARTISH is a comprehensive freelancer marketplace platform that connects skilled freelancers with commissioners (clients) for creative and technical projects. The platform facilitates the entire project lifecycle from gig discovery and application to project completion and payment processing.

## High-Level Goals

- **Streamlined Matching**: Connect freelancers with relevant gigs based on skills, experience, and project requirements
- **Project Management**: Provide tools for managing projects, tasks, milestones, and deliverables
- **Secure Payments**: Handle invoicing, payments, and financial transactions between parties
- **Communication Hub**: Enable seamless communication between freelancers and commissioners
- **Portfolio Showcase**: Allow freelancers to showcase their work and build professional profiles

## Key Features

### For Freelancers
- **Gig Discovery**: Browse and apply for available gigs matching their skills
- **Profile Management**: Create comprehensive profiles with portfolios, skills, and work samples
- **Project Dashboard**: Track active projects, tasks, and deadlines
- **Invoice Management**: Generate and track invoices for completed work
- **Earnings Tracking**: Monitor payments and financial performance

### For Commissioners
- **Gig Posting**: Create and post gigs with detailed requirements
- **Freelancer Matching**: Receive matched freelancer recommendations
- **Project Oversight**: Monitor project progress and task completion
- **Payment Processing**: Handle upfront payments and milestone-based payments
- **Team Management**: Manage multiple projects and freelancer relationships

### Platform Features
- **Smart Matching Algorithm**: AI-powered matching between freelancers and projects
- **Dual Payment Systems**: Support for both milestone-based and completion-based payment models
- **Notification System**: Real-time notifications for project updates, payments, and communications
- **Admin Dashboard**: Administrative tools for platform management and oversight
- **Storefront Integration**: Marketplace for digital products and services

## Technology Stack

- **Frontend**: Next.js 15 with React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Custom dev authentication system (magic links + traditional login)
- **Data Storage**: JSON-based hierarchical file storage system
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Chart.js and Recharts for data visualization
- **State Management**: React Context and custom hooks

## Quickstart Instructions

### Prerequisites
- Node.js 20+ installed
- Git for version control

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd artish-web
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser

3. **Available Scripts**
   - `npm run dev` - Start development server
   - `npm run dev:fast` - Fast development (skip type checking)
   - `npm run build` - Build for production
   - `npm run test` - Run test suite
   - `npm run lint` - Run ESLint

### First Steps
1. Navigate to the landing page to understand the platform
2. Use the sign-up flow to create test accounts (freelancer/commissioner)
3. Explore the respective dashboards to understand user workflows
4. Check the admin dashboard for platform management features

## Project Structure Overview

```
artish-web/
├── src/app/                 # Next.js app router pages and API routes
├── components/              # Reusable React components
├── lib/                     # Core business logic and utilities
├── data/                    # JSON-based data storage
├── docs/                    # Project documentation
├── public/                  # Static assets
└── scripts/                 # Utility and migration scripts
```

## Development Modes

- **Development**: Full feature set with hot reloading and debugging
- **Fast Development**: Optimized for quick iteration (skip type checking)
- **Production**: Optimized build with performance enhancements

## Related Documentation

For deeper technical details, see the unstructured documentation:
- [Data Architecture](./unstructured-documentation/DATA_ARCHITECTURE.md)
- [Authentication System](./unstructured-documentation/DEV_AUTHENTICATION.md)
- [Payment Gateway Integration](./unstructured-documentation/PAYMENT_GATEWAY_INTEGRATION.md)
- [Performance Optimizations](./unstructured-documentation/PERFORMANCE_OPTIMIZATION_SUMMARY.md)
- [Invoicing Methods](./unstructured-documentation/INVOICING_METHODS_DOCUMENTATION.md)

## Getting Help

- Check existing documentation in `/docs/unstructured-documentation/`
- Review API endpoints in `/src/app/api/`
- Examine component implementations in `/components/`
- Run health checks: `npm run health-check`
