# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up PostgreSQL Database

Make sure PostgreSQL is running locally, then:

```bash
# Create database
createdb banta

# Run schema (Windows PowerShell)
psql -d banta -f database/schema.sql

# Or on Mac/Linux
psql -d banta < database/schema.sql
```

## 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banta
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

## 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## Features Included

✅ Three-column layout (Filters | Listings | Map)  
✅ Interactive map with markers  
✅ Search functionality  
✅ Category filtering  
✅ Price range filtering  
✅ Rating display  
✅ Responsive design  
✅ Modern gradient color scheme (Teal/Cyan/Purple)  

## Next Steps

- Add user authentication
- Implement escrow payment system
- Add detailed professional profiles
- Implement review submission
- Add booking functionality

