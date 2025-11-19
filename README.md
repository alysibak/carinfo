# CarInfo - Comprehensive Car Comparison Website 🚗

A modern, dark-themed web application for searching and comparing cars from every brand, year, and country where data is available. Built with React, TypeScript, and completely free tools and services.

## 🌟 Features

### 🎨 **Stunning Dark Theme**
- Beautiful dark UI with gradient accents
- Smooth animations and transitions
- Custom scrollbars and hover effects
- Optimized for eye comfort during extended use

### 🔍 **Advanced Search & Filtering**
- Real-time text search across make, model, and year
- Multi-level filtering system with visual icons:
  - Year range (min/max)
  - Make and model
  - Body style (sedan, SUV, coupe, convertible, hatchback, wagon, truck)
  - Fuel type (gasoline, diesel, electric, hybrid, plug-in hybrid)
  - Transmission type (manual, automatic, CVT, dual-clutch)
  - Drive type (FWD, RWD, AWD, 4WD)
  - Country of origin
  - Horsepower range
  - Fuel economy range
  - Price range

### 📊 **Side-by-Side Comparison**
- Compare up to 5 cars simultaneously
- Comprehensive comparison table with 20+ specifications
- Real car images with brand-specific colors
- Safety ratings visualization with star ratings
- Performance metrics comparison
- Dimension and weight comparisons
- Easy add/remove from comparison with visual feedback

### 🖼️ **Real Car Images**
- Brand-colored placeholder images using free service (placeholder.com)
- No emoji placeholders - actual image tags
- Automatic fallback handling
- Optimized for fast loading

### 💻 **Modern Tech Stack - 100% Free**
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme
- **State Management**: Zustand (lightweight and fast)
- **Routing**: React Router v6
- **Backend**: Express + TypeScript
- **Data Storage**: JSON-based (easily upgradable to PostgreSQL)
- **Images**: via.placeholder.com (free service)
- **API Integration**: NHTSA Vehicle API (free government data)

### 📱 **Responsive Design**
- Mobile-first approach
- Works perfectly on all device sizes
- Touch-optimized for mobile devices
- Sticky headers for easy navigation

### ⚡ **Performance Optimizations**
- Lazy loading for images
- Efficient state management
- Optimized build with Vite
- Custom animations with CSS
- Minimal re-renders with Zustand

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carinfo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://localhost:5000

### Individual Commands

```bash
# Start frontend only
npm run dev:client

# Start backend only
npm run dev:server

# Build for production
npm run build

# Start production server
npm run start
```

## 📁 Project Structure

```
carinfo/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── Header.tsx           # Navigation header with car icon
│   │   │   ├── FilterSidebar.tsx    # Advanced filtering UI
│   │   │   └── CarCard.tsx          # Individual car display card
│   │   ├── pages/         # Page components
│   │   │   ├── Home.tsx             # Search and browse page
│   │   │   └── Compare.tsx          # Side-by-side comparison
│   │   ├── services/      # API services
│   │   │   └── api.ts               # Backend API client
│   │   ├── stores/        # Zustand state management
│   │   │   └── carStore.ts          # Global car state
│   │   ├── types/         # TypeScript type definitions
│   │   │   └── car.types.ts         # Car data interfaces
│   │   ├── utils/         # Utility functions
│   │   │   └── carImages.ts         # Image URL generation
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # App entry point
│   │   └── index.css      # Global styles + dark theme
│   ├── index.html         # HTML template
│   ├── tailwind.config.js # Tailwind configuration + dark theme
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   │   └── car.controller.ts
│   │   ├── routes/        # API routes
│   │   │   └── car.routes.ts
│   │   ├── services/      # Business logic
│   │   │   ├── car.service.ts       # Car data operations
│   │   │   └── nhtsa.service.ts     # NHTSA API integration
│   │   ├── types/         # TypeScript types
│   │   │   └── car.types.ts
│   │   └── index.ts       # Server entry point
│   ├── data/              # Car database (JSON)
│   │   └── cars.json      # 20 sample vehicles
│   └── package.json
├── README.md              # This file
└── package.json           # Root package.json
```

## 🎨 Dark Theme

The application features a comprehensive dark theme with:

- **Background Colors**:
  - Primary: `#0f172a` (slate-900)
  - Secondary: `#1e293b` (slate-800)
  - Tertiary: `#334155` (slate-700)

- **Accent Colors**:
  - Blue gradients for interactive elements
  - Cyan highlights for headings
  - Custom color palette for each car brand

- **Animations**:
  - Fade-in on page load
  - Slide-up for content sections
  - Scale-in for badges and notifications
  - Smooth hover transitions

## 📡 API Endpoints

### Cars
- `GET /api/cars/makes` - Get all available makes
- `GET /api/cars/makes/:make/models` - Get models for a specific make
- `POST /api/cars/search` - Search cars with filters
- `GET /api/cars/:id` - Get car details by ID
- `POST /api/cars/compare` - Compare multiple cars (max 5)
- `GET /api/cars/stats/overview` - Get database statistics

