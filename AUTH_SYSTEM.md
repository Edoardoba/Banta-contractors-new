# 🔐 Sistema Autenticazione - RomaServizi

## ✨ Overview

Sistema di autenticazione completo e **super coinvolgente** con:
- 🎨 UI moderna con animazioni smooth
- ⚡ Signup in 30 secondi (solo 3 campi!)
- 🔒 Sicurezza con hash password
- 🍪 Session-based auth (cookie httpOnly)
- 👥 Ruoli: customer, professional, admin

---

## 🚀 Setup Rapido

### 1. Esegui Script SQL

```bash
psql -U postgres -d banta -f scripts/add-auth-system.sql
```

Questo crea:
- Tabelle: `users`, `sessions`, `password_reset_tokens`, `email_verification_tokens`
- Link bidirezionali: `users ↔ customers`, `users ↔ professionals`
- Funzioni: cleanup sessioni/token scaduti
- Trigger: auto-update `updated_at`

### 2. Avvia App

```bash
npm run dev
```

### 3. Test Flow

**Cliente:**
1. Apri `http://localhost:3000`
2. Clicca "Accedi" (top-right)
3. Clicca "Registrati"
4. Compila: Nome, Email, Password
5. ✅ Account creato! Sei loggato

**Professionista:**
- Devi essere collegato a un `professional` esistente
- Per ora, crea manualmente (vedi sotto)

---

## 📁 File Creati

```
Sistema Auth Completo:
├── scripts/
│   └── add-auth-system.sql           # Schema database
├── lib/
│   └── auth.ts                       # Utility auth (hash, session, user CRUD)
├── app/api/auth/
│   ├── signup/route.ts               # POST registrazione
│   ├── login/route.ts                # POST login
│   ├── logout/route.ts               # POST logout
│   └── me/route.ts                   # GET utente corrente
├── components/
│   └── AuthModal.tsx                 # Modal animato signup/login
├── contexts/
│   └── AuthContext.tsx               # Context React per auth globale
└── AUTH_SYSTEM.md                    # Questa documentazione
```

**File Modificati:**
- `app/layout.tsx` - Wrapped con `AuthProvider`
- `app/page.tsx` - Aggiunto bottone login/logout
- `app/dashboard/page.tsx` - Usa utente loggato invece di hardcoded ID

---

## 🎨 UI/UX Features

### AuthModal

**Animazioni:**
- ✨ FadeIn backdrop
- 🎯 ScaleIn modal (elastic bounce)
- 📥 SlideDown campi form (stagger)
- 🔔 Shake su errore
- ✅ Success animation con check verde

**Design:**
- Gradient top bar (teal→cyan→purple)
- Icone su ogni campo
- Toggle login ↔ signup fluido
- Form validazione client-side
- Loading states

**Campi Signup:**
- Nome completo *
- Email *
- Password * (min 6 caratteri)
- Telefono (opzionale)

**Campi Login:**
- Email *
- Password *

**Tempo compilazione:** ~30 secondi ⚡

---

## 🔄 Flow Autenticazione

### Signup (Cliente)

```typescript
POST /api/auth/signup
{
  "email": "mario@example.com",
  "password": "mypassword",
  "name": "Mario Rossi",
  "phone": "+39 333 1234567"  // opzionale
}
```

**Backend:**
1. Valida input (email, password ≥6 char, nome)
2. Hash password (SHA-256 + salt random)
3. Crea `customer` in tabella `customers`
4. Crea `user` con role='customer' e link a customer
5. Update `customers.user_id`
6. Crea `session` (7 giorni validità)
7. Imposta cookie `session_id` (httpOnly, secure in prod)
8. Ritorna user info

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "mario@example.com",
    "name": "Mario Rossi",
    "role": "customer"
  }
}
```

### Login

```typescript
POST /api/auth/login
{
  "email": "mario@example.com",
  "password": "mypassword"
}
```

**Backend:**
1. Trova user per email
2. Verifica password (hash + salt)
3. Crea nuova session
4. Imposta cookie
5. Update `last_login_at`
6. Ritorna user info

### Logout

```typescript
POST /api/auth/logout
```

**Backend:**
1. Ottieni `session_id` da cookie
2. Cancella session dal DB
3. Rimuovi cookie
4. Return success

### Check Auth

```typescript
GET /api/auth/me
```

**Backend:**
1. Ottieni `session_id` da cookie
2. Query session + user (JOIN)
3. Verifica non scaduta
4. Ritorna user info

**Response (se autenticato):**
```json
{
  "user": {
    "id": 1,
    "email": "mario@example.com",
    "name": "Mario Rossi",
    "role": "customer",
    "customer_id": 1,
    "professional_id": null,
    "email_verified": false
  }
}
```

**Response (se non autenticato):**
```json
{
  "error": "Non autenticato"
}
```
Status: 401

---

## 🗄️ Database Schema

### Tabella `users`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',  -- customer, professional, admin

  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  customer_id INTEGER REFERENCES customers(id),
  professional_id INTEGER REFERENCES professionals(id),

  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

**Constraint:**
- Se `role='customer'` → `customer_id` obbligatorio, `professional_id` NULL
- Se `role='professional'` → `professional_id` obbligatorio, `customer_id` NULL
- Se `role='admin'` → entrambi NULL

### Tabella `sessions`

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,  -- Random hex (64 char)
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  ip_address VARCHAR(45)
);
```

**Default expire:** 7 giorni

### Link Bidirezionali

```sql
-- customers ↔ users
ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id);

-- professionals ↔ users
ALTER TABLE professionals ADD COLUMN user_id INTEGER REFERENCES users(id);
```

---

## 🔒 Sicurezza

