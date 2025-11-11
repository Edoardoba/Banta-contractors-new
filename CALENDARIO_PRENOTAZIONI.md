# 📅 Sistema Calendario e Prenotazioni - Guida Completa

## 🎯 Panoramica

Hai ora un sistema completo di prenotazione con calendario interattivo che permette ai clienti di:
1. Selezionare un servizio
2. Vedere il calendario con date disponibili
3. Scegliere un orario tra gli slot disponibili
4. Compilare i dati personali
5. Inviare la richiesta di prenotazione

---

## 🚀 Setup Rapido

### 1. Esegui Database Scripts

```bash
# 1. Crea tabelle sistema booking (se non fatto prima)
psql -U postgres -d banta -f scripts/add-booking-system.sql

# 2. Popola disponibilità professionisti
psql -U postgres -d banta -f scripts/populate-availability.sql
```

Questo aggiunge:
- **Lun-Ven**: 9:00-18:00 (slot da 60 min)
- **Sabato**: 9:00-13:00 (slot da 60 min)
- Tutti i professionisti hanno questa disponibilità di default

### 2. Avvia Applicazione

```bash
npm run dev
```

### 3. Testa il Flow

1. Apri `http://localhost:3000`
2. Clicca "Mostra Servizi" su un professionista
3. Clicca "Prenota" su un servizio
4. Seleziona data nel calendario
5. Scegli orario
6. Compila dati personali
7. Conferma prenotazione!

---

## 📁 File Creati

### Componenti UI
```
components/
├── BookingCalendar.tsx       # Calendario interattivo con slot orari
├── BookingModal.tsx           # Modal completo (calendario + form)
├── ServicesPopup.tsx          # Modificato per includere bottone "Prenota"
└── ReliabilityBadge.tsx       # (già esistente)
```

### API
```
app/api/
├── availability/
│   └── slots/route.ts         # GET slot disponibili per data
├── bookings/
│   └── route.ts               # POST nuova prenotazione
└── ...
```

### Scripts
```
scripts/
├── add-booking-system.sql     # Schema completo
└── populate-availability.sql  # Dati disponibilità esempio
```

---

## 🔄 Flow Completo

### 1. Utente Clicca "Mostra Servizi"

```typescript
// app/page.tsx
handleShowServices(professional) →
  fetch('/api/services?professional_id=X') →
  Mostra ServicesPopup
```

### 2. Utente Clicca "Prenota" su Servizio

```typescript
// components/ServicesPopup.tsx
onBookService(service) →
  Chiude ServicesPopup →
  Apre BookingModal con service selezionato
```

### 3. Utente Seleziona Data

```typescript
// components/BookingCalendar.tsx
handleDateClick(date) →
  fetch('/api/availability/slots?professional_id=X&date=Y&duration=Z') →
  Mostra slot disponibili per quella data
```

**Backend (API):**
```typescript
// app/api/availability/slots/route.ts
1. Trova availability per giorno settimana
2. Genera slot (es: 9:00, 10:00, 11:00, ...)
3. Controlla blocked_slots
4. Controlla booking esistenti
5. Controlla se slot è nel passato
6. Ritorna array: [{ time: "09:00", available: true }, ...]
```

### 4. Utente Seleziona Orario

```typescript
// components/BookingCalendar.tsx
handleTimeClick(time) →
  onSelectSlot(date, time) →
  BookingModal passa a step "details"
```

### 5. Utente Compila Form

```typescript
// components/BookingModal.tsx
Form fields:
- Nome e Cognome *
- Email *
- Telefono (opzionale)
- Note (opzionale)
```

### 6. Conferma Prenotazione

```typescript
// components/BookingModal.tsx
handleSubmit() →
  fetch('/api/bookings', {
    method: 'POST',
    body: {
      professional_id,
      service_id,
      booking_date,
      start_time,
      end_time,  // calcolato automaticamente
      customer_name,
      customer_email,
      customer_phone,
      notes
    }
  }) →
  BookingModal mostra step "success" con ID prenotazione
```

**Backend (API):**
```typescript
// app/api/bookings/route.ts
1. Valida input
2. Verifica slot disponibile (isSlotAvailable)
3. Crea/trova customer per email
4. Crea booking (status: "pending")
5. Trigger automatico aggiorna total_bookings
6. Ritorna booking creato
```

---

## 🎨 Componenti UI

### BookingCalendar

**Props:**
```typescript
{
  professionalId: number
  serviceId?: number
  serviceName?: string
  serviceDuration?: number  // default: 60 min
  onSelectSlot: (date: string, time: string) => void
}
```

**Features:**
- Calendario mensile navigabile
- Date passate disabilitate
- Data di oggi evidenziata con ring
- Click su data → carica slot
- Slot disponibili vs non disponibili (colorati)
- Loading state
- Responsive

### BookingModal

**Props:**
```typescript
{
  isOpen: boolean
  onClose: () => void
  professional: Professional
  service?: Service
}
```

