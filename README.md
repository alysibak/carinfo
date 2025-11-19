# CarInfo - Comprehensive Car Comparison Website

A modern web application for searching and comparing cars from every brand, year, and country where data is available.

## Features

### 🔍 **Advanced Search & Filtering**
- Search by make, model, year, or any text
- Multi-level filtering system:
  - Year range
  - Make and model
  - Body style (sedan, SUV, coupe, etc.)
  - Fuel type (gasoline, diesel, electric, hybrid)
  - Transmission type
  - Drive type (FWD, RWD, AWD, 4WD)
  - Country of origin
  - Horsepower range
  - Price range

### 📊 **Side-by-Side Comparison**
- Compare up to 5 cars simultaneously
- Detailed specification comparison table
- Safety ratings visualization
- Performance metrics comparison
- Dimension and weight comparisons

### 💻 **Modern Tech Stack**
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Express + TypeScript
- **Data Storage**: JSON-based (easily upgradable to PostgreSQL)
- **API**: RESTful API with NHTSA integration support

### 📱 **Responsive Design**
- Mobile-first approach
- Works on all device sizes
- Optimized for performance

## Project Structure

```
carinfo/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── stores/        # Zustand state management
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main app component
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   └── index.ts       # Server entry point
│   ├── data/              # Car database (JSON)
│   └── package.json
└── package.json           # Root package.json

```

## Getting Started

### Prerequisites
- Node.js 18+
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
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

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

## API Endpoints

### Cars
- `GET /api/cars/makes` - Get all available makes
- `GET /api/cars/makes/:make/models` - Get models for a specific make
- `POST /api/cars/search` - Search cars with filters
- `GET /api/cars/:id` - Get car details by ID
- `POST /api/cars/compare` - Compare multiple cars
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

## Data Structure

The car database includes comprehensive specifications:

- **Basic Info**: Make, model, year, trim, country of origin
- **Engine**: Displacement, horsepower, torque, fuel type, configuration
- **Performance**: 0-60 time, top speed, quarter mile
- **Dimensions**: Length, width, height, wheelbase, weight
- **Fuel Economy**: City, highway, combined MPG
- **Transmission**: Type and number of speeds
- **Safety Ratings**: Overall, frontal, side, rollover
- **Pricing**: MSRP and price ranges

## Current Database

The application currently includes 20 sample vehicles from:
- 🇺🇸 USA: Ford, Chevrolet, Tesla
- 🇯🇵 Japan: Toyota, Honda, Nissan, Mazda, Lexus, Acura, Subaru
- 🇩🇪 Germany: BMW, Mercedes-Benz, Porsche, Audi, Volkswagen
- 🇮🇹 Italy: Ferrari, Lamborghini
- 🇰🇷 South Korea: Hyundai, Kia, Genesis

## Future Enhancements

### Data Expansion
- Integration with NHTSA API for US vehicles
- Web scraping for manufacturer specifications
- User-contributed data with verification
- Historical vehicle data (classic cars)

### Features
- Data visualization charts (performance trends, price comparisons)
- User accounts and saved comparisons
- Advanced analytics dashboard
- Export comparisons to PDF
- API for developers
- Real-time market pricing
- User reviews and ratings

### Technical Improvements
- PostgreSQL database migration
- Elasticsearch for advanced search
- Redis caching
- Progressive Web App (PWA)
- Server-side rendering (SSR)
- GraphQL API option

## Technologies Used

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Express** - Web framework
- **TypeScript** - Type safety
- **CORS** - Cross-origin resource sharing
- **Dotenv** - Environment variables

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

ISC

## Acknowledgments

- NHTSA for vehicle safety data
- All automotive manufacturers for specifications
- Open source community for amazing tools

---

**Note**: This application uses sample data. For production use, integrate with official automotive data sources and APIs.