### Password Hashing

```typescript
// lib/auth.ts
import { randomBytes, createHash } from 'crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')  // 32 char hex
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return `${salt}:${hash}`  // Store: "salt:hash"
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  const testHash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return hash === testHash
}
```

**⚠️ Nota:** Per produzione, usa **bcrypt** invece di SHA-256:
```bash
npm install bcrypt
```

### Session Cookie

```typescript
cookies().set('session_id', sessionId, {
  httpOnly: true,        // Non accessibile da JS
  secure: true,          // Solo HTTPS (produzione)
  sameSite: 'lax',       // CSRF protection
  maxAge: 60*60*24*7,    // 7 giorni
  path: '/',
})
```

### SQL Injection Protection

✅ Tutte le query usano **parametri** (`$1`, `$2`, ...) non string concatenation

---

## 🎯 Uso in App

### AuthContext

```typescript
// Wrap app
<AuthProvider>
  {children}
</AuthProvider>

// Usa in componenti
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, logout, refreshUser } = useAuth()

  if (user) {
    return <div>Ciao {user.name}!</div>
  }

  return <div>Non autenticato</div>
}
```

### Homepage (page.tsx)

```typescript
const { user, logout } = useAuth()

{user ? (
  <div>
    <span>{user.name}</span>
    <button onClick={logout}>Logout</button>
  </div>
) : (
  <button onClick={() => setShowAuthModal(true)}>
    Accedi
  </button>
)}
```

### Dashboard (protetta)

```typescript
const { user, loading } = useAuth()
const router = useRouter()

useEffect(() => {
  if (!loading && (!user || user.role !== 'professional')) {
    router.push('/')  // Redirect se non professionista
  }
}, [user, loading])

// Usa user.professional_id per API calls
fetchBookings(user.professional_id)
```

---

## 🧪 Testing

### Test Manuale

**1. Registrazione Cliente**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+39 333 1234567"
  }'
```

**2. Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt  # Salva cookie
```

**3. Check Auth**
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt  # Usa cookie salvato
```

**4. Logout**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Verifica Database

```sql
-- Vedi utenti creati
SELECT id, email, name, role, created_at FROM users;

-- Vedi sessioni attive
SELECT s.id, u.email, s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id;

-- Vedi link customers
SELECT u.email, c.name
FROM users u
JOIN customers c ON u.customer_id = c.id;
```

---

## 🔮 Features Future

### Priorità Alta
1. **Email Verification** - Conferma email con token
2. **Password Reset** - Link via email (già tabella creata!)
3. **Bcrypt** - Sostituisci SHA-256 con bcrypt

### Priorità Media
4. **OAuth** - Login con Google/Facebook
5. **2FA** - Two-factor authentication
6. **Magic Link** - Login senza password

### Priorità Bassa
7. **Session Management** - Vedi tutte le sessioni, revoca
8. **Account Settings** - Cambia password, email, nome

---

## 🐛 Troubleshooting

### Email già registrata

**Errore:** `Questa email è già registrata`

**Soluzione:** Usa email diversa o fai login

```sql
-- Verifica email esistente
SELECT * FROM users WHERE email = 'test@example.com';
```

### Sessione scaduta

**Errore:** `Sessione non valida o scaduta`

**Soluzione:** Fai login di nuovo

```sql
-- Cancella sessioni scadute manualmente
DELETE FROM sessions WHERE expires_at < NOW();

-- O usa funzione
SELECT cleanup_expired_sessions();
```

### Cookie non impostato

**Problema:** Dopo login, non sei autenticato

**Causa:** Cookie non impostato (CORS, browser settings)

**Debug:**
1. Apri DevTools → Application → Cookies
2. Verifica presenza di `session_id`
3. Se manca, controlla console per errori CORS

**Fix:** Assicurati che frontend e backend siano stesso dominio in sviluppo

### Dashboard non accessibile

**Problema:** Dashboard redirect a homepage

**Causa:** User non è `role='professional'`

**Soluzione:** Crea account professional (vedi sotto)

---

## 👨‍🔧 Creare Utente Professional

### Manualmente (SQL)

```sql
-- 1. Scegli un professional esistente
SELECT id, name FROM professionals LIMIT 5;

-- 2. Crea user professional
INSERT INTO users (email, password_hash, role, name, phone, professional_id)
VALUES (
  'professionista@example.com',
  'salt:hash',  -- Usa hashPassword() in Node o genera con script
  'professional',
  'Marco Bianchi',
  '+39 333 9999999',
  1  -- ID del professional scelto
);

-- 3. Update professional.user_id
UPDATE professionals
SET user_id = (SELECT id FROM users WHERE email = 'professionista@example.com')
WHERE id = 1;
```

### Via Script (TODO)

Crea `scripts/create-professional-user.ts`:
```typescript
import { createProfessionalUser } from '@/lib/auth'

await createProfessionalUser({
  email: 'professionista@example.com',
  password: 'password123',
  professionalId: 1
})
```

---

## ✅ Checklist Pre-Produzione

- [ ] Sostituisci SHA-256 con **bcrypt**
- [ ] Configura variabili ambiente produzione
- [ ] Setup HTTPS (cookie secure)
- [ ] Configura cron per cleanup sessioni (ogni ora)
- [ ] Implementa email verification
- [ ] Implementa password reset
- [ ] Test sicurezza (SQL injection, XSS, CSRF)
- [ ] Rate limiting su API auth
- [ ] Log tentativi di login falliti
- [ ] Backup database regolare

---

**Sistema Auth Completo ✅**
**Versione:** 1.0.0
**Data:** ${new Date().toLocaleDateString('it-IT')}
