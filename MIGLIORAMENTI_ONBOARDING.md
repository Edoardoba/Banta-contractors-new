# Miglioramenti Sistema Onboarding Professionisti

## Nuove Features Implementate

### 1. Upload Immagine Profilo

**Problema precedente:** Il professionista doveva inserire un URL esterno per la foto profilo.

**Soluzione:** Upload diretto dell'immagine durante la registrazione.

#### Implementazione

**API Upload:** `/api/upload/professional-image`
- Metodo: POST
- Input: multipart/form-data con campo "image"
- Validazioni:
  - Tipi supportati: JPG, PNG, WebP
  - Dimensione massima: 5MB
- Output: `{ success: true, url: "/uploads/professionals/filename.jpg" }`
- Storage: `public/uploads/professionals/`

**UI Step 2:**
- Input file con accept="image/*"
- Preview immediata dell'immagine selezionata
- Upload automatico al server quando l'utente seleziona il file
- Indicatore loading durante upload
- Gestione errori con messaggi user-friendly

**Codice rilevante:**
```typescript
// components/ProfessionalOnboarding.tsx
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // Validazione client-side
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    setError('Tipo file non supportato. Usa JPG, PNG o WebP')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    setError('File troppo grande. Massimo 5MB')
    return
  }

  // Upload
  const formData = new FormData()
  formData.append('image', file)
  const response = await fetch('/api/upload/professional-image', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  updateData('image_url', result.url)
}
```

**File creati:**
- `app/api/upload/professional-image/route.ts`
- `public/uploads/professionals/` (directory)

---

### 2. Intervalli Orari Multipli per Giorno

**Problema precedente:** Un professionista poteva impostare solo 1 intervallo orario per giorno (es: Lunedì 9-18).

**Soluzione:** Supporto per intervalli multipli non consecutivi per lo stesso giorno (es: Lunedì 9-12 e 16-18).

#### Implementazione

**Database Schema:**
Lo schema esistente supporta già questa feature! Non c'è constraint UNIQUE su `(professional_id, day_of_week)`, quindi possiamo inserire N righe per lo stesso giorno.

```sql
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ...
);

-- Esempio dati:
-- Lunedì 9-12:  (id=1, day_of_week=1, start_time='09:00', end_time='12:00')
-- Lunedì 16-18: (id=2, day_of_week=1, start_time='16:00', end_time='18:00')
```

**UI Step 4:**
- Per ogni giorno selezionato, mostra lista di slot orari
- Ogni slot ha:
  - Input start_time
  - Input end_time
  - Bottone "Rimuovi" (visibile solo se ci sono 2+ slot)
- Bottone "+ Aggiungi intervallo" per aggiungere slot al giorno
- Counter che mostra numero slot per giorno
- Suggerimento visibile che spiega la feature

**Funzioni helper:**
```typescript
// Aggiungi nuovo slot per un giorno
const addTimeSlot = (dayOfWeek: number) => {
  setData((prev) => ({
    ...prev,
    availability: [
      ...prev.availability,
      { day_of_week: dayOfWeek, start_time: '09:00', end_time: '18:00' },
    ],
  }))
}

// Rimuovi slot specifico
const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
  const slotsForDay = data.availability.filter((a) => a.day_of_week === dayOfWeek)
  if (slotsForDay.length === 1) {
    // Se è l'ultimo slot, disabilita il giorno
    return toggleAvailability(dayOfWeek)
  }
  // Altrimenti rimuovi solo lo slot specifico
  const slotToRemove = slotsForDay[slotIndex]
  // ... remove logic
}

// Aggiorna slot specifico
const updateTimeSlot = (
  dayOfWeek: number,
  slotIndex: number,
  field: 'start_time' | 'end_time',
  value: string
) => {
  // ... update logic
}
```

**API Onboarding:**
Nessuna modifica necessaria! L'API già fa loop su tutti gli elementi dell'array availability:

```typescript
// app/api/professionals/onboarding/route.ts
for (const avail of availability) {
  await client.query(
    `INSERT INTO availability (
      professional_id, day_of_week, start_time, end_time, slot_duration, is_active
    ) VALUES ($1, $2, $3, $4, 60, true)`,
    [professionalId, avail.day_of_week, avail.start_time, avail.end_time]
  )
}
```

Se l'utente crea 2 slot per Lunedì, l'array conterrà:
```json
[
  { "day_of_week": 1, "start_time": "09:00", "end_time": "12:00" },
  { "day_of_week": 1, "start_time": "16:00", "end_time": "18:00" }
]
```

E verranno inserite 2 righe separate nel database.

---

## Esempio Flusso Completo

### Test Case: Professionista con intervalli multipli e foto

1. **Step 1 - Dati Personali:**
   - Nome: "Mario Rossi"
   - Email: "mario.idraulico@example.com"
   - Password: "test123"
   - Telefono: "+39 333 1234567"

2. **Step 2 - Dati Professionali:**
   - Categoria: "Idraulico"
   - Descrizione: "Idraulico con 10 anni di esperienza"
   - Indirizzo: "Via Roma 123, 00100 Roma RM"
   - **Foto:** Seleziona file `mario.jpg` → Upload automatico → Preview mostrata

3. **Step 3 - Servizi:**
   - Servizio 1: "Riparazione perdite" - €50 - 60 min
   - Click "+ Aggiungi Servizio"
   - Servizio 2: "Installazione sanitari" - €80 - 90 min

4. **Step 4 - Disponibilità:**
   - **Lunedì:** ✓ Attivo
     - Slot 1: 09:00 - 12:00
     - Click "+ Aggiungi intervallo"
     - Slot 2: 16:00 - 18:00
   - **Martedì:** ✓ Attivo
     - Slot 1: 09:00 - 18:00 (orario continuato)
   - **Mercoledì:** ✓ Attivo
     - Slot 1: 09:00 - 13:00
     - Click "+ Aggiungi intervallo"
     - Slot 2: 15:00 - 19:00

