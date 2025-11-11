import pool from '../lib/db'

interface Service {
  professional_id: number
  name: string
  description?: string
  price: number
  duration_minutes?: number
}

const servicesData: Service[] = [
  // Services for professional ID 1 (assuming first professional)
  {
    professional_id: 1,
    name: 'Consulenza Legale Base',
    description: 'Consulenza legale di base su questioni generali',
    price: 80.00,
    duration_minutes: 60,
  },
  {
    professional_id: 1,
    name: 'Consulenza Legale Avanzata',
    description: 'Consulenza legale approfondita con analisi documentale',
    price: 150.00,
    duration_minutes: 120,
  },
  {
    professional_id: 1,
    name: 'Redazione Contratto',
    description: 'Redazione e revisione di contratti commerciali',
    price: 200.00,
    duration_minutes: 180,
  },
  // Services for professional ID 2
  {
    professional_id: 2,
    name: 'Lezione di Inglese Base',
    description: 'Lezione individuale di inglese livello base',
    price: 30.00,
    duration_minutes: 60,
  },
  {
    professional_id: 2,
    name: 'Lezione di Inglese Avanzato',
    description: 'Lezione individuale di inglese livello avanzato',
    price: 40.00,
    duration_minutes: 60,
  },
  {
    professional_id: 2,
    name: 'Preparazione Esame IELTS',
    description: 'Corso intensivo di preparazione per esame IELTS',
    price: 350.00,
    duration_minutes: 600,
  },
  // Services for professional ID 3
  {
    professional_id: 3,
    name: 'Sessione di Yoga Individuale',
    description: 'Lezione privata di yoga personalizzata',
    price: 50.00,
    duration_minutes: 60,
  },
  {
    professional_id: 3,
    name: 'Sessione di Yoga di Gruppo',
    description: 'Lezione di yoga in gruppo (max 10 persone)',
    price: 15.00,
    duration_minutes: 60,
  },
  {
    professional_id: 3,
    name: 'Pacchetto Mensile Yoga',
    description: 'Pacchetto di 8 lezioni di yoga',
    price: 100.00,
    duration_minutes: 480,
  },
  // Services for professional ID 4
  {
    professional_id: 4,
    name: 'Riparazione PC Base',
    description: 'Diagnosi e riparazione problemi comuni PC',
    price: 40.00,
    duration_minutes: 60,
  },
  {
    professional_id: 4,
    name: 'Installazione Software',
    description: 'Installazione e configurazione software',
    price: 30.00,
    duration_minutes: 45,
  },
  {
    professional_id: 4,
    name: 'Assistenza Remota',
    description: 'Assistenza tecnica remota via TeamViewer',
    price: 25.00,
    duration_minutes: 30,
  },
  // Services for professional ID 5
  {
    professional_id: 5,
    name: 'Taglio Capelli Uomo',
    description: 'Taglio capelli moderno per uomo',
    price: 25.00,
    duration_minutes: 30,
  },
  {
    professional_id: 5,
    name: 'Taglio e Piega Donna',
    description: 'Taglio e piega completo per donna',
    price: 45.00,
    duration_minutes: 60,
  },
  {
    professional_id: 5,
    name: 'Colore Capelli',
    description: 'Tintura completa capelli',
    price: 80.00,
    duration_minutes: 120,
  },
]

async function populateServices() {
  try {
    console.log('Starting to populate services table...')

    // First, get all professional IDs to ensure we're using valid IDs
    const professionalsResult = await pool.query('SELECT id FROM professionals ORDER BY id')
    const professionalIds = professionalsResult.rows.map((row) => row.id)

    if (professionalIds.length === 0) {
      console.error('No professionals found in database. Please populate professionals table first.')
      process.exit(1)
    }

    console.log(`Found ${professionalIds.length} professionals in database`)

    // Update service data to use actual professional IDs
    const servicesToInsert = servicesData
      .filter((service) => professionalIds.includes(service.professional_id))
      .map((service) => ({
        ...service,
        professional_id: service.professional_id,
      }))

    if (servicesToInsert.length === 0) {
      console.log('No services match existing professionals. Creating services for all professionals...')
      
      // Create default services for each professional
      const defaultServices: Service[] = professionalIds.flatMap((id, index) => [
        {
          professional_id: id,
          name: `Servizio Base ${index + 1}`,
          description: 'Servizio base offerto dal professionista',
          price: 50.00,
          duration_minutes: 60,
        },
        {
          professional_id: id,
          name: `Servizio Avanzato ${index + 1}`,
          description: 'Servizio avanzato offerto dal professionista',
          price: 100.00,
          duration_minutes: 120,
        },
      ])

      for (const service of defaultServices) {
        await pool.query(
          `INSERT INTO services (professional_id, name, description, price, duration_minutes)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            service.professional_id,
            service.name,
            service.description,
            service.price,
            service.duration_minutes,
          ]
        )
      }

      console.log(`Created ${defaultServices.length} default services`)
    } else {
      // Insert services
      for (const service of servicesToInsert) {
        await pool.query(
          `INSERT INTO services (professional_id, name, description, price, duration_minutes)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            service.professional_id,
            service.name,
            service.description,
            service.price,
            service.duration_minutes,
          ]
        )
      }

      console.log(`Inserted ${servicesToInsert.length} services`)
    }

    console.log('Services table populated successfully!')
  } catch (error) {
    console.error('Error populating services table:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the script
populateServices()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

