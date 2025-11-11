# 📅 Sistema di Prenotazioni e Affidabilità - RomaServizi

## Panoramica

Il sistema di booking implementa un modello simile a **MioDottore** con funzionalità di:
- ✅ Prenotazioni con conferma richiesta
- ⏰ Timeout automatico (2 ore)
- 📊 Scoring affidabilità professionisti
- 🔔 Sistema di notifiche
- ⭐ Recensioni e rating

---

## 🚀 Setup Iniziale

### 1. Esegui Script SQL

```bash
# Crea tabelle e funzioni nel database
psql -U postgres -d banta -f scripts/add-booking-system.sql
```

Questo crea:
- Tabelle: `bookings`, `customers`, `availability`, `blocked_slots`, `reliability_log`
- Colonne nuove in `professionals`: `reliability_score`, `status`, `total_bookings`, etc.
- Funzioni: `update_reliability_score()`, `cancel_unconfirmed_bookings()`
- Trigger automatici per aggiornamento statistiche

### 2. Configura Variabili d'Ambiente

Aggiungi a `.env.local`:

```bash
# URL pubblico dell'app (per link nelle email)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Secret per proteggere endpoint cron (genera con: openssl rand -base64 32)
CRON_SECRET=your-secret-here

# Email service (opzionale, per futuro)
# RESEND_API_KEY=re_xxx
# EMAIL_FROM=noreply@romaservizi.it
```

### 3. Configura Cron Job (Produzione)

Il sistema richiede un cron job per cancellare prenotazioni non confermate.

#### Opzione A: Vercel Cron Jobs (Raccomandato per Vercel)

Crea `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cancel-unconfirmed",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### Opzione B: Crontab Linux

```bash
# Aggiungi a crontab
*/15 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/cancel-unconfirmed
```

#### Opzione C: Servizi Esterni

Usa servizi come:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [GitHub Actions](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

Configura:
- URL: `https://your-domain.com/api/cron/cancel-unconfirmed?secret=YOUR_CRON_SECRET`
- Frequenza: Ogni 15 minuti
- Metodo: GET o POST

---

## 📊 Sistema di Affidabilità

### Punteggio (0-100)

| Punteggio | Status | Comportamento |
|-----------|--------|---------------|
| 90-100 | `premium` | Badge oro, priorità alta, auto-conferma |
| 60-89 | `verified` | Badge verde, posizione normale |
| 40-59 | `new` | Badge base, richiede conferma manuale |
| 0-39 | `suspended` | ⛔ Sospeso, non visibile |

### Modificatori Punteggio

| Azione | Punti | Note |
|--------|-------|------|
| ✅ Booking completato | +2 | Ogni successo |
| ❌ No-show | -20 | Penalità grave |
| 🚫 Cancellazione < 24h | -10 | Ultimo minuto |
| 🚫 Cancellazione > 24h | -5 | Con preavviso |
| ⏰ Timeout conferma | -5 | Non confermato in 2h |

### Soglie Status

- **new → verified**: 10+ booking completati + 90+ score
- **verified → premium**: 50+ booking completati + 95+ score
- **Qualsiasi → suspended**: Score < 40

---

## 🔄 Flusso Prenotazione

### 1. Cliente Prenota

```typescript
POST /api/bookings
{
  "professional_id": 1,
  "customer_name": "Mario Rossi",
  "customer_email": "mario@example.com",
  "customer_phone": "+39 333 1234567",
  "booking_date": "2024-03-15",
  "start_time": "10:00",
  "end_time": "11:00",
  "service_id": 5,
  "notes": "Riparazione urgente"
}
```

**Risposta:**
```json
{
  "id": 123,
  "status": "pending",
  "created_at": "2024-03-14T15:30:00Z"
}
```

**Sistema:**
- ✅ Verifica slot disponibile
- ✅ Crea/trova cliente
- ✅ Crea booking con status `pending`
- 📧 Invia email a professionista: "Conferma entro 2 ore"

### 2. Professionista Conferma

```typescript
POST /api/bookings/123/confirm
```

**Sistema:**
- ✅ Cambia status: `pending` → `confirmed`
- ✅ Incrementa `total_bookings`
- 📧 Invia conferma a cliente

### 3. Servizio Completato

```typescript
POST /api/bookings/123/complete
{
  "no_show": false
}
```

**Sistema:**
- ✅ Cambia status: `confirmed` → `completed`
- ✅ Incrementa `completed_bookings`
- ✅ +2 punti affidabilità
- 📧 Email a cliente: "Lascia una recensione"

### 4. Cliente Recensisce

```typescript
POST /api/bookings/123/review
{
  "rating": 5,
  "review": "Eccellente servizio, molto professionale!"
}
```

**Sistema:**
- ✅ Salva recensione
- ✅ Ricalcola rating medio professionista
- ✅ Aggiorna `review_count`

---

## 🛠️ API Endpoints

### Bookings

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/bookings?professional_id=1` | Lista booking professionista |
| GET | `/api/bookings?customer_id=1` | Lista booking cliente |
| POST | `/api/bookings` | Crea nuova prenotazione |
| POST | `/api/bookings/[id]/confirm` | Conferma prenotazione |
| POST | `/api/bookings/[id]/cancel` | Cancella prenotazione |
| POST | `/api/bookings/[id]/complete` | Completa prenotazione |
| POST | `/api/bookings/[id]/review` | Aggiungi recensione |

### Cron Jobs

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET/POST | `/api/cron/cancel-unconfirmed` | Cancella booking timeout |

---

## 🧪 Testing

### Test Sistema Timeout

```bash
# Installa ts-node se non l'hai
npm install -g ts-node