### Request Examples

**Search Cars:**
```json
POST /api/cars/search
{
  "query": "mustang",
  "filters": {
    "year": { "min": 2020, "max": 2023 },
    "bodyStyle": ["coupe"],
    "horsepower": { "min": 400 }
  },
  "sort": { "field": "horsepower", "order": "desc" },
  "limit": 50
}
```

**Compare Cars:**
```json
POST /api/cars/compare
{
  "ids": ["car-001", "car-002", "car-003"]
}
```

## 🗂️ Data Structure

The car database includes comprehensive specifications:

- **Basic Info**: Make, model, year, trim, country of origin
- **Engine**: Displacement, horsepower, torque, fuel type, configuration
- **Performance**: 0-60 time, top speed, quarter mile
- **Dimensions**: Length, width, height, wheelbase, weight
- **Fuel Economy**: City, highway, combined MPG
- **Transmission**: Type and number of speeds
- **Safety Ratings**: Overall, frontal, side, rollover (NHTSA scale)
- **Pricing**: MSRP and price ranges

## 🚗 Current Database

The application currently includes 20 diverse sample vehicles from:

- 🇺🇸 **USA**: Ford Mustang GT, Chevrolet Corvette Stingray, Tesla Model 3 Performance
- 🇯🇵 **Japan**: Toyota Camry, Honda Civic Type R, Nissan GT-R, Mazda MX-5 Miata, Lexus LC 500, Acura NSX Type S, Subaru WRX STI
- 🇩🇪 **Germany**: BMW M3 Competition, Mercedes-Benz S-Class, Porsche 911 Carrera, Audi RS 6 Avant Performance, Volkswagen Golf GTI
- 🇮🇹 **Italy**: Ferrari F8 Tributo, Lamborghini Huracan EVO
- 🇰🇷 **South Korea**: Hyundai Ioniq 5 AWD, Kia EV6 GT-Line, Genesis G70 3.3T Sport

## 🆓 Free Services Used

- **Images**: via.placeholder.com - Free placeholder image service
- **Data Source**: NHTSA Vehicle API - Free US government automotive data
- **Hosting**: Can be deployed to Vercel, Netlify, or Railway (all have free tiers)
- **Database**: JSON-based (no cost), easily upgraded to free PostgreSQL (Supabase, Neon)

## 🔮 Future Enhancement Possibilities

### Data Expansion
- Bulk import from NHTSA API for US vehicles (1980-present)
- Integration with additional free automotive APIs
- User-contributed data with verification system
- Historical vehicle data (classic cars from 1900s onwards)

### Features
- Data visualization charts (performance trends, price comparisons)
- User accounts and saved comparisons (Firebase free tier)
- Advanced analytics dashboard
- Export comparisons to PDF
- Public API for developers
- User reviews and ratings
- Real-time market pricing (where available)
- Advanced search with AI-powered recommendations

### Technical Improvements
- PostgreSQL database migration (Supabase free tier)
- Full-text search with better algorithms
- Redis caching (Upstash free tier)
- Progressive Web App (PWA) support
- Server-side rendering (SSR) with Next.js
- GraphQL API option
- Mobile app with React Native

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI library with hooks
- **TypeScript** - Type safety and better DX
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS with custom dark theme
- **Zustand** - Lightweight state management (3kb)
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Express** - Minimal web framework
- **TypeScript** - Type safety across the stack
- **CORS** - Cross-origin resource sharing
- **Dotenv** - Environment variable management

## 💡 Tips for Adding More Data

To expand the car database:

1. **Manual Addition**: Edit `server/data/cars.json` directly
2. **NHTSA API**: Use the included NHTSA service (`server/src/services/nhtsa.service.ts`)
3. **Batch Import**: Create a script to fetch and format data from free sources
4. **User Contributions**: Build a submission form for community data

Example NHTSA API usage:
```typescript
import { fetchAllMakes, fetchModelsForMake } from './services/nhtsa.service';

// Fetch all available makes
const makes = await fetchAllMakes();

// Fetch models for a specific make
const models = await fetchModelsForMake('Toyota');
```

## 📝 License

ISC

## 🙏 Acknowledgments

- **NHTSA** for free vehicle safety data
- **via.placeholder.com** for free placeholder images
- All automotive manufacturers for specifications
- Open source community for amazing tools
- **Tailwind CSS** for the excellent utility-first framework
- **Vite** team for the blazing-fast build tool

---

**Note**: This application uses sample data and free services. For production use, consider integrating with comprehensive automotive data providers or building a community-driven database.

## 🎯 Perfect for

- Car enthusiasts and buyers
- Automotive researchers
- Educational projects
- Portfolio demonstrations
- Learning React + TypeScript
- Understanding full-stack development

---

Built with ❤️ using 100% free and open-source technologies.
