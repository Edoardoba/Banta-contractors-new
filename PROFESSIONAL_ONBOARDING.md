# 👨‍🔧 Sistema Onboarding Professionisti - Guida Completa

## ✨ Overview

Sistema completo di registrazione per professionisti con form multi-step animato che raccoglie tutti i dati necessari per operare sulla piattaforma.

---

## 🎯 Cosa Raccoglie

### Step 1: Dati Personali 👤
- Nome completo *
- Email *
- Password * (min 6 caratteri)
- Telefono *

### Step 2: Dati Professionali 💼
- Categoria * (dropdown: Idraulico, Elettricista, Babysitter, etc.)
- Descrizione attività * (textarea)
- Indirizzo completo Roma * (geocoding automatico)
- URL foto profilo (opzionale)

### Step 3: Servizi Offerti 💰
Lista servizi con:
- Nome servizio *
- Prezzo (€) *
- Durata (minuti)
- Descrizione

Bottone "+ Aggiungi Servizio" per servizi multipli

### Step 4: Disponibilità 📅
Giorni della settimana con orari:
- Checkbox per abilitare/disabilitare giorno
- Time picker per orario inizio/fine
- Default: Lun-Ven 9:00-18:00

---

## 🚀 Come Usare

### 1. Accedi al Form

```
http://localhost:3000/professional-signup
```

### 2. Compila i 4 Step

**Navigazione:**
- Bottone "Avanti" → Prossimo step (con validazione)
- Bottone "Indietro" → Step precedente
- Progress bar in alto (% completamento)

**Validazione:**
- Step 1: Tutti i campi obbligatori + password ≥6 char
- Step 2: Categoria, descrizione, indirizzo
- Step 3: Almeno 1 servizio con nome e prezzo
- Step 4: Almeno 1 giorno di disponibilità

### 3. Conferma

All'ultimo step, bottone "Completa Registrazione"

**Backend crea:**
1. Professional nella tabella `professionals`
2. Servizi nella tabella `services`
3. Disponibilità nella tabella `availability`
4. User con role='professional'
5. Link bidirezionale professional ↔ user
6. Session (auto-login)

**Redirect:**
→ `/dashboard` (già autenticato!)

---

## 🎨 Features UI

### Animazioni
- **slideIn**: Step appaiono da destra (0.3s)
- **Progress bar**: Animazione smooth riempimento
- **Success**: Check verde grande con scale in bounce

### Design
- Gradient background (teal/cyan/purple)
- Card bianca con shadow
- Icone per ogni step
- Input rounded-xl con focus ring teal
- Progress bar gradient (teal→cyan)

### UX
- Progress % mostrato
- Validazione client-side
- Error messages chiari
- Loading state con spinner
- Mobile responsive

---

## 📊 Database Schema

### Tabella `professionals`

```sql
-- Campi creati dall'onboarding:
name VARCHAR(255) - Nome professionista
category VARCHAR(100) - Categoria servizio
description TEXT - Descrizione attività
location_name VARCHAR(255) - Indirizzo testuale
latitude DECIMAL - Coordinate per mappa
longitude DECIMAL - Coordinate per mappa
phone VARCHAR(20) - Telefono contatto
email VARCHAR(255) - Email (se fornita)
image_url VARCHAR(500) - URL foto profilo

-- Campi default:
rating DECIMAL DEFAULT 0 - Rating iniziale
review_count INTEGER DEFAULT 0
reliability_score INTEGER DEFAULT 100 - Punteggio max
status VARCHAR(20) DEFAULT 'new' - Status iniziale
```

### Tabella `services`

```sql
professional_id INTEGER - FK a professional
name VARCHAR(255) - Nome servizio
description TEXT - Descrizione dettagliata
price DECIMAL - Prezzo in euro
duration_minutes INTEGER - Durata in minuti
```

### Tabella `availability`

