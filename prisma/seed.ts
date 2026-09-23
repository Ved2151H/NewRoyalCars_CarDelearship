import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const DEMO_CARS = [
  {
    name: 'Hyundai Creta SX',
    brand: 'Hyundai',
    model: 'Creta',
    carNumber: 'MH20AB1234',
    acAvailable: true,
    price: 850000,
    numberOfOwners: 1,
    kmFrom: 45000,
    kmTo: 46000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    year: 2021,
    description:
      'Single-owner Creta SX in showroom condition. Full service history at authorised Hyundai service centers, new tyres fitted at 42,000 km.',
    features: ['Electric Sunroof', 'Cruise Control', 'Wireless Charging', '6 Airbags'],
    color: 'Phantom Black',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Maruti Swift VXi',
    brand: 'Maruti Suzuki',
    model: 'Swift',
    carNumber: 'MH12DE5678',
    acAvailable: true,
    price: 520000,
    numberOfOwners: 1,
    kmFrom: 28000,
    kmTo: 29000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    year: 2022,
    description:
      'Peppy city hatchback with excellent fuel economy. Non-smoker car, all four alloys original, zero accident history.',
    features: ['Touchscreen Infotainment', 'Rear Parking Camera', 'LED DRLs'],
    color: 'Pearl Arctic White',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Toyota Innova Crysta GX',
    brand: 'Toyota',
    model: 'Innova Crysta',
    carNumber: 'MH14CG9012',
    acAvailable: true,
    price: 1850000,
    numberOfOwners: 2,
    kmFrom: 88000,
    kmTo: 89500,
    fuelType: 'Diesel',
    transmission: 'Manual',
    year: 2019,
    description:
      'The undisputed family MPV. Second owner, chauffeur-driven, complete Toyota service booklet. Seats eight in absolute comfort.',
    features: ['7-Seater Captain Seats', 'Rear AC Vents', 'Alloy Wheels', 'Touchscreen'],
    color: 'Super White',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Honda City ZX',
    brand: 'Honda',
    model: 'City',
    carNumber: 'MH01EF3456',
    acAvailable: true,
    price: 1120000,
    numberOfOwners: 1,
    kmFrom: 36000,
    kmTo: 37200,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    year: 2021,
    description:
      'Top-trim City ZX with Honda Sensing suite. CVT gearbox is buttery smooth in traffic. Lady-driven, garaged parking.',
    features: ['Honda Sensing ADAS', 'Leather Seats', 'Sunroof', '8-Speaker Audio'],
    color: 'Radiant Red Metallic',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Volkswagen Virtus GT',
    brand: 'Volkswagen',
    model: 'Virtus',
    carNumber: 'MH04GH7890',
    acAvailable: true,
    price: 1650000,
    numberOfOwners: 1,
    kmFrom: 19000,
    kmTo: 20100,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    year: 2023,
    description:
      'GT trim with the 1.5 TSI EVO and DSG. Barely run-in at 19,000 km. German build quality, exceptional highway manners.',
    features: ['1.5 TSI EVO', 'DSG Gearbox', 'Digital Cockpit', 'Ventilated Seats'],
    color: 'Curcuma Yellow',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Skoda Slavia 1.0 TSI',
    brand: 'Skoda',
    model: 'Slavia',
    carNumber: 'MH03IJ2468',
    acAvailable: true,
    price: 1280000,
    numberOfOwners: 1,
    kmFrom: 24000,
    kmTo: 25000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    year: 2022,
    description:
      'Slavia Style trim. Spacious rear bench and cavernous 521L boot. Balanced ride tuned for Indian roads.',
    features: ['Electric Sunroof', 'MySkoda Connected Car', 'Cruise Control'],
    color: 'Crystal Blue',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Kia Seltos HTX',
    brand: 'Kia',
    model: 'Seltos',
    carNumber: 'MH43JK1357',
    acAvailable: true,
    price: 1420000,
    numberOfOwners: 1,
    kmFrom: 31000,
    kmTo: 32500,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    year: 2021,
    description:
      'Diesel-automatic Seltos HTX with the 1.5 CRDi. Feature-loaded cabin with Bose audio and ventilated front seats.',
    features: ['Bose Sound', 'Ventilated Seats', '360 Camera', 'Blue Link'],
    color: 'Intense Red',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Mahindra XUV700 AX7',
    brand: 'Mahindra',
    model: 'XUV700',
    carNumber: 'MH02KL8642',
    acAvailable: true,
    price: 2150000,
    numberOfOwners: 1,
    kmFrom: 42000,
    kmTo: 43500,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    year: 2022,
    description:
      'Flagship AX7 with AdrenoX, panoramic sunroof and AWD. Service done at 40,000 km. Absolute road presence.',
    features: ['Panoramic Sunroof', 'AdrenoX AI', 'Sony 3D Audio', 'ADAS'],
    color: 'Everest White',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Tata Nexon EV Max',
    brand: 'Tata',
    model: 'Nexon EV',
    carNumber: 'MH12MN9753',
    acAvailable: true,
    price: 1150000,
    numberOfOwners: 1,
    kmFrom: 8000,
    kmTo: 9200,
    fuelType: 'Electric',
    transmission: 'Automatic',
    year: 2023,
    description:
      'Nearly new Nexon EV Max with genuine 8k km. 437 km ARAI range, fast charging capable, battery warranty transfers to new owner.',
    features: ['437 km Range', 'Fast Charging', 'Ziptron Tech', 'Sunroof'],
    color: 'Pristine Blue',
    status: 'AVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    name: 'Maruti Swift LXi (Non-AC Trim)',
    brand: 'Maruti Suzuki',
    model: 'Swift',
    carNumber: 'MH15OP2468',
    acAvailable: false,
    price: 310000,
    numberOfOwners: 3,
    kmFrom: 96000,
    kmTo: 98000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    year: 2017,
    description:
      'Budget commuter option. AC compressor needs attention — priced accordingly. Ideal first car or fleet addition.',
    features: ['Power Steering', 'Front Power Windows'],
    color: 'Silky Silver',
    status: 'UNAVAILABLE' as const,
    images: [
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding New Royal Cars database…');

  // Demo admin — password is hashed, never stored in plain text.
  const adminEmail = 'admin@newroyalcars.com';
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        name: 'Royal Administrator',
        email: adminEmail,
        passwordHash: hashPassword('admin@1234'),
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`👑 Admin created: ${adminEmail} / admin@1234 (dev only)`);
  } else {
    console.log('👑 Admin already exists, skipping.');
  }

  for (const car of DEMO_CARS) {
    const existing = await prisma.car.findUnique({ where: { carNumber: car.carNumber } });
    if (existing) {
      console.log(`↩︎  ${car.name} already seeded.`);
      continue;
    }
    await prisma.car.create({
      data: {
        name: car.name,
        brand: car.brand,
        model: car.model,
        carNumber: car.carNumber,
        acAvailable: car.acAvailable,
        price: car.price,
        numberOfOwners: car.numberOfOwners,
        kmFrom: car.kmFrom,
        kmTo: car.kmTo,
        fuelType: car.fuelType,
        transmission: car.transmission,
        year: car.year,
        description: car.description,
        features: car.features,
        color: car.color,
        status: car.status,
        images: {
          create: car.images.map((imageUrl, i) => ({
            imageUrl,
            sortOrder: i,
            publicId: `seed-${car.carNumber.toLowerCase()}-${i}`,
          })),
        },
      },
    });
    console.log(`🚗 Seeded ${car.name}`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
