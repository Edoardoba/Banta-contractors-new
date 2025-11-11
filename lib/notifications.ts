/**
 * Sistema di Notifiche per RomaServizi
 *
 * TODO: Integrare con servizio email come:
 * - Resend (https://resend.com) - Raccomandato per Next.js
 * - SendGrid
 * - Amazon SES
 * - Mailgun
 *
 * Per ora, le notifiche vengono solo loggati.
 * Sostituire con chiamate API reali per produzione.
 */

import { Booking } from './bookings'
import { Professional } from './professionals'
import { Customer } from './customers'

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Invia notifica di nuova prenotazione al professionista
 */
export async function notifyProfessionalNewBooking(
  professional: Professional,
  booking: Booking,
  customer: Customer
): Promise<void> {
  const email: EmailTemplate = {
    to: professional.email || '',
    subject: '🔔 Nuova Prenotazione - Conferma Richiesta',
    text: `
Ciao ${professional.name},

Hai ricevuto una nuova richiesta di prenotazione!

Cliente: ${customer.name}
Data: ${booking.booking_date}
Orario: ${booking.start_time} - ${booking.end_time}
Note: ${booking.notes || 'Nessuna nota'}

⏰ IMPORTANTE: Devi confermare questa prenotazione entro 2 ore, altrimenti verrà cancellata automaticamente.

Conferma ora: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}

Grazie,
Il Team RomaServizi
    `.trim(),
    html: `
<h2>Nuova Prenotazione</h2>
<p>Ciao ${professional.name},</p>
<p>Hai ricevuto una nuova richiesta di prenotazione!</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <strong>Cliente:</strong> ${customer.name}<br>
  <strong>Data:</strong> ${booking.booking_date}<br>
  <strong>Orario:</strong> ${booking.start_time} - ${booking.end_time}<br>
  <strong>Note:</strong> ${booking.notes || 'Nessuna nota'}
</div>

<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
  <strong>⏰ IMPORTANTE:</strong> Devi confermare questa prenotazione entro 2 ore,
  altrimenti verrà cancellata automaticamente.
</div>

<a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}"
   style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
  Conferma Prenotazione
</a>

<p>Grazie,<br>Il Team RomaServizi</p>
    `.trim(),
  }

  await sendEmail(email)
  console.log('📧 Notifica inviata a professionista:', professional.email)
}

/**
 * Invia conferma al cliente
 */
export async function notifyCustomerBookingConfirmed(
  customer: Customer,
  booking: Booking,
  professional: Professional
): Promise<void> {
  const email: EmailTemplate = {
    to: customer.email,
    subject: '✅ Prenotazione Confermata',
    text: `
Ciao ${customer.name},

La tua prenotazione è stata confermata!

Professionista: ${professional.name}
Categoria: ${professional.category}
Data: ${booking.booking_date}
Orario: ${booking.start_time} - ${booking.end_time}
Indirizzo: ${professional.location_name}

Riceverai un promemoria 24 ore prima dell'appuntamento.

Grazie per aver scelto RomaServizi!
    `.trim(),
    html: `
<h2>✅ Prenotazione Confermata</h2>
<p>Ciao ${customer.name},</p>
<p>La tua prenotazione è stata confermata!</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <strong>Professionista:</strong> ${professional.name}<br>
  <strong>Categoria:</strong> ${professional.category}<br>
  <strong>Data:</strong> ${booking.booking_date}<br>
  <strong>Orario:</strong> ${booking.start_time} - ${booking.end_time}<br>
  <strong>Indirizzo:</strong> ${professional.location_name}
</div>

<p>Riceverai un promemoria 24 ore prima dell'appuntamento.</p>

<p>Grazie per aver scelto RomaServizi!</p>
    `.trim(),
  }

  await sendEmail(email)
  console.log('📧 Conferma inviata a cliente:', customer.email)
}

/**
 * Invia notifica di cancellazione
 */
export async function notifyBookingCancelled(
  recipient: Customer | Professional,
  booking: Booking,
  cancelledBy: string
): Promise<void> {
  const email: EmailTemplate = {
    to: recipient.email,
    subject: '❌ Prenotazione Cancellata',
    text: `
La prenotazione per ${booking.booking_date} alle ${booking.start_time} è stata cancellata.

Motivo: ${booking.cancellation_reason || 'Non specificato'}
Cancellata da: ${cancelledBy}

Se hai domande, contattaci.

Il Team RomaServizi
    `.trim(),
    html: `
<h2>❌ Prenotazione Cancellata</h2>
<p>La prenotazione per <strong>${booking.booking_date}</strong> alle <strong>${booking.start_time}</strong> è stata cancellata.</p>

<div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
  <strong>Motivo:</strong> ${booking.cancellation_reason || 'Non specificato'}<br>
  <strong>Cancellata da:</strong> ${cancelledBy}
</div>

<p>Se hai domande, contattaci.</p>
<p>Il Team RomaServizi</p>
    `.trim(),
  }

  await sendEmail(email)
  console.log('📧 Notifica cancellazione inviata a:', recipient.email)
}