```sql
professional_id INTEGER - FK a professional
day_of_week INTEGER - 0=Dom, 1=Lun, ..., 6=Sab
start_time TIME - Orario inizio (es: 09:00)
end_time TIME - Orario fine (es: 18:00)
slot_duration INTEGER - 60 minuti (default)
is_active BOOLEAN - true
```

### Tabella `users`

```sql
email VARCHAR(255) - Email login
password_hash VARCHAR(255) - Password hashata
role VARCHAR(20) - 'professional'
name VARCHAR(255) - Nome
phone VARCHAR(20) - Telefono
professional_id INTEGER - FK a professional
```

---

## 🔄 Backend Flow

### POST /api/professionals/onboarding

**Input:**
```json
{
  "name": "Mario Rossi",
  "email": "mario@example.com",
  "password": "password123",
  "phone": "+39 333 1234567",
  "category": "Idraulico",
  "description": "Esperto idraulico con 10 anni di esperienza...",
  "address": "Via Roma 123, 00100 Roma RM",
  "image_url": "https://example.com/photo.jpg",
  "services": [
    {
      "name": "Riparazione perdite",
      "description": "Riparazione di perdite d'acqua",
      "price": 50,
      "duration_minutes": 60
    }
  ],
  "availability": [
    {
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "18:00"
    },
    {
      "day_of_week": 2,
      "start_time": "09:00",
      "end_time": "18:00"
    }
  ]
}
```

**Processing:**

```typescript
BEGIN TRANSACTION

// 1. Geocode indirizzo (per ora: random offset da centro Roma)
const { latitude, longitude } = geocodeAddress(address)

// 2. Crea professional
INSERT INTO professionals (...) RETURNING id

// 3. Crea servizi
for each service:
  INSERT INTO services (professional_id, ...)

// 4. Crea disponibilità
for each availability:
  INSERT INTO availability (professional_id, ...)

// 5. Crea user
const passwordHash = hashPassword(password)
INSERT INTO users (...) RETURNING id

// 6. Link bidirezionale
UPDATE professionals SET user_id = ... WHERE id = ...

// 7. Crea sessione
INSERT INTO sessions (id, user_id, expires_at)
SET cookie 'session_id'

COMMIT
```

**Output:**
```json
{
  "success": true,
  "professional": {
    "id": 123,
    "name": "Mario Rossi",
    "category": "Idraulico"
  },
  "user": {
    "id": 456,
    "email": "mario@example.com",
    "role": "professional"
  }
}
```

**Cookie impostato:**
- `session_id` (httpOnly, 7 giorni)
- Utente già autenticato!

---

## 🗺️ Geocoding

### Implementazione Attuale (Semplificata)

```typescript
function geocodeAddress(address: string) {
  // Centro Roma
  const baseLatitude = 41.9028
  const baseLongitude = 12.4964

  // Offset random ±0.05 gradi (~5km)
  const offsetLat = (Math.random() - 0.5) * 0.05
  const offsetLng = (Math.random() - 0.5) * 0.05

  return {
    latitude: baseLatitude + offsetLat,
    longitude: baseLongitude + offsetLng,
  }
}
```

### Implementazione Produzione (Raccomandata)

**Opzione A: OpenStreetMap Nominatim (Gratis)**

```typescript
async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address + ', Roma, Italy')}&` +
    `format=json&limit=1`
  )
  const data = await response.json()

  if (data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    }
  }

  // Fallback a Roma centro
  return { latitude: 41.9028, longitude: 12.4964 }
}
```

**Opzione B: Google Maps Geocoding API (A pagamento)**

```typescript
async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(address)}&` +
    `key=${process.env.GOOGLE_MAPS_API_KEY}`
  )
  const data = await response.json()

  if (data.results.length > 0) {
    return {
      latitude: data.results[0].geometry.location.lat,
      longitude: data.results[0].geometry.location.lng,
    }
  }

  return { latitude: 41.9028, longitude: 12.4964 }
}
```

---

## 🧪 Testing

### Test Form Completo

1. Vai a `http://localhost:3000/professional-signup`

