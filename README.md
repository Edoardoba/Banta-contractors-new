# Banta - Professional Services Platform

A revolutionary service connecting private individuals with professionals across all domains (freelancers, plumbers, electricians, babysitters, etc.) with a review system and escrow functionality.

## Features

- 🗺️ Interactive map showing all professionals
- 🔍 Advanced search and filtering
- ⭐ Review and rating system
- 💰 Price range filtering
- 📍 Location-based search
- 🎨 Modern, beautiful UI with gradient design

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database running locally

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your PostgreSQL database:
```bash
# Create a database named 'banta'
createdb banta

# Run the schema script
psql -d banta -f database/schema.sql
```

3. Create a `.env.local` file in the root directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banta
DB_USER=postgres
DB_PASSWORD=your_password
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses PostgreSQL with the following main tables:
- `professionals` - Stores professional service providers
- `reviews` - Stores reviews and ratings for professionals

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Leaflet** - Interactive maps
- **PostgreSQL** - Database
- **Lucide React** - Icons

## Project Structure

```
├── app/
│   ├── api/
│   │   └── professionals/
│   │       └── route.ts      # API endpoint for professionals
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Main page component
│   └── globals.css            # Global styles
├── components/
│   └── MapComponent.tsx       # Map component
├── lib/
│   ├── db.ts                  # Database connection
│   └── professionals.ts       # Professional data functions
├── database/
│   └── schema.sql             # Database schema
└── package.json
```

## Color Scheme

The app uses a modern gradient color scheme:
- **Teal/Cyan** - Primary actions and accents
- **Purple** - Secondary accents
- **White/Gray** - Backgrounds and text

## Next Steps

- [ ] Add user authentication
- [ ] Implement escrow payment system
- [ ] Add detailed professional profiles
- [ ] Implement review submission
- [ ] Add booking/scheduling functionality
- [ ] Add real-time notifications

