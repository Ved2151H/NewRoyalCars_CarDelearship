import { z } from 'zod';

/* ------------------------- shared enums ------------------------- */

export const carStatusSchema = z.enum(['AVAILABLE', 'UNAVAILABLE', 'SOLD']);
export const enquiryStatusSchema = z.enum(['NEW', 'CONTACTED', 'BOOKED', 'CLOSED', 'REJECTED']);

export const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] as const;
export const TRANSMISSIONS = ['Manual', 'Automatic'] as const;

/* ------------------------- car ------------------------- */

const indiaPhone = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number');

export const carInputSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  brand: z.string().trim().min(2, 'Brand is required').max(40),
  model: z.string().trim().min(1, 'Model is required').max(40),
  carNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{2}[- ]?\d{1,2}[- ]?[A-Z]{0,3}[- ]?\d{1,4}$/,
      'Enter a valid Indian RC number (e.g. MH20AB1234)'
    ),
  acAvailable: z.boolean(),
  price: z.number().int().min(50000, 'Price looks too low').max(100000000, 'Price looks too high'),
  numberOfOwners: z.number().int().min(1).max(6),
  kmFrom: z.number().int().min(0).max(1000000),
  kmTo: z.number().int().min(0).max(1000000),
  fuelType: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  year: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  status: carStatusSchema,
  features: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  engine: z.string().trim().max(60).optional().or(z.literal('')),
  insuranceValidity: z.string().trim().max(40).optional().or(z.literal('')),
  registrationRTO: z.string().trim().max(40).optional().or(z.literal('')),
})
  .refine((d) => d.kmTo >= d.kmFrom, {
    message: 'KM (To) must be ≥ KM (From)',
    path: ['kmTo'],
  });

export type CarInput = z.infer<typeof carInputSchema>;

/* ------------------------- images ------------------------- */

export const imageActionSchema = z.object({
  carId: z.string().min(1),
  imageUrl: z.string().url().max(2048),
  publicId: z.string().max(256).optional(),
});

export const reorderImagesSchema = z.object({
  carId: z.string().min(1),
  imageIds: z.array(z.string()).min(1).max(12),
});

export const deleteImageSchema = z.object({ imageId: z.string().min(1) });

export const setPrimaryImageSchema = z.object({ carId: z.string().min(1), imageId: z.string().min(1) });

/* ------------------------- enquiry (public) ------------------------- */

export const enquiryInputSchema = z.object({
  carId: z.string().min(1).nullable().optional(),
  customerName: z.string().trim().min(2, 'Name is required').max(80),
  phone: indiaPhone,
  city: z.string().trim().min(2, 'City is required').max(60),
  email: z.string().trim().email('Invalid email').max(120).optional().or(z.literal('')),
  acRequired: z.boolean().default(true),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

/* ------------------------- admin enquiry mgmt ------------------------- */

export const enquiryStatusUpdateSchema = z.object({
  enquiryId: z.string().min(1),
  status: enquiryStatusSchema,
});

export const enquiryDeleteSchema = z.object({ enquiryId: z.string().min(1) });

/* ------------------------- auth ------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});