2. **Step 1 - Dati Personali:**
   - Nome: Mario Rossi
   - Email: mario.idraulico@test.com
   - Password: test123
   - Telefono: +39 333 1234567
   - Clicca "Avanti"

3. **Step 2 - Dati Professionali:**
   - Categoria: Idraulico
   - Descrizione: "Idraulico professionista con 10 anni di esperienza..."
   - Indirizzo: Via Roma 123, 00100 Roma RM
   - Clicca "Avanti"

4. **Step 3 - Servizi:**
   - Servizio 1:
     - Nome: Riparazione perdite
     - Prezzo: 50
     - Durata: 60
   - Clicca "+ Aggiungi Servizio"
   - Servizio 2:
     - Nome: Installazione sanitari
     - Prezzo: 80
     - Durata: 120
   - Clicca "Avanti"

5. **Step 4 - Disponibilità:**
   - Seleziona Lun, Mar, Mer, Gio, Ven (già selezionati)
   - Modifica orari se necessario (default 9:00-18:00)
   - Clicca "Completa Registrazione"

6. **Success:**
   - Vedi check verde
   - Redirect automatico a `/dashboard`
   - Sei loggato come professional!

### Verifica Database

```sql
-- Vedi professional creato
SELECT * FROM professionals
WHERE email = 'mario.idraulico@test.com';

-- Vedi servizi
SELECT s.* FROM services s
JOIN professionals p ON s.professional_id = p.id
WHERE p.email = 'mario.idraulico@test.com';

-- Vedi disponibilità
SELECT a.* FROM availability a
JOIN professionals p ON a.professional_id = p.id
WHERE p.email = 'mario.idraulico@test.com'
ORDER BY a.day_of_week;

-- Vedi user
SELECT * FROM users
WHERE email = 'mario.idraulico@test.com';

-- Verifica link
SELECT
  u.email,
  p.name,
  p.category,
  u.professional_id,
  p.user_id
FROM users u
JOIN professionals p ON u.professional_id = p.id
WHERE u.email = 'mario.idraulico@test.com';
```

### Test API Diretto

```bash
curl -X POST http://localhost:3000/api/professionals/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Professionista",
    "email": "test.pro@example.com",
    "password": "test123",
    "phone": "+39 333 9999999",
    "category": "Elettricista",
    "description": "Elettricista professionista",
    "address": "Via Test 1, Roma",
    "image_url": "",
    "services": [
      {
        "name": "Riparazione impianti",
        "description": "Riparazione impianti elettrici",
        "price": 60,
        "duration_minutes": 90
      }
    ],
    "availability": [
      {
        "day_of_week": 1,
        "start_time": "09:00",
        "end_time": "18:00"
      }
    ]
  }'
```

---

## 📝 Validazioni

### Client-Side (Form)

**Step 1:**
- Tutti i campi obbligatori presenti
- Email formato valido
- Password ≥ 6 caratteri
- Telefono non vuoto

**Step 2:**
- Categoria selezionata
- Descrizione non vuota
- Indirizzo non vuoto

**Step 3:**
- Almeno 1 servizio
- Ogni servizio ha nome
- Ogni servizio ha prezzo > 0

**Step 4:**
- Almeno 1 giorno selezionato
- Ogni giorno ha start_time < end_time

### Server-Side (API)

```typescript
// Validazioni backend
if (!name || !email || !password || !phone || !category || !description || !address) {
  return 400 'Campi obbligatori mancanti'
}

if (!services || services.length === 0) {
  return 400 'Aggiungi almeno un servizio'
}

if (!availability || availability.length === 0) {
  return 400 'Seleziona almeno un giorno di disponibilità'
}

// Email unique constraint
if (email già esistente) {
  return 409 'Questa email è già registrata'
}
```

---

## 🎨 Personalizzazione

### Aggiungi Categoria

```typescript
// components/ProfessionalOnboarding.tsx
const CATEGORIES = [
  'Idraulico',
  'Elettricista',
  'Babysitter',
  'Pulizie',
  'Imbianchino',
  'Fabbro',
  'Giardiniere',
  'Tecnico Climatizzazione',
  'Falegname',
  'Muratore',
  'Fisioterapista',  // ← Aggiungi qui
  'Altro',
]
```