/**
 * Reminder 24 ore prima
 */
export async function sendBookingReminder(
  customer: Customer,
  booking: Booking,
  professional: Professional
): Promise<void> {
  const email: EmailTemplate = {
    to: customer.email,
    subject: '⏰ Promemoria: Appuntamento Domani',
    text: `
Ciao ${customer.name},

Ti ricordiamo che domani hai un appuntamento:

Professionista: ${professional.name}
Data: ${booking.booking_date}
Orario: ${booking.start_time} - ${booking.end_time}
Indirizzo: ${professional.location_name}

Se non puoi presentarti, cancella la prenotazione il prima possibile.

Ci vediamo domani!
Il Team RomaServizi
    `.trim(),
    html: `
<h2>⏰ Promemoria Appuntamento</h2>
<p>Ciao ${customer.name},</p>
<p>Ti ricordiamo che <strong>domani</strong> hai un appuntamento:</p>

<div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
  <strong>Professionista:</strong> ${professional.name}<br>
  <strong>Data:</strong> ${booking.booking_date}<br>
  <strong>Orario:</strong> ${booking.start_time} - ${booking.end_time}<br>
  <strong>Indirizzo:</strong> ${professional.location_name}
</div>

<p>Se non puoi presentarti, cancella la prenotazione il prima possibile.</p>

<p>Ci vediamo domani!<br>Il Team RomaServizi</p>
    `.trim(),
  }

  await sendEmail(email)
  console.log('📧 Reminder inviato a:', customer.email)
}

/**
 * Funzione base per inviare email
 * TODO: Sostituire con servizio email reale
 */
async function sendEmail(email: EmailTemplate): Promise<void> {
  // PLACEHOLDER: Sostituire con chiamata API reale

  // Esempio con Resend:
  /*
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'RomaServizi <noreply@romaservizi.it>',
    to: email.to,
    subject: email.subject,
    html: email.html,
  })
  */

  // Per ora solo log
  console.log('📧 Email da inviare:', {
    to: email.to,
    subject: email.subject,
  })

  // In development, puoi usare console.log per vedere l'email
  if (process.env.NODE_ENV === 'development') {
    console.log('--- EMAIL CONTENT ---')
    console.log('To:', email.to)
    console.log('Subject:', email.subject)
    console.log('---')
    console.log(email.text)
    console.log('--- END EMAIL ---')
  }
}

/**
 * Notifica professionista quando booking cancellato per timeout
 */
export async function notifyProfessionalTimeoutCancellation(
  professional: Professional,
  booking: Booking
): Promise<void> {
  const email: EmailTemplate = {
    to: professional.email || '',
    subject: '⚠️ Prenotazione Cancellata - Timeout Conferma',
    text: `
Ciao ${professional.name},

La prenotazione per ${booking.booking_date} alle ${booking.start_time} è stata cancellata automaticamente perché non l'hai confermata entro 2 ore.

⚠️ ATTENZIONE: Questo impatta il tuo punteggio di affidabilità (-5 punti).

Per evitare cancellazioni automatiche in futuro:
1. Abilita le notifiche push
2. Controlla la dashboard regolarmente
3. Attiva l'auto-conferma (disponibile per professionisti verificati)

Il Team RomaServizi
    `.trim(),
    html: `
<h2>⚠️ Prenotazione Cancellata</h2>
<p>Ciao ${professional.name},</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
  <p>La prenotazione per <strong>${booking.booking_date}</strong> alle <strong>${booking.start_time}</strong>
  è stata cancellata automaticamente perché non l'hai confermata entro 2 ore.</p>
</div>

<div style="background: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
  <strong>⚠️ ATTENZIONE:</strong> Questo impatta il tuo punteggio di affidabilità (-5 punti).
</div>

<h3>Per evitare cancellazioni automatiche in futuro:</h3>
<ol>
  <li>Abilita le notifiche push</li>
  <li>Controlla la dashboard regolarmente</li>
  <li>Attiva l'auto-conferma (disponibile per professionisti verificati)</li>
</ol>

<p>Il Team RomaServizi</p>
    `.trim(),
  }

  await sendEmail(email)
  console.log('📧 Notifica timeout inviata a professionista:', professional.email)
}
