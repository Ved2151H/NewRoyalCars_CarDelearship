export type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric' | 'Hybrid';
export type TransmissionType = 'Manual' | 'Automatic';
export type CarAvailability = 'Available' | 'Reserved' | 'Sold';

export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  carNumber: string;
  price: number;
  formattedPrice: string;
  ac: boolean;
  owners: number;
  kmFrom: number;
  kmTo: number;
  fuel: FuelType;
  transmission: TransmissionType;
  year: number;
  availability: CarAvailability;
  images: string[];
  description: string;
  features: string[];
  color: string;
  featured?: boolean;
}

export interface Enquiry {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  email: string;
  carId: string;
  carName: string;
  acRequired: boolean;
  message: string;
  status: 'Pending' | 'Contacted' | 'Scheduled Visit' | 'Closed';
  date: string;
  preferredDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  interestedCar: string;
  totalEnquiries: number;
  lastActive: string;
  status: 'High Intent' | 'Warm' | 'Purchased' | 'Browsing';
}

export interface FilterState {
  brand: string;
  ac: 'all' | 'ac' | 'non-ac';
  minPrice: number;
  maxPrice: number;
  maxKm: number;
  fuel: string;
  transmission: string;
  searchQuery: string;
  sortBy: 'price-low' | 'price-high' | 'km-low' | 'year-new' | 'featured';
  /** Bumped by admin actions so showrooms can re-run their entrance choreography. */
  seed?: number;
}

export interface AdminStats {
  totalCars: number;
  available: number;
  soldOrUnavailable: number;
  acCars: number;
  nonAcCars: number;
  totalEnquiries: number;
}
