'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Car, FilterState, Enquiry, CarAvailability } from './types';
import { BackgroundCanvas } from './components/common/BackgroundCanvas';
import { LoadingScreen } from './components/common/LoadingScreen';
import { AdminLogin } from './components/admin/AdminLogin';

// Server actions (backend)
import { saveCarAction, deleteCarAction, updateAvailabilityAction, getCarsAction, getBrandsAction } from './lib/actions/cars';
import { logoutAction, checkSessionAction } from './lib/actions/auth';
import { submitEnquiryAction, getEnquiriesAction, updateEnquiryStatusAction, deleteEnquiryAction } from './lib/actions/enquiries';

// Public pages
import { Navbar, PublicRoute } from './components/public/Navbar';
import { HeroSection } from './components/public/HeroSection';
import { FeaturedCars } from './components/public/FeaturedCars';
import { CarsPage } from './components/public/CarsPage';
import { CarDetailsPage } from './components/public/CarDetailsPage';
import { AboutPage } from './components/public/AboutPage';
import { ContactPage } from './components/public/ContactPage';
import { EnquiryModal } from './components/public/EnquiryModal';

// Admin components
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminNavbar } from './components/admin/AdminNavbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminManageCars } from './components/admin/AdminManageCars';
import { AdminAddCar } from './components/admin/AdminAddCar';
import { AdminEnquiries } from './components/admin/AdminEnquiries';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminSettings } from './components/admin/AdminSettings';

