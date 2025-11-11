# Scripts Documentation

## Services Table Setup

### Option 1: SQL Script (Recommended for bulk data)

The SQL script creates the table and populates it with fake services for all professionals (IDs 1-208):

```bash
# Windows PowerShell
psql -d banta -f scripts/populate-services.sql

# Mac/Linux
psql -d banta < scripts/populate-services.sql
```

This script will:
- Create the `services` table if it doesn't exist
- Generate 2-5 services per professional (randomly)
- Create realistic service names, descriptions, prices (€15-€350), and durations (30-210 minutes)
- Each professional gets tiered services (Base → Standard → Premium → Premium Plus)

### Option 2: TypeScript Script

Run the TypeScript script to populate the services table with sample data:

```bash
# Using tsx (recommended - install with: npm install -D tsx)
npx tsx scripts/populate-services.ts

# Or using ts-node (install with: npm install -D ts-node)
npx ts-node scripts/populate-services.ts
```

The TypeScript script will:
- Check for existing professionals in the database
- Create services for professionals with IDs 1-5 (if they exist)
- If no matching professionals are found, create default services for all existing professionals

### Notes

- Make sure your `.env.local` file is configured with the correct database credentials (for TypeScript script)
- The SQL script doesn't require environment variables - just run it directly with psql
- Services are linked to professionals via `professional_id` foreign key
- Each service includes: name, description, price, and optional duration_minutes
- To clear existing services before repopulating, uncomment the `TRUNCATE` line in the SQL script