### Cambia Orari Default

```typescript
// Default availability (Step 4)
availability: [
  { day_of_week: 1, start_time: '08:00', end_time: '20:00' },  // Lun
  { day_of_week: 2, start_time: '08:00', end_time: '20:00' },  // Mar
  // ...
]
```

### Cambia Durata Slot

```typescript
// Nel form servizi
<input
  type="number"
  value={service.duration_minutes}
  step="30"  // ← Era 15, ora 30
  min="30"   // ← Era 15, ora 30
/>
```

---

## 🔐 Sicurezza

### Password Hashing

✅ Password hashata con SHA-256 + salt random

**⚠️ Produzione:** Usa bcrypt
```bash
npm install bcrypt
```

### Session

✅ Cookie httpOnly (non accessibile da JS)
✅ Cookie secure in production (HTTPS only)
✅ 7 giorni scadenza

### SQL Injection

✅ Tutte le query parametrizzate (`$1`, `$2`, ...)

### CSRF

✅ Cookie sameSite='lax'

---

## 🔮 Features Future

### Priorità Alta
1. **Upload Foto** - Storage S3/Cloudinary
2. **Geocoding Reale** - API Nominatim/Google Maps
3. **Email Verification** - Conferma email
4. **Admin Approval** - Professionisti approvati da admin

### Priorità Media
5. **Multi-step Photos** - Upload multiple foto lavori
6. **Certificazioni** - Upload documenti certificazioni
7. **Business Info** - P.IVA, codice fiscale, assicurazione
8. **Preview** - Anteprima profilo prima di confermare

### Priorità Bassa
9. **Import Calendar** - Sincronizza Google Calendar
10. **Video Intro** - Upload video presentazione
11. **Portfolio** - Galleria foto lavori precedenti

---

## 🐛 Troubleshooting

### Email già registrata

**Errore:** `Questa email è già registrata`

**Causa:** Email già presente in `users` o `professionals`

**Soluzione:**
```sql
-- Verifica email
SELECT * FROM users WHERE email = 'test@example.com';
SELECT * FROM professionals WHERE email = 'test@example.com';

-- Se è di test, cancella
DELETE FROM users WHERE email = 'test@example.com';
DELETE FROM professionals WHERE email = 'test@example.com';
```

### Form non avanza step

**Problema:** Clicco "Avanti" ma resta stesso step

**Causa:** Validazione fallita

**Debug:**
1. Apri DevTools → Console
2. Guarda errore in rosso sotto il form
3. Compila campo mancante

### Geocoding fallisce

**Problema:** Coordinate sempre centro Roma

**Causa:** Geocoding è mock (random offset)

**Soluzione:** Implementa geocoding reale (vedi sopra)

### Dashboard non si carica dopo signup

**Problema:** Redirect a dashboard ma errore

**Causa:** professional_id nullo in session

**Debug:**
```sql
-- Verifica link
SELECT u.id, u.professional_id, p.id as prof_id
FROM users u
LEFT JOIN professionals p ON u.professional_id = p.id
WHERE u.email = 'test@example.com';
```

---

## ✅ Checklist Pre-Produzione

- [ ] Implementa geocoding reale (Nominatim/Google)
- [ ] Sostituisci SHA-256 con bcrypt per password
- [ ] Aggiungi upload foto (S3/Cloudinary)
- [ ] Email verification dopo signup
- [ ] Admin approval workflow
- [ ] Rate limiting su API onboarding
- [ ] Validazione server-side robusta (price > 0, etc.)
- [ ] HTTPS obbligatorio
- [ ] Log errori in sistema monitoring
- [ ] Backup database regolare

---

**Sistema Onboarding Professionisti Completo ✅**
**Versione:** 1.0.0
**Data:** ${new Date().toLocaleDateString('it-IT')}
