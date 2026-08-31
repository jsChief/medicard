# MediCard - Patient Cards Tracking App

A modern, secure web application for hospitals to manage patient cards, streamline workflows, and improve care coordination — all while maintaining HIPAA/GDPR compliance.

## Features

- **Centralized Patient Records** - Store and access all patient cards in one secure, searchable database
- **Instant Patient Search** - Advanced filters: name, MRN, DOB, condition, department, date ranges
- **Comprehensive Patient Cards** - Medical history, medications, allergies, lab results, imaging, care plans
- **HIPAA & GDPR Compliant** - AES-256 encryption, audit logs, role-based access control, automated compliance reporting
- **Team Collaboration** - Real-time updates, secure messaging, shift handoffs, multidisciplinary care coordination
- **Automated Workflows** - Smart alerts for medication interactions, discharge planning, follow-up reminders

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **Routing**: React Router 7
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Input, Card, Badge)
│   └── layout/       # Layout components (Navbar, Footer, Layout)
├── pages/            # Page components (HomePage, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions (cn, etc.)
├── types/            # TypeScript type definitions
├── context/          # React context providers
├── App.tsx           # App routes
└── main.tsx          # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (type-check + bundle) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all source files |
| `npx tsc --noEmit` | TypeScript type checking only |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page (marketing) |
| `/login` | Hospital staff login |
| `/register` | Hospital account creation |
| `/features` | Feature overview |
| `/pricing` | Pricing plans |
| `/about` | About MediCard |
| `/demo` | Interactive demo |
| `/contact` | Contact sales/support |

*Dashboard routes (protected) will be added in future iterations:*
- `/dashboard` - Overview stats & quick actions
- `/patients` - Patient list with search/filter
- `/patients/:id` - Patient detail view
- `/patients/new` - Add new patient
- `/settings` - Hospital & staff management

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://api.medicard.com
VITE_APP_NAME=MediCard
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel deploy --prod
```

### Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs.medicard.com](https://docs.medicard.com)
- Issues: [GitHub Issues](https://github.com/yourorg/medicard/issues)
- Email: support@medicard.com