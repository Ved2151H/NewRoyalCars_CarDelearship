/** Retention window (days) for items in the Trash before permanent deletion. */
export const TRASH_RETENTION_DAYS = 15;

export interface DeletedCarItem {
  id: string;
  name: string;
  carNumber: string;
  price: number;
  imageUrl: string | null;
  deletedAt: string;
  expiresAt: string;
  expired: boolean;
}

export interface DeletedEnquiryItem {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  carName: string;
  deletedAt: string;
  expiresAt: string;
  expired: boolean;
}