export default function App({
  initialCars,
  initialBrands,
  adminEmail,
}: {
  initialCars: Car[];
  initialBrands: string[];
  adminEmail: string;
}) {
  const router = useRouter();

  // Routing — /admin deep-links survive page reloads (synced after mount to
  // keep SSR/client markup identical; masked by the loading screen).
  const [route, setRoute] = useState<PublicRoute>('home');
  const isAdminMode = route === 'admin';
  const [detailCarId, setDetailCarId] = useState<string | null>(null);

  // Admin authentication — restored from the verified server session so a
  // page reload never logs the admin out unexpectedly.
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core data — hydrated from PostgreSQL via the server component, then kept
  // fresh client-side through server actions after every mutation.
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [brands, setBrands] = useState<string[]>(initialBrands);

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<FilterState>({
    brand: 'all',
    ac: 'all',
    minPrice: 0,
    maxPrice: 25000000,
    maxKm: 200000,
    fuel: 'all',
    transmission: 'all',
    searchQuery: '',
    sortBy: 'featured',
  });

  // Enquiry modal
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [selectedCarForEnquiry, setSelectedCarForEnquiry] = useState<Car | null>(null);

  const [editingCar, setEditingCar] = useState<Car | null>(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route, detailCarId]);

  // Restore admin session once on mount from the httpOnly cookie session.
  useEffect(() => {
    let active = true;
    if (window.location.pathname.startsWith('/admin')) {
      setRoute('admin');
    }
    checkSessionAction().then((res) => {
      if (!active) return;
      if (res.ok && res.data?.authenticated) {
        setIsAdminAuthenticated(true);
      }
      setSessionChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Fetch live enquiries from Postgres when the admin suite unlocks.
  useEffect(() => {
    if (isAdminMode && isAdminAuthenticated && enquiries.length === 0) {
      getEnquiriesAction().then((res) => {
        if (res.ok && res.data) setEnquiries(res.data);
      });
    }
  }, [isAdminMode, isAdminAuthenticated, enquiries.length]);

  const filteredCars = useMemo(() => {
    return cars
      .filter((car) => {
        if (filters.ac === 'ac' && !car.ac) return false;
        if (filters.ac === 'non-ac' && car.ac) return false;
        if (filters.brand !== 'all' && car.brand.toLowerCase() !== filters.brand.toLowerCase()) {
          return false;
        }
        if (filters.fuel !== 'all' && car.fuel !== filters.fuel) return false;
        if (filters.transmission !== 'all' && car.transmission !== filters.transmission) return false;
        if (car.price < filters.minPrice || car.price > filters.maxPrice) return false;
        if (car.kmTo > filters.maxKm) return false;

        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchName = car.name.toLowerCase().includes(q);
          const matchBrand = car.brand.toLowerCase().includes(q);
          const matchModel = car.model.toLowerCase().includes(q);
          const matchCarNumber = car.carNumber.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchModel && !matchCarNumber) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price-low') return a.price - b.price;
        if (filters.sortBy === 'price-high') return b.price - a.price;
        if (filters.sortBy === 'year-new') return b.year - a.year;
        if (filters.sortBy === 'km-low') return a.kmFrom - b.kmFrom;
        return 0;
      });
  }, [cars, filters]);

  const detailCar = cars.find((c) => c.id === detailCarId) || null;

  // Handlers
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      brand: 'all',
      ac: 'all',
      minPrice: 0,
      maxPrice: 25000000,
      maxKm: 200000,
      fuel: 'all',
      transmission: 'all',
      searchQuery: '',
      sortBy: 'featured',
      seed: prev.seed,
    }));
  };

  // ---------- server-backed mutations ----------

  const refreshCars = useCallback(async () => {
    const res = await getCarsAction();
    if (res.ok && res.data) setCars(res.data);
    const brandsRes = await getBrandsAction();
    if (brandsRes.ok && brandsRes.data) setBrands(brandsRes.data);
  }, []);

  const handleSaveCar = useCallback(
    async (car: Car, imageUrls: string[], imagePublicIds?: Record<string, string>) => {
      const fd = new FormData();
      fd.set('payload', JSON.stringify({
        name: car.name,
        brand: car.brand,
        model: car.model,
        carNumber: car.carNumber,
        acAvailable: car.ac,
        price: car.price,
        numberOfOwners: car.owners,
        kmFrom: car.kmFrom,
        kmTo: car.kmTo,
        fuelType: car.fuel,
        transmission: car.transmission,
        year: car.year,
        description: car.description,
        status:
          car.availability === 'Sold'
            ? 'SOLD'
            : car.availability === 'Reserved'
            ? 'UNAVAILABLE'
            : 'AVAILABLE',
        features: car.features,
        color: car.color === 'Not specified' ? '' : car.color,
        engine: car.engine === 'Not specified' ? '' : car.engine,
        insuranceValidity: car.insuranceValidity === 'Not specified' ? '' : car.insuranceValidity,
        registrationRTO: car.registrationRTO === 'Not specified' ? '' : car.registrationRTO,
      }));
      fd.set('imageUrls', JSON.stringify(imageUrls));
      fd.set('imagePublicIds', JSON.stringify(imagePublicIds ?? {}));
      if (!car.id.startsWith('car-')) fd.set('carId', car.id);

      const res = await saveCarAction(fd);
      if (!res.ok) throw new Error(res.error);
      await refreshCars();
      router.refresh();
    },
    [refreshCars, router]
  );

  const handleDeleteCar = useCallback(
    async (carId: string) => {
      const res = await deleteCarAction(carId);
      if (!res.ok) throw new Error(res.error);
      setCars((prev) => prev.filter((c) => c.id !== carId));
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(carId);
        return next;
      });
      router.refresh();
    },
    [router]
  );

  const handleUpdateAvailability = useCallback(
    async (carId: string, availability: CarAvailability) => {
      // Optimistic update, rollback on failure.
      const prevCars = cars;
      setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, availability } : c)));
      const res = await updateAvailabilityAction(carId, availability);
      if (!res.ok) {
        setCars(prevCars);
        console.error(res.error);
      }
    },
    [cars]
  );

  const handleSubmitEnquiry = useCallback(
    async (enquiryData: Omit<Enquiry, 'id' | 'date'>): Promise<string> => {
      const res = await submitEnquiryAction({
        carId: enquiryData.carId === 'general' ? null : enquiryData.carId,
        customerName: enquiryData.customerName,
        phone: enquiryData.phone,
        city: enquiryData.city,
        email: enquiryData.email || '',
        acRequired: enquiryData.acRequired,
        message: enquiryData.message,
        preferredDate: enquiryData.preferredDate || '',
      });
      if (!res.ok) throw new Error(res.error);
      return res.data?.referenceId ?? 'NRC-000000';
    },
    []
  );

  const handleUpdateEnquiryStatus = useCallback(
    (enquiryId: string, newStatus: Enquiry['status']) => {
      // Optimistic update; the UI label stays identical, only persistence changed.
      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, status: newStatus } : e))
      );
      const dbStatus =
        newStatus === 'Pending'
          ? 'NEW'
          : newStatus === 'Contacted'
          ? 'CONTACTED'
          : newStatus === 'Scheduled Visit'
          ? 'BOOKED'
          : 'CLOSED';
      updateEnquiryStatusAction(enquiryId, dbStatus).then((res) => {
        if (!res.ok) console.error(res.error);
      });
    },
    []
  );

  const handleDeleteEnquiry = useCallback(async (enquiryId: string) => {
    const res = await deleteEnquiryAction(enquiryId);
    if (res.ok) {
      setEnquiries((prev) => prev.filter((e) => e.id !== enquiryId));
    } else {
      console.error(res.error);
    }
  }, []);

  const handleToggleFavorite = useCallback((carId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(carId)) next.delete(carId);
      else next.add(carId);
      return next;
    });
  }, []);

  const handleOpenEnquiryModal = useCallback((car?: Car | null) => {
    setSelectedCarForEnquiry(car || null);
    setIsEnquiryModalOpen(true);
  }, []);

  // Any plain navigation leaves the details view — one route child at a time.
  const handleNavigate = useCallback((r: PublicRoute) => {
    setDetailCarId(null);
    setRoute(r);
  }, []);

  const pendingEnquiriesCount = enquiries.filter((e) => e.status === 'Pending').length;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pendingEnquiries = useMemo(
    () => enquiries.filter((e) => e.status === 'Pending'),
    [enquiries]
  );

  const handleLogout = useCallback(async () => {
    await logoutAction();
    setIsAdminAuthenticated(false);
    setSessionChecked(true);
    setAdminTab('dashboard');
    setEnquiries([]);
    router.refresh();
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#050607] text-neutral-100 font-sans antialiased overflow-x-hidden">
      {/* Cinematic monochrome background */}
      <BackgroundCanvas
        mode={
          isAdminMode
            ? 'admin'
            : detailCar
            ? 'details'
            : route === 'cars'
            ? 'showcase'
            : 'hero'
        }
      />

      <LoadingScreen duration={1400} />

      {isAdminMode ? (
        /* ================= ADMIN ================= */
        !isAdminAuthenticated ? (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              <AdminLogin
                adminEmail={adminEmail}
                onSuccess={() => {
                  setIsAdminAuthenticated(true);
                  router.refresh();
                }}
                onBackToSite={() => handleNavigate('home')}
              />
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="admin-suite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 min-h-screen"
            >
              <AdminSidebar
                currentTab={adminTab}
                onTabChange={(tab) => {
                  setAdminTab(tab);
                  if (tab !== 'add-car') setEditingCar(null);
                }}
                onLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                pendingEnquiriesCount={pendingEnquiriesCount}
                onBackToWebsite={() => handleNavigate('home')}
                mobileOpen={isMobileNavOpen}
                onMobileOpenChange={setIsMobileNavOpen}
              />

              <div
                className={`transition-all duration-500 ${
                  isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
                }`}
              >
                <AdminNavbar
                  currentTab={adminTab}
                  pendingCount={pendingEnquiriesCount}
                  adminUsername={adminEmail}
                  onLogout={handleLogout}
                  onMenuClick={() => setIsMobileNavOpen(true)}
                  pendingEnquiries={pendingEnquiries}
                  onViewEnquiries={() => setAdminTab('enquiries')}
                  onBackToWebsite={() => handleNavigate('home')}
                />

                <div className="p-4 pt-6 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                  {adminTab === 'dashboard' && (
                    <AdminDashboard
                      cars={cars}
                      enquiries={enquiries}
                      onNavigateTab={setAdminTab}
                      onViewCar={(car) => setDetailCarId(car.id)}
                    />
                  )}

                  {adminTab === 'cars' && (
                    <AdminManageCars
                      cars={cars}
                      onAddNewCar={() => {
                        setEditingCar(null);
                        setAdminTab('add-car');
                      }}
                      onEditCar={(car) => {
                        setEditingCar(car);
                        setAdminTab('add-car');
                      }}
                      onViewCar={(car) => setDetailCarId(car.id)}
                      onDeleteCar={handleDeleteCar}
                      onUpdateAvailability={handleUpdateAvailability}
                    />
                  )}

                  {adminTab === 'add-car' && (
                    <AdminAddCar
                      initialCar={editingCar}
                      onSaveCar={handleSaveCar}
                      onCancel={() => {
                        setEditingCar(null);
                        setAdminTab('cars');
                      }}
                    />
                  )}

                  {adminTab === 'enquiries' && (
                    <AdminEnquiries
                      enquiries={enquiries}
                      onUpdateStatus={handleUpdateEnquiryStatus}
                      onDeleteEnquiry={handleDeleteEnquiry}
                    />
                  )}

                  {adminTab === 'customers' && <AdminCustomers enquiries={enquiries} />}

                  {adminTab === 'settings' && <AdminSettings />}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )
      ) : (
        /* ================= PUBLIC ================= */
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar
            route={route}
            onNavigate={handleNavigate}
            onOpenEnquiry={() => handleOpenEnquiryModal(null)}
            onSearch={() => handleNavigate('cars')}
          />

          <main className="flex-1">
            <AnimatePresence mode="wait">
              {route === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <HeroSection
                    onBrowseCars={() => handleNavigate('cars')}
                    onContactUs={() => handleOpenEnquiryModal(null)}
                    featuredCarImage={cars.length > 0 ? cars[0].images[0] : null}
                  />
                  <FeaturedCars
                    cars={cars}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onViewDetails={(car) => {
                      setDetailCarId(car.id);
                      setRoute('cars');
                    }}
                    onViewAll={() => handleNavigate('cars')}
                  />
                </motion.div>
              )}

              {route === 'cars' && !detailCar && (
                <motion.div
                  key="cars"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CarsPage
                    cars={filteredCars}
                    totalCars={cars.length}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onResetFilters={handleResetFilters}
                    brands={brands}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onViewDetails={(car) => setDetailCarId(car.id)}
                  />
                </motion.div>
              )}

              {detailCar && route !== 'about' && route !== 'contact' && (
                <motion.div
                  key={`details-${detailCar.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CarDetailsPage
                    car={detailCar}
                    isFavorite={favorites.has(detailCar.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onBack={() => {
                      setDetailCarId(null);
                      setRoute('cars');
                    }}
                    onSendEnquiry={(car) => handleOpenEnquiryModal(car)}
                  />
                </motion.div>
              )}

              {route === 'about' && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AboutPage onExploreCars={() => handleNavigate('cars')} />
                </motion.div>
              )}

              {route === 'contact' && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ContactPage onSubmitEnquiry={handleSubmitEnquiry} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Minimal footer */}
          <footer className="relative border-t border-white/[0.06] bg-[#060708] py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-neutral-500">
                  &copy; {new Date().getFullYear()} NEW ROYAL CARS &middot; Premium Pre-Owned Cars
                </p>
                <button
                  onClick={() => handleNavigate('admin')}
                  className="text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  Admin Suite
                </button>
              </div>
              <p className="text-[11px] text-neutral-600 tracking-wide">
                Presented by{' '}
                <span className="text-neutral-400">Nandu Dhanokar</span>
              </p>
              <span className="text-[9px] text-neutral-700 tracking-wider">
                version : 6.0
              </span>
            </div>
          </footer>

          {/* Enquiry modal */}
          <EnquiryModal
            isOpen={isEnquiryModalOpen}
            car={selectedCarForEnquiry}
            onClose={() => setIsEnquiryModalOpen(false)}
            onSubmitEnquiry={handleSubmitEnquiry}
          />
        </div>
      )}
    </div>
  );
}