**Steps:**
1. **calendar**: Mostra BookingCalendar
2. **details**: Form dati cliente + riepilogo
3. **success**: Conferma con ID booking e istruzioni

**Features:**
- Multi-step wizard
- Validazione form (nome, email)
- Riepilogo prenotazione
- Loading state durante submit
- Gestione errori
- Success message con dettagli

---

## 🔧 API Availability Slots

### GET /api/availability/slots

**Query Parameters:**
```
professional_id: number (required)
date: YYYY-MM-DD (required)
duration: number (optional, default: 60)
```

**Response:**
```json
[
  { "time": "09:00", "available": true },
  { "time": "10:00", "available": false },  // già prenotato
  { "time": "11:00", "available": true },
  ...
]
```

**Logica:**

1. **Trova availability per giorno settimana**
   ```sql
   SELECT start_time, end_time, slot_duration
   FROM availability
   WHERE professional_id = X AND day_of_week = Y AND is_active = true
   ```

2. **Genera slot**
   ```typescript
   // Es: 9:00-18:00, slot 60 min
   ["09:00", "10:00", "11:00", ..., "17:00"]
   ```

3. **Filtra slot non disponibili:**
   - ❌ Slot bloccati (blocked_slots)
   - ❌ Slot già prenotati (bookings con status pending/confirmed)
   - ❌ Slot nel passato (solo per oggi)

4. **Ritorna slot con flag available**

---

## 📊 Gestione Disponibilità

### Tabella `availability`

```sql
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=Dom, 1=Lun, ..., 6=Sab
  start_time TIME NOT NULL,       -- Es: 09:00
  end_time TIME NOT NULL,         -- Es: 18:00
  slot_duration INTEGER,          -- Minuti (default: 60)
  is_active BOOLEAN DEFAULT true
)
```

**Esempio: Professionista lavora Lun-Ven 9-18**
```sql
INSERT INTO availability (professional_id, day_of_week, start_time, end_time, slot_duration)
VALUES
  (1, 1, '09:00', '18:00', 60),  -- Lunedì
  (1, 2, '09:00', '18:00', 60),  -- Martedì
  ...
  (1, 5, '09:00', '18:00', 60);  -- Venerdì
```

### Tabella `blocked_slots`

Per bloccare giorni specifici (ferie, malattia, etc.):

```sql
-- Blocca intero giorno
INSERT INTO blocked_slots (professional_id, blocked_date, start_time, end_time, reason)
VALUES (1, '2024-12-25', NULL, NULL, 'Natale');

-- Blocca solo alcune ore
INSERT INTO blocked_slots (professional_id, blocked_date, start_time, end_time, reason)
VALUES (1, '2024-03-15', '14:00', '16:00', 'Appuntamento personale');
```

---

## ⚙️ Configurazione Disponibilità

### Script SQL Personalizzato

Modifica `scripts/populate-availability.sql`:

```sql
-- Esempio: Solo alcuni professionisti lavorano sabato
INSERT INTO availability (professional_id, day_of_week, start_time, end_time)
SELECT p.id, 6, '09:00', '13:00'
FROM professionals p
WHERE p.category IN ('Idraulico', 'Elettricista');  -- Solo queste categorie

-- Esempio: Orari diversi per categoria
INSERT INTO availability (professional_id, day_of_week, start_time, end_time)
SELECT p.id, generate_series(1, 5), '08:00', '20:00'
FROM professionals p
WHERE p.category = 'Babysitter';  -- Orari più estesi
```

### Dashboard Professionisti (Futuro)

Permetti ai professionisti di gestire la loro availability:

```typescript
// Dashboard futura
- Abilita/disabilita giorni
- Modifica orari
- Blocca date specifiche
- Cambia durata slot
```

---

## 🧪 Testing

### Test Manuale Completo

1. **Setup database**
   ```bash
   psql -U postgres -d banta -f scripts/add-booking-system.sql
   psql -U postgres -d banta -f scripts/populate-availability.sql
   ```

2. **Test calendario**
   - Apri app
   - Clicca "Mostra Servizi" su un professionista
   - Clicca "Prenota" su un servizio
   - ✅ Calendario si apre
   - ✅ Date passate sono disabilitate
   - ✅ Oggi ha un ring evidenziato

3. **Test slot**
   - Clicca su una data futura (es: domani)
   - ✅ Mostra slot orari
   - ✅ Slot hanno colori diversi (disponibili vs non disponibili)
   - ✅ Mostra legenda

4. **Test prenotazione**
   - Clicca su uno slot disponibile
   - ✅ Form appare con riepilogo
   - ✅ Dati prenotazione visibili
   - Compila nome ed email
   - ✅ Validazione funziona (campi obbligatori)
   - Clicca "Conferma"
   - ✅ Success message con ID booking

5. **Verifica database**
   ```sql
   SELECT * FROM bookings ORDER BY id DESC LIMIT 1;
   SELECT * FROM customers ORDER BY id DESC LIMIT 1;
   ```

### Test Scenari Specifici

