# UnidBox Order Copilot - Frontend

A modern React-based web application for the UnidBox AI-powered wholesale order automation system. This frontend provides a dealer-facing catalog, AI chatbot assistant, and order management interface.

## Features

- **Product Catalog**: Browse products with category filtering, search, and AI-powered natural language queries
- **AI Chatbot Assistant**: Natural language order processing with product matching and pricing
- **Order Management**: Direct order placement with delivery scheduling
- **Order Tracking**: Track orders by email without requiring an account
- **Delivery Order PDF**: Generate and download professional delivery order documents
- **Admin Dashboard**: Staff portal for managing orders, products, and DO history

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom Amazon-style theme
- **UI Components**: shadcn/ui component library
- **State Management**: TanStack Query (React Query)
- **API Layer**: tRPC for type-safe API calls
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The development server will start at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Python Backend API URL (for AI chatbot integration)
VITE_PYTHON_API_URL=http://localhost:8000/api

# Database URL (for tRPC backend)
DATABASE_URL=your_database_url

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret

# Resend API Key for email notifications
RESEND_API_KEY=re_your_api_key
```

## Integration with Python Backend

The frontend can integrate with the Python FastAPI backend for AI-powered features:

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | AI chatbot for natural language orders |
| `/api/products/search` | POST | Search products with fuzzy matching |
| `/api/products` | GET | List products with filtering |
| `/api/products/{id}` | GET | Get product details |
| `/api/orders` | POST | Create a new order |
| `/api/orders/{id}` | GET | Get order status |
| `/api/orders/{id}/do` | GET | Download Delivery Order PDF |

### Using the Python API

Import the API functions from `src/lib/pythonApi.ts`:

```typescript
import { 
  sendChatMessage, 
  searchProducts, 
  createOrder 
} from '@/lib/pythonApi';

// Chat with AI assistant
const response = await sendChatMessage({
  message: "I need 5 ceiling fans and 3 range hoods",
  session_id: "user-123"
});

// Search products
const results = await searchProducts({
  query: "ceiling fan",
  brand: "Fanco",
  max_results: 10
});

// Create order
const order = await createOrder({
  items: [...],
  customer_name: "John Doe",
  delivery_address: "123 Main St"
});
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── Header.tsx  # Site header with navigation
│   │   └── Footer.tsx  # Site footer
│   ├── pages/          # Page components
│   │   ├── Home.tsx           # Landing page with inquiry form
│   │   ├── PublicCatalog.tsx  # Product catalog
│   │   ├── PublicOrder.tsx    # Order placement
│   │   ├── TrackOrder.tsx     # Order tracking by email
│   │   └── AdminDashboard.tsx # Staff admin portal
│   ├── lib/
│   │   ├── trpc.ts     # tRPC client configuration
│   │   └── pythonApi.ts # Python backend API integration
│   └── App.tsx         # Main app with routing
├── server/             # tRPC backend
│   ├── routers.ts      # API procedures
│   ├── db.ts           # Database helpers
│   └── agents.ts       # AI agent implementations
└── drizzle/            # Database schema
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm db:push` | Push database schema changes |

## Design System

The frontend uses an Amazon-inspired design with:

- **Primary Color**: Orange (#FF9900) for CTAs and accents
- **Secondary Color**: Dark Blue (#232F3E) for headers and navigation
- **Typography**: Clean, professional sans-serif fonts
- **Layout**: Responsive grid with mobile-first approach

## Demo Accounts

For testing the staff portal:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |

## License

MIT License - see LICENSE file for details.
