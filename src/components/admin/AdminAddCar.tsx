import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, FuelType, TransmissionType, CarAvailability } from '../../types';
import { GlassButton } from '../common/GlassButton';
import { GlassSelect } from '../common/GlassSelect';
import {
  UploadCloud,
  X,
  Save,
  CheckCircle2,
  ImagePlus,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface AdminAddCarProps {
  initialCar?: Car | null;
  onSaveCar: (
    car: Car,
    imageUrls: string[],
    imagePublicIds?: Record<string, string>
  ) => Promise<void>;
  onCancel: () => void;
}

// Photos — permanent storage URLs. Device photos are uploaded to storage the
// moment they are selected, so previews show the real URL that gets saved.
interface PhotoItem {
  url: string;
  publicId: string | null;
}

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_MB = 10;
const MAX_PHOTOS = 10;

export const AdminAddCar: React.FC<AdminAddCarProps> = ({
  initialCar,
  onSaveCar,
  onCancel,
}) => {
  const isEditing = Boolean(initialCar);

  // All fields start blank — zero dummy/placeholder data is prefilled.
  const [name, setName] = useState(initialCar?.name || '');
  const [brand, setBrand] = useState(initialCar?.brand || '');
  const [model, setModel] = useState(initialCar?.model || '');
  const [carNumber, setCarNumber] = useState(initialCar?.carNumber || '');
  const [price, setPrice] = useState<number | ''>(initialCar?.price || '');
  const [ac, setAc] = useState<boolean>(initialCar ? initialCar.ac : true);
  const [owners, setOwners] = useState<number>(initialCar?.owners || 1);
  const [kmFrom, setKmFrom] = useState<number | ''>(initialCar?.kmFrom || '');
  const [kmTo, setKmTo] = useState<number | ''>(initialCar?.kmTo || '');
  const [fuel, setFuel] = useState<FuelType>(initialCar?.fuel || 'Petrol');
  const [transmission, setTransmission] = useState<TransmissionType>(
    initialCar?.transmission || 'Manual'
  );
  const [year, setYear] = useState<number | ''>(initialCar?.year || '');
  const [availability, setAvailability] = useState<CarAvailability>(
    initialCar?.availability || 'Available'
  );
  const [description, setDescription] = useState(initialCar?.description || '');
  const [color, setColor] = useState(initialCar?.color || '');
  const [engine, setEngine] = useState(initialCar?.engine || '');
  const [insuranceValidity, setInsuranceValidity] = useState(
    initialCar?.insuranceValidity || ''
  );
  const [registrationRTO, setRegistrationRTO] = useState(initialCar?.registrationRTO || '');

  // Features
  const [featuresList, setFeaturesList] = useState<string[]>(initialCar?.features || []);
  const [newFeatureText, setNewFeatureText] = useState('');

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    if (!initialCar) return [];
    const isPlaceholder = initialCar.images.length === 1 && initialCar.images[0].includes('unsplash');
    if (isPlaceholder) return [];
    return initialCar.images.map((url) => ({ url, publicId: null }));
  });
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeaturesList([...featuresList, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeaturesList(featuresList.filter((_, i) => i !== index));
  };

  const handleAddImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (photos.some((p) => p.url === trimmed)) {
      setFormError('That image has already been added.');
      setShakeError(true);
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      setFormError(`Maximum ${MAX_PHOTOS} photos per car.`);
      setShakeError(true);
      return;
    }
    setPhotos((prev) => [...prev, { url: trimmed, publicId: null }]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [img] = next.splice(index, 1);
      return [img, ...next];
    });
  };

  /**
   * Uploads a single file. Production flow: ask the server for a short-lived
   * presigned PUT URL, then upload the bytes DIRECTLY to Neon Object Storage —
   * the file never passes through the serverless function, so Vercel's
   * 4.5 MB request-body limit is irrelevant. The presign endpoint validates
   * session + size + declared MIME; the object key comes back server-signed.
   */
  const uploadOne = async (file: File): Promise<PhotoItem> => {
    const qs = new URLSearchParams({
      name: file.name,
      contentType: file.type || 'image/jpeg',
      size: String(file.size),
    });
    const presignRes = await fetch(`/api/images/upload?${qs.toString()}`);
    const presign = await presignRes.json().catch(() => null);
    if (!presignRes.ok || !presign?.ok || !presign.uploadUrl) {
      throw new Error(presign?.error || 'Unable to upload the image. Please try again.');
    }

    const putRes = await fetch(presign.uploadUrl as string, {
      method: 'PUT',
      headers: presign.headers as Record<string, string>,
      body: file,
    });
    if (!putRes.ok) {
      throw new Error('Unable to upload the image. Please try again.');
    }
    return { url: presign.publicUrl as string, publicId: presign.publicId as string };
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFormError(null);

    const list = Array.from(files);

    // Client-side validation — the server validates again on its own.
    const rejected: string[] = [];
    const valid: File[] = [];
    for (const f of list) {
      const okType = ALLOWED_FILE_TYPES.includes(f.type.toLowerCase());
      const okSize = f.size > 0 && f.size <= MAX_FILE_MB * 1024 * 1024;
      if (okType && okSize) valid.push(f);
      else if (!okType) rejected.push(`“${f.name}” is not a JPG, PNG or WebP image.`);
      else rejected.push(`“${f.name}” must be smaller than ${MAX_FILE_MB} MB.`);
    }

    // Respect the remaining slot count and skip duplicates by name+size.
    const remaining = MAX_PHOTOS - photos.length;
    const existingKeys = new Set(photos.map((p) => `${p.url}`));
    const queue: File[] = [];
    for (const f of valid) {
      if (queue.length >= remaining) {
        rejected.push(`Maximum ${MAX_PHOTOS} photos per car.`);
        break;
      }
      const key = `file:${f.name}:${f.size}`;
      if (existingKeys.has(key)) {
        rejected.push(`“${f.name}” has already been added.`);
        continue;
      }
      existingKeys.add(key);
      queue.push(f);
    }

    if (rejected.length > 0) {
      setFormError(rejected.slice(0, 3).join(' '));
      setShakeError(true);
    }
    if (queue.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: queue.length });
    const uploaded: PhotoItem[] = [];
    try {
      // Sequential keeps progress honest and avoids provider rate limits.
      for (let i = 0; i < queue.length; i++) {
        const item = await uploadOne(queue[i]);
        uploaded.push(item);
        setUploadProgress({ done: i + 1, total: queue.length });
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to upload the image. Please try again.'
      );
      setShakeError(true);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericPrice = Number(price) || 0;
    const numericKmFrom = Number(kmFrom) || 0;
    const numericKmTo = Number(kmTo) || Math.max(numericKmFrom, 0);
    const numericYear = Number(year) || new Date().getFullYear();

    const formattedPrice = `₹${numericPrice.toLocaleString('en-IN')}`;

    const newCar: Car = {
      id: initialCar ? initialCar.id : `car-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      carNumber: carNumber.trim().toUpperCase(),
      price: numericPrice,
      formattedPrice,
      ac,
      owners: Number(owners),
      kmFrom: numericKmFrom,
      kmTo: numericKmTo,
      fuel,
      transmission,
      year: numericYear,
      availability,
      images: photos.length > 0 ? photos.map((p) => p.url) : [PLACEHOLDER_IMAGE],
      description: description.trim(),
      features: featuresList,
      color: color.trim() || 'Not specified',
      engine: engine.trim() || 'Not specified',
      insuranceValidity: insuranceValidity.trim() || 'Not specified',
      registrationRTO: registrationRTO.trim() || 'Not specified',
      featured: initialCar ? initialCar.featured : true,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      // Only pass publicIds for storage-uploaded photos (URL-pasted ones have none).
      const publicIdMap: Record<string, string> = {};
      for (const p of photos) {
        if (p.publicId) publicIdMap[p.url] = p.publicId;
      }
      await onSaveCar(newCar, photos.map((p) => p.url), publicIdMap);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onCancel();
      }, 900);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the vehicle.');
      setShakeError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            {isEditing ? `Edit Vehicle: ${initialCar?.name}` : 'Add New Car to Royal Fleet'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Enter the real specifications — nothing is prefilled. Every field you complete goes
            live on the public showroom.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Success banner with smooth mount/unmount */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Vehicle registered successfully! Updating live showroom...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Server-side validation / error banner */}
      <AnimatePresence>
        {formError && (
          <motion.div
            key={shakeError ? 'shake' : 'still'}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={
              shakeError
                ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="ml-auto text-red-300/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Specs Glass Box */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">
            Basic Identification &amp; Pricing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Car Name / Display Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hyundai Creta"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Hyundai, Mercedes-Benz"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">Model *</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Creta SX(O)"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Car Number (RC / Plate) *
              </label>
              <input
                type="text"
                required
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
                placeholder="e.g. MH20AB1234"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-white/60 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Price in INR (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 850000"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Manufacturing Year *
              </label>
              <input
                type="number"
                required
                min={1950}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2021"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Availability Status
              </label>
              <GlassSelect
                value={availability}
                onChange={(v) => setAvailability(v as CarAvailability)}
                ariaLabel="Availability status"
                className="w-full px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
                options={[
                  { value: 'Available', label: 'Available' },
                  { value: 'Reserved', label: 'Reserved' },
                  { value: 'Sold', label: 'Sold' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Technical & AC Status */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">
            Technical &amp; Mileage Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* AC Availability Toggle */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between">
              <span className="text-xs text-neutral-300 font-medium">AC Availability *</span>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAc(true)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors duration-300 ${
                    ac ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Yes (AC)
                </button>
                <button
                  type="button"
                  onClick={() => setAc(false)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors duration-300 ${
                    !ac
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Non-AC
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Number of Owners *
              </label>
              <GlassSelect
                value={String(owners)}
                onChange={(v) => setOwners(Number(v))}
                ariaLabel="Number of owners"
                className="w-full px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
                options={[
                  { value: '1', label: '1 Owner' },
                  { value: '2', label: '2 Owners' },
                  { value: '3', label: '3 Owners' },
                  { value: '4', label: '4+ Owners' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                KM Driven (From) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={kmFrom}
                onChange={(e) => setKmFrom(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 45000"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                KM Driven (To) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={kmTo}
                onChange={(e) => setKmTo(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 46000"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">Fuel Type</label>
              <GlassSelect
                value={fuel}
                onChange={(v) => setFuel(v as FuelType)}
                ariaLabel="Fuel type"
                className="w-full px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
                options={[
                  { value: 'Petrol', label: 'Petrol' },
                  { value: 'Diesel', label: 'Diesel' },
                  { value: 'CNG', label: 'CNG' },
                  { value: 'Electric', label: 'Electric' },
                  { value: 'Hybrid', label: 'Hybrid' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Transmission
              </label>
              <GlassSelect
                value={transmission}
                onChange={(v) => setTransmission(v as TransmissionType)}
                ariaLabel="Transmission"
                className="w-full px-3 py-2 pr-10 rounded-xl bg-black/50 border border-white/10 text-white text-sm text-left focus:outline-none focus:border-white/60 cursor-pointer"
                options={[
                  { value: 'Manual', label: 'Manual' },
                  { value: 'Automatic', label: 'Automatic' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Exterior Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Phantom Black"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            {/* Engine Specification — desktop/tablet only (hidden on mobile) */}
            <div className="hidden sm:block">
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Engine Specification
              </label>
              <input
                type="text"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="e.g. 1.5L MPi (115 PS)"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            {/* Insurance Validity — desktop/tablet only (hidden on mobile) */}
            <div className="hidden sm:block">
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Insurance Validity
              </label>
              <input
                type="text"
                value={insuranceValidity}
                onChange={(e) => setInsuranceValidity(e.target.value)}
                placeholder="e.g. November 2026"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                RTO / Registration
              </label>
              <input
                type="text"
                value={registrationRTO}
                onChange={(e) => setRegistrationRTO(e.target.value)}
                placeholder="e.g. MH-20 (Aurangabad)"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
            </div>
          </div>
        </div>

        {/* Description & Features */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">
            Description &amp; Key Features
          </h3>

          <div>
            <label className="block text-xs text-neutral-300 font-medium mb-1">
              Vehicle Overview &amp; Condition Dossier
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the actual condition, service history, and highlights of this vehicle..."
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-300 font-medium mb-1.5">
              Features Checklist
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="e.g. Electric Sunroof, Burmester Sound, 360 Camera..."
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {featuresList.map((feat, i) => (
                <motion.span
                  key={`${feat}-${i}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-white/20 text-neutral-200 text-xs"
                >
                  <span>{feat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(i)}
                    className="text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.span>
              ))}
            </div>
          </div>
        </div>

        {/* Photo Upload Area */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">
              Vehicle Photography
            </h3>
            <span className="text-xs text-neutral-400">
              {photos.length} / {MAX_PHOTOS} Photos
            </span>
          </div>

          {/* Upload Dropzone — real file uploads + optional URL paste */}
          <div
            className="p-6 rounded-2xl border-2 border-dashed border-white/20 bg-black/40 hover:bg-white/[0.04] transition-colors duration-300 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3 text-neutral-400">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div className="text-sm font-semibold text-white mb-1 flex items-center justify-center gap-2">
              <ImagePlus className="w-4 h-4 text-neutral-400" />
              {uploading
                ? `Uploading images… ${uploadProgress ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0}%`
                : 'Upload photos from your device'}
            </div>
            {uploading && uploadProgress && (
              <div className="max-w-xs mx-auto mb-3">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-white/80 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%`,
                    }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 font-mono">
                  {uploadProgress.done} / {uploadProgress.total} photo
                  {uploadProgress.total === 1 ? '' : 's'} uploaded
                </p>
              </div>
            )}
            <p className="text-xs text-neutral-400 mb-3">
              Click to browse or drag &amp; drop — JPEG, PNG, WebP up to {MAX_FILE_MB} MB each.
              Up to {MAX_PHOTOS} photos, first one becomes the showroom cover.
            </p>

            {/* Optional URL Input */}
            <div className="max-w-md mx-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="url"
                placeholder="Or paste an image URL (CDN, dealership hosting)..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage(imageUrlInput);
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-white/60"
              />
              <button
                type="button"
                onClick={() => handleAddImage(imageUrlInput)}
                className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Active Image Previews with Remove */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {photos.map((photo, idx) => (
                <motion.div
                  key={`${photo.url.slice(0, 60)}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group rounded-xl overflow-hidden h-28 border border-white/15 bg-black"
                >
                  <img
                    src={photo.url}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Reorder controls */}
                  <div className="absolute top-1.5 left-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded-md bg-black/70 text-neutral-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move earlier"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, 1)}
                      disabled={idx === photos.length - 1}
                      className="p-1 rounded-md bg-black/70 text-neutral-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move later"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-neutral-300 hover:text-red-400 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Set as primary */}
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/70 text-neutral-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Set as primary cover"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-black">
                      Primary Cover
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex items-center justify-end gap-3">
          <GlassButton type="button" variant="secondary" size="md" onClick={onCancel}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="gold"
            size="md"
            glow
            disabled={isSaving || uploading}
            icon={
              isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />
            }
          >
            {uploading
              ? 'Uploading photos…'
              : isSaving
              ? isEditing
                ? 'Updating Vehicle…'
                : 'Creating Car…'
              : isEditing
              ? 'Update Vehicle'
              : 'Save Car to Showroom'}
          </GlassButton>
        </div>
      </form>
    </div>
  );
};