**Scenario 1: Slot già prenotato**
```sql
-- Crea booking manuale
INSERT INTO bookings (professional_id, customer_id, booking_date, start_time, end_time, status)
VALUES (1, 1, CURRENT_DATE + 1, '10:00', '11:00', 'confirmed');
```
✅ Slot 10:00 domani dovrebbe essere non disponibile

**Scenario 2: Giorno bloccato**
```sql
INSERT INTO blocked_slots (professional_id, blocked_date)
VALUES (1, CURRENT_DATE + 2, NULL, NULL, 'Ferie');
```
✅ Nessuno slot disponibile per quel giorno

**Scenario 3: Slot nel passato**
- Apri calendario per oggi
- ✅ Slot prima dell'ora corrente non disponibili

---

## 🎨 Personalizzazione UI

### Colori & Stile

```typescript
// components/BookingCalendar.tsx

// Data selezionata
className="bg-teal-500 text-white"

// Data oggi
className="ring-2 ring-teal-500"

// Slot disponibile
className="border-2 border-teal-200 text-teal-700 hover:bg-teal-50"

// Slot non disponibile
className="bg-gray-100 text-gray-400"
```

### Cambia Durata Slot

```typescript
// components/BookingCalendar.tsx
serviceDuration={30}  // 30 minuti invece di 60

// Oppure prendi da service
serviceDuration={service?.duration_minutes || 60}
```

### Traduzioni

Tutte le stringhe sono in italiano:
```typescript
// Mesi
const monthNames = ['Gennaio', 'Febbraio', ...]

// Giorni
const dayNames = ['Dom', 'Lun', 'Mar', ...]

// Messaggi
"Seleziona una data per vedere gli orari disponibili"
"Nessun orario disponibile per questa data"
```

---

## 🔮 Prossime Features

### Priorità Alta

1. **Email Notifiche**
   - Conferma prenotazione al cliente
   - Richiesta conferma al professionista
   - Reminder 24h prima

2. **Dashboard Professionista - Availability**
   - Gestione orari settimanali
   - Blocco date specifiche
   - Visualizzazione calendario personale

### Priorità Media

3. **Prenotazioni Ricorrenti**
   - Prenota stesso slot per N settimane
   - Es: babysitter ogni martedì 15:00

4. **Lista d'Attesa**
   - Se slot pieno, metti in lista d'attesa
   - Notifica se si libera

5. **Modifica Prenotazione**
   - Cliente può modificare (fino a 24h prima)
   - Professionista può proporre cambio orario

### Priorità Bassa

6. **Integrazione Calendario Esterno**
   - Sincronizza con Google Calendar
   - Sincronizza con Outlook
   - iCal export

7. **Video Chiamate**
   - Per servizi remoti (es: consulenze)
   - Integrazione Zoom/Meet

---

## 📚 Documentazione Correlata

- `BOOKING_SYSTEM.md` - Sistema prenotazioni completo
- `IMPLEMENTAZIONE_COMPLETATA.md` - Riepilogo generale
- `README.md` - Documentazione progetto

---

## 🐛 Troubleshooting

### Calendario non mostra slot

**Problema:** Clicco su data ma nessuno slot appare

**Soluzione:**
```bash
# Verifica availability popolata
psql -U postgres -d banta -c "SELECT COUNT(*) FROM availability;"

# Se 0, popola:
psql -U postgres -d banta -f scripts/populate-availability.sql
```

### Slot sempre non disponibili

**Problema:** Tutti gli slot sono grigi

**Controlli:**
```sql
-- 1. Controlla availability per quel giorno
SELECT * FROM availability WHERE professional_id = 1 AND day_of_week = 1;

-- 2. Controlla blocked_slots
SELECT * FROM blocked_slots WHERE professional_id = 1 AND blocked_date = '2024-03-15';

-- 3. Controlla booking esistenti
SELECT * FROM bookings WHERE professional_id = 1 AND booking_date = '2024-03-15';
```

### Errore "Slot non disponibile"

**Problema:** Prenotazione fallisce con errore slot non disponibile

**Causa:** Qualcun altro ha prenotato mentre stavi compilando il form

**Soluzione:** Sistema già implementato - utente vede errore e può riprovare

### API /api/availability/slots ritorna []

**Debug:**
```bash
# Test diretto API
curl "http://localhost:3000/api/availability/slots?professional_id=1&date=2024-03-20&duration=60"

# Controlla logs
npm run dev
# Guarda console per errori SQL
```

---

## ✅ Checklist Pre-Produzione

- [ ] Database migrations eseguite
- [ ] Availability popolata per tutti i professionisti
- [ ] Testato flow completo (calendario → slot → form → conferma)
- [ ] Validazione form funziona
- [ ] Errori gestiti gracefully
- [ ] Email notifications configurate (opzionale)
- [ ] Cron job configurato per timeout
- [ ] Autenticazione implementata (opzionale per MVP)
- [ ] Test su mobile/tablet
- [ ] Performance API < 500ms

---

**Implementato:** ✅ Sistema calendario completo
**Data:** ${new Date().toLocaleDateString('it-IT')}
**Versione:** 1.0.0
