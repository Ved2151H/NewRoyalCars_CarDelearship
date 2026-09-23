import type { Car, CarAvailability, Enquiry, FuelType, TransmissionType } from '@/types';
import type { Prisma } from '@prisma/client';

/** UI availability labels the approved design uses. */
export function toAvailability(status: 'AVAILABLE' | 'UNAVAILABLE' | 'SOLD'): CarAvailability {
  switch (status) {
    case 'SOLD':
      return 'Sold';
    case 'UNAVAILABLE':
      return 'Reserved';
    default:
      return 'Available';
  }
}

export function fromAvailability(a: CarAvailability): 'AVAILABLE' | 'UNAVAILABLE' | 'SOLD' {
  switch (a) {
    case 'Sold':
      return 'SOLD';
    case 'Reserved':
      return 'UNAVAILABLE';
    default:
      return 'AVAILABLE';
  }
}

type CarWithImages = Prisma.CarGetPayload<{ include: { images: true } }>;

export function mapCar(car: CarWithImages): Car {
  const sortedImages = [...car.images].sort((a, b) => a.sortOrder - b.sortOrder);
  // No fallback image: a car without photos simply has an empty list and the
  // UI renders a clean empty image area instead of a fake vehicle picture.

  return {
    id: car.id,
    name: car.name,
    brand: car.brand,
    model: car.model,
    carNumber: car.carNumber,
    price: car.price,
    formattedPrice: `₹${car.price.toLocaleString('en-IN')}`,
    ac: car.acAvailable,
    owners: car.numberOfOwners,
    kmFrom: car.kmFrom,
    kmTo: car.kmTo,
    fuel: car.fuelType as FuelType,
    transmission: car.transmission as TransmissionType,
    year: car.year,
    availability: toAvailability(car.status),
    images: sortedImages.map((i) => i.imageUrl),
    description: car.description ?? '',
    features: car.features,
    color: car.color ?? 'Not specified',
    featured: car.status === 'AVAILABLE',
  };
}

type EnquiryWithCar = Prisma.EnquiryGetPayload<{ include: { car: true } }>;

export function mapEnquiry(e: EnquiryWithCar): Enquiry {
  const statusMap: Record<string, Enquiry['status']> = {
    NEW: 'Pending',
    CONTACTED: 'Contacted',
    BOOKED: 'Scheduled Visit',
    CLOSED: 'Closed',
    REJECTED: 'Closed',
  };

  return {
    id: e.id,
    customerName: e.customerName,
    phone: e.phone,
    city: e.city ?? '',
    email: e.email ?? '',
    carId: e.carId ?? 'general',
    carName: e.car?.name ?? 'General Royal Fleet Inquiry',
    acRequired: e.acRequired,
    message: e.message ?? '',
    status: statusMap[e.status] ?? 'Pending',
    date: e.createdAt.toISOString().split('T')[0],
    preferredDate: e.preferredDate ? e.preferredDate.toISOString().split('T')[0] : undefined,
  };
}