5. **Submit:**
   - Click "Completa Registrazione"
   - Backend crea:
     - 1 professional
     - 2 services
     - 5 availability records (Lun: 2, Mar: 1, Mer: 2)
     - 1 user
     - 1 session
   - Auto-login → Redirect a /dashboard

---

## Database Records Creati

### professionals
```sql
id | name        | category   | image_url                                    | ...
1  | Mario Rossi | Idraulico  | /uploads/professionals/1234567-abc123.jpg   | ...
```

### services
```sql
id | professional_id | name                   | price | duration_minutes
1  | 1              | Riparazione perdite    | 50    | 60
2  | 1              | Installazione sanitari | 80    | 90
```

### availability
```sql
id | professional_id | day_of_week | start_time | end_time
1  | 1              | 1           | 09:00      | 12:00
2  | 1              | 1           | 16:00      | 18:00
3  | 1              | 2           | 09:00      | 18:00
4  | 1              | 3           | 09:00      | 13:00
5  | 1              | 3           | 15:00      | 19:00
```

### users
```sql
id | email                       | role         | professional_id
1  | mario.idraulico@example.com | professional | 1
```

---

## File Modificati

### Nuovi File:
1. `app/api/upload/professional-image/route.ts` - API upload immagini
2. `public/uploads/professionals/` - Directory storage immagini

### File Modificati:
1. `components/ProfessionalOnboarding.tsx`
   - Aggiunta funzione `handleImageUpload`
   - Modificata UI Step 2 (input file con preview)
   - Modificate funzioni `toggleAvailability`, `addTimeSlot`, `removeTimeSlot`, `updateTimeSlot`
   - Modificata UI Step 4 (multipli slot per giorno)

---

## UX Improvements

### Upload Immagine:
- ✅ Preview immediata dell'immagine
- ✅ Upload automatico (non serve aspettare submit finale)
- ✅ Indicatore loading
- ✅ Validazione client-side prima di upload
- ✅ Messaggi errore chiari
- ✅ Stile bottone file input personalizzato

### Intervalli Multipli:
- ✅ Counter slot per giorno ("2 intervalli")
- ✅ Bottone "+ Aggiungi intervallo" intuitivo
- ✅ Bottone "Rimuovi" per ogni slot (eccetto se è l'unico)
- ✅ Suggerimento visibile con esempio
- ✅ Design consistente con resto del form

---

## Testing

### Test Upload Immagine:

```bash
# 1. Seleziona immagine valida (JPG, PNG, WebP < 5MB)
# → Dovrebbe mostrare preview e uploadare

# 2. Seleziona file non-immagine (es: PDF)
# → Dovrebbe mostrare errore "Tipo file non supportato"

# 3. Seleziona immagine > 5MB
# → Dovrebbe mostrare errore "File troppo grande"

# 4. Verifica file salvato
ls public/uploads/professionals/
# → Dovrebbe esistere file con nome timestamp-random.jpg
```

### Test Intervalli Multipli:

```bash
# 1. Seleziona Lunedì → Dovrebbe mostrare 1 slot default (9-18)
# 2. Click "+ Aggiungi intervallo" → Dovrebbe aggiungere secondo slot
# 3. Modifica orari del secondo slot (es: 16-18)
# 4. Click "Rimuovi" su primo slot → Dovrebbe rimuovere solo quello
# 5. Se rimane 1 solo slot, "Rimuovi" non dovrebbe essere visibile
# 6. Deseleziona checkbox Lunedì → Dovrebbe rimuovere tutti gli slot

# Dopo submit, verifica database:
SELECT * FROM availability WHERE professional_id = [ID];
# → Dovrebbe mostrare tutte le righe con intervalli corretti
```

---

## Produzione Checklist

Prima di andare in produzione:

### Upload Immagine:
- [ ] Considera storage cloud (AWS S3, Cloudinary, etc.) invece di filesystem locale
- [ ] Aggiungi resize/compressione immagini (es: Sharp library)
- [ ] Aggiungi backup automatico delle immagini
- [ ] Configura CDN per servire immagini
- [ ] Implementa pulizia immagini orfane (professionisti cancellati)

### Intervalli Multipli:
- [ ] Aggiungi validazione sovrapposizione slot (es: 9-12 e 11-14 → errore)
- [ ] Considera limite massimo slot per giorno (es: max 5 intervalli)
- [ ] Testa edge case (slot mezzanotte, slot cross-day)
- [ ] Aggiungi conferma prima di rimuovere ultimo slot di un giorno

---

## Benefici Business

### Upload Immagine:
- **Conversione migliorata:** Professionisti non devono cercare URL esterno
- **Qualità profilo:** Controllo su formato/dimensione immagini
- **Trust:** Immagini hostate sul tuo dominio
- **GDPR:** Controllo completo sui dati

### Intervalli Multipli:
- **Flessibilità:** Professionisti possono gestire pausa pranzo, impegni personali
- **Accuratezza:** Calendario riflette vera disponibilità
- **Meno cancellazioni:** Slot realistici riducono no-show
- **UX clienti:** Vedono slot effettivamente disponibili

---

## Documentazione Aggiuntiva

- Per dettagli completi onboarding: `PROFESSIONAL_ONBOARDING.md`
- Per sistema autenticazione: `AUTH_SYSTEM.md`
- Per sistema prenotazioni: `BOOKING_SYSTEM.md`
- Per calendario: `CALENDARIO_PRENOTAZIONI.md`