# Esegui test
ts-node scripts/test-timeout-system.ts
```

Questo script:
1. Crea booking backdated (3 ore fa)
2. Esegue `cancel_unconfirmed_bookings()`
3. Verifica cancellazione automatica
4. Mostra cambio reliability_score
5. Mostra log affidabilità

### Test Manuale API

```bash
# 1. Crea booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "professional_id": 1,
    "customer_name": "Test User",
    "customer_email": "test@example.com",
    "booking_date": "2024-03-20",
    "start_time": "10:00",
    "end_time": "11:00"
  }'

# 2. Conferma booking (sostituisci 123 con ID reale)
curl -X POST http://localhost:3000/api/bookings/123/confirm

# 3. Completa booking
curl -X POST http://localhost:3000/api/bookings/123/complete \
  -H "Content-Type: application/json" \
  -d '{"no_show": false}'

# 4. Aggiungi recensione
curl -X POST http://localhost:3000/api/bookings/123/review \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "review": "Ottimo servizio!"}'
```

---

## 📧 Sistema Notifiche

### Setup Email (Opzionale)

Il sistema supporta notifiche via email. Per attivarle:

#### Con Resend (Raccomandato)

1. Registrati su [resend.com](https://resend.com)
2. Ottieni API key
3. Aggiungi a `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxx
   ```
4. Installa: `npm install resend`
5. Modifica `lib/notifications.ts` per abilitare invio reale

#### Tipi di Notifiche

- 📧 Nuova prenotazione → Professionista (richiesta conferma)
- ✅ Conferma → Cliente
- ❌ Cancellazione → Entrambi
- ⏰ Timeout → Professionista (warning affidabilità)
- 🔔 Reminder 24h prima → Cliente

---

## 📈 Query Utili

### Professionisti per Affidabilità

```sql
SELECT
  name,
  status,
  reliability_score,
  total_bookings,
  completed_bookings,
  ROUND(completed_bookings::NUMERIC / NULLIF(total_bookings, 0) * 100, 2) as completion_rate
FROM professionals
ORDER BY reliability_score DESC, total_bookings DESC;
```

### Booking Pending da Confermare

```sql
SELECT
  b.id,
  p.name as professional,
  c.name as customer,
  b.booking_date,
  b.start_time,
  NOW() - b.created_at as pending_for
FROM bookings b
JOIN professionals p ON b.professional_id = p.id
JOIN customers c ON b.customer_id = c.id
WHERE b.status = 'pending'
ORDER BY b.created_at;
```

### Log Affidabilità Recente

```sql
SELECT
  p.name,
  rl.reason,
  rl.previous_score,
  rl.new_score,
  rl.score_change,
  rl.created_at
FROM reliability_log rl
JOIN professionals p ON rl.professional_id = p.id
ORDER BY rl.created_at DESC
LIMIT 20;
```

---

## 🎨 UI Components (Da Implementare)

### Per Clienti

- [ ] Calendario prenotazioni disponibili
- [ ] Form booking con validazione
- [ ] Lista "Le mie prenotazioni"
- [ ] Modal recensione post-servizio

### Per Professionisti

- [ ] Dashboard booking (pending/confirmed/completed)
- [ ] Bottone conferma/rifiuta
- [ ] Calendario disponibilità
- [ ] Badge affidabilità visibile
- [ ] Statistiche performance

### Pubbliche

- [ ] Badge su profili professionisti:
  - 🔰 Nuovo
  - ✅ Verificato (90%+)
  - ⭐ Top Rated (95%+)
- [ ] Tasso conferme pubblico
- [ ] Rating stelle + numero recensioni

---

## 🔐 Sicurezza

### Autenticazione

⚠️ **TODO**: Implementare autenticazione per:
- Dashboard professionisti (solo loro possono confermare)
- Dashboard clienti (solo loro possono recensire)
- Endpoint cron (usa `CRON_SECRET`)

### Validazioni

- ✅ Slot availability check
- ✅ Status transitions (pending → confirmed → completed)
- ✅ Rating 1-5
- ✅ Timeout 2 ore

---

## 📚 Prossimi Passi

1. **UI Implementation**
   - Calendario interattivo
   - Dashboard professionisti
   - Sistema recensioni

2. **Autenticazione**
   - NextAuth.js
   - Ruoli: customer, professional, admin

3. **Email Service**
   - Integrare Resend
   - Template email professionali

4. **Pagamenti** (Futuro)
   - Stripe Connect
   - Abbonamenti professionisti (€79-199/mese)

5. **Mobile App** (Futuro)
   - React Native
   - Push notifications

---

## 🐛 Troubleshooting

### Cron job non funziona

```bash
# Test manuale
curl http://localhost:3000/api/cron/cancel-unconfirmed?secret=YOUR_SECRET

# Verifica logs
tail -f /var/log/cron.log
```

### Reliability score non si aggiorna

```sql
-- Verifica trigger attivi
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_professional_stats';

-- Test manuale funzione
SELECT update_reliability_score(1, -10, 'test', NULL);
```

### Email non inviate

- Verifica `RESEND_API_KEY` in `.env.local`
- Controlla logs: `console.log` in `lib/notifications.ts`
- Testa con `curl` endpoint API

---

**Documentazione completa sistema booking ✅**

Per domande: team@romaservizi.it
