# New Royal Cars — Frontend Architecture & Hooks Reference

A comprehensive technical documentation guide covering **each and every frontend hook** utilized across the **New Royal Cars** luxury automotive web application.

---

## Table of Contents

1. [Overview & Tech Stack](#overview--tech-stack)
2. [Hooks Master Summary Table](#hooks-master-summary-table)
3. [React Core Hooks Deep Dive](#react-core-hooks-deep-dive)
   - [1. `useState`](#1-usestate)
   - [2. `useEffect`](#2-useeffect)
   - [3. `useRef`](#3-useref)
   - [4. `useMemo`](#4-usememo)
4. [Framer Motion Animation & Physics Hooks Deep Dive](#framer-motion-animation--physics-hooks-deep-dive)
   - [5. `useMotionValue`](#5-usemotionvalue)
   - [6. `useSpring`](#6-usespring)
   - [7. `useTransform`](#7-usetransform)
   - [8. `useScroll`](#8-usescroll)
   - [9. `useMotionValueEvent`](#9-usemotionvalueevent)
5. [Hook Composition Patterns](#hook-composition-patterns)
   - [Pattern A: 3D Mouse Tilt & Dynamic Glare (Zero Re-render)](#pattern-a-3d-mouse-tilt--dynamic-glare-zero-re-render)
   - [Pattern B: Continuous Scroll Progress & Shrinking Navbar](#pattern-b-continuous-scroll-progress--shrinking-navbar)
   - [Pattern C: Layered Hero Parallax](#pattern-c-layered-hero-parallax)
   - [Pattern D: High-Performance 60FPS Ambient Particle Canvas](#pattern-d-high-performance-60fps-ambient-particle-canvas)

---

## Overview & Tech Stack

- **Framework**: React 19 (TypeScript)
- **Animation & Gesture Engine**: Motion (`motion/react` / Framer Motion v12)
- **Styling**: Tailwind CSS v4 (Glassmorphism, Dark Obsidian & Warm Gold luxury aesthetics)
- **Icons**: Lucide React
- **Architecture**: Pure frontend client-side SPA with local state orchestration and mock persistence for dealership management.

---

## Hooks Master Summary Table

| Hook | Category | Library | Primary Function in Project | Key Components Utilizing It |
| :--- | :--- | :--- | :--- | :--- |
| **`useState`** | State Management | `react` | Manages reactive state for filters, modals, cars list, admin forms, enquiries, and UI tabs | `App`, `Navbar`, `CarFilters`, `CarDetailsModal`, `EnquiryModal`, `AdminManageCars`, `AdminAddCar`, `AdminEnquiries`, `AdminCustomers`, `AdminSettings`, `StatCard` |
| **`useEffect`** | Lifecycle & Side-effects | `react` | Handles local storage sync, canvas render loops, animated number counters, and form prefill | `App`, `BackgroundCanvas`, `StatCard`, `AdminAddCar` |
| **`useRef`** | Mutable References / DOM | `react` | Captures DOM element bounds for mouse tilt, scroll targets, canvas context, and animation frame IDs | `CarCard`, `HorizontalShowcase`, `HeroSection`, `BackgroundCanvas` |
| **`useMemo`** | Performance Optimization | `react` | Memoizes filtered & sorted vehicle collections and brand extraction to prevent unnecessary recomputations | `App` |
| **`useMotionValue`** | Animation State | `motion/react` | Stores high-frequency mouse coordinates `(x, y)` without triggering React re-renders | `CarCard`, `HorizontalShowcase`, `HeroSection` |
| **`useSpring`** | Physics-Based Smoothing | `motion/react` | Adds mass, stiffness, and damping physics to mouse offsets and scroll progress | `CarCard`, `HorizontalShowcase`, `HeroSection`, `Navbar` |
| **`useTransform`** | Value Interpolation | `motion/react` | Maps normalized spring values to 3D rotation angles (`rotateX`, `rotateY`), glare gradients, and parallax translations | `CarCard`, `HorizontalShowcase`, `HeroSection` |
| **`useScroll`** | Scroll Observation | `motion/react` | Tracks window scroll progress (`scrollYProgress`) and container scroll offsets (`scrollY`) | `Navbar`, `HeroSection` |
| **`useMotionValueEvent`** | Motion Event Listener | `motion/react` | Listens to scroll value changes to trigger state updates (e.g., toggling the shrinking navbar) without polling | `Navbar` |

---

## React Core Hooks Deep Dive

### 1. `useState`

#### Purpose
`useState` is the fundamental state primitive in React. It stores component-local variables that trigger visual re-renders when updated.

#### Key Usages in New Royal Cars:
1. **Application Core Navigation (`src/App.tsx`)**:
   - `viewMode`: Controls `'public'` showroom mode vs. `'admin'` dealer suite mode.
   - `activeSection`: Tracks the current highlighted public section (`'hero'`, `'spotlight'`, `'showroom'`, `'trust'`).
   - `cars`: Central array of all vehicles with live CRUD updates.
   - `enquiries`: Central storage for customer test-drive and purchase enquiries.
   - `filters`: Multi-criteria filter state (search query, brand, price range, transmission, fuel type, AC requirement, sorting).
   - `selectedCar`: Currently opened car in the full-screen technical specifications modal.
   - `enquiryModalCar`: Vehicle selected for test-drive / enquiry modal.

2. **Vehicle Specification Modal & EMI Calculator (`src/components/public/CarDetailsModal.tsx`)**:
   - `activeImageIndex`: Tracks which gallery image is viewed in high-resolution.
   - `tenureYears`: Loan duration (1 to 7 years) for real-time monthly payment calculation.
   - `downPaymentPercent`: Down payment slider percentage (10% to 50%).
   - `copiedLink`: Visual feedback toggle when sharing vehicle URL.

3. **Customer Enquiry Form (`src/components/public/EnquiryModal.tsx`)**:
   - Form inputs: `name`, `phone`, `email`, `acRequired`, `preferredDate`, `message`.
   - Submission state: `isSubmitting`, `submitted`, `referenceId`.

4. **Dealership Admin Management (`src/components/admin/*`)**:
   - `AdminManageCars.tsx`: Search text, availability status filters, car deletion confirmation modals.
   - `AdminAddCar.tsx`: Form fields for adding or editing cars (name, brand, model, price, KM range, fuel, transmission, description, specifications list, image URLs).
   - `AdminEnquiries.tsx`: Search, status filter (`'all'`, `'Pending'`, `'Contacted'`, `'Converted'`), and drawer selection.
   - `AdminSettings.tsx`: Dealership profile settings and SMS/Email alert preferences.

#### Code Example (`src/components/public/CarDetailsModal.tsx`):
```tsx
// Interactive EMI Calculation State
const [activeImageIndex, setActiveImageIndex] = useState(0);
const [tenureYears, setTenureYears] = useState(4);
const [downPaymentPercent, setDownPaymentPercent] = useState(20);
```

---

### 2. `useEffect`

#### Purpose
`useEffect` synchronizes components with external systems, timers, browser APIs, and handles initialization or teardown logic.

#### Key Usages in New Royal Cars:
1. **Local Storage Persistence (`src/App.tsx`)**:
   - Saves vehicle updates, additions, deletions, and customer enquiries to `localStorage` so changes persist across page reloads.
2. **High-Performance Canvas Particle Loop (`src/components/common/BackgroundCanvas.tsx`)**:
   - Initializes the `<canvas>` 2D context, listens to `window.resize` and `window.mousemove`, and maintains an active 60FPS `requestAnimationFrame` loop with proper cleanup on unmount.
3. **Animated Stat Counters (`src/components/admin/StatCard.tsx`)**:
   - Creates an ease-out number incrementing animation when stat cards scroll into view or change values.
4. **Form Initialization (`src/components/admin/AdminAddCar.tsx`)**:
   - Populates the editing form whenever an `initialCar` is provided or modified.

#### Code Example (`src/components/admin/StatCard.tsx`):
```tsx
useEffect(() => {
  let start = 0;
  const duration = 1200;
  const startTime = performance.now();

  const updateNumber = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    setDisplayValue(Math.floor(start + (numericValue - start) * easeOut));

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  };

  requestAnimationFrame(updateNumber);
}, [numericValue]);
```

---

### 3. `useRef`

#### Purpose
`useRef` creates a persistent mutable container whose value does not trigger re-renders when mutated. In this project, it is primarily used for direct DOM references and high-frequency animation tracking.

#### Key Usages in New Royal Cars:
1. **Bounding Box Calculations for 3D Tilt (`src/components/public/CarCard.tsx` & `HorizontalShowcase.tsx`)**:
   - References the card HTML element (`cardRef = useRef<HTMLDivElement>(null)`) to obtain `getBoundingClientRect()` on mouse move.
2. **Scroll Target Reference (`src/components/public/HeroSection.tsx`)**:
   - Serves as the scroll container target for Framer Motion's `useScroll({ target: containerRef })`.
3. **Smooth Horizontal Carousel Navigation (`src/components/public/HorizontalShowcase.tsx`)**:
   - References the horizontal track (`scrollContainerRef = useRef<HTMLDivElement>(null)`) to execute smooth programmatic `scrollBy` operations.
4. **Canvas Animation State (`src/components/common/BackgroundCanvas.tsx`)**:
   - Keeps track of mouse coordinates (`mouseRef = useRef({ x, y })`) and particle arrays without causing React render overhead.

#### Code Example (`src/components/public/CarCard.tsx`):
```tsx
const cardRef = useRef<HTMLDivElement | null>(null);

const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = cardRef.current?.getBoundingClientRect();
  if (!rect) return;
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;
  const normX = clientX / rect.width - 0.5;
  const normY = clientY / rect.height - 0.5;
  x.set(normX);
  y.set(normY);
};
```

---

### 4. `useMemo`

#### Purpose
`useMemo` caches the result of expensive computations and only recalculates when specific dependencies change.

#### Key Usages in New Royal Cars:
1. **Multi-Criteria Vehicle Filtering & Sorting (`src/App.tsx`)**:
   - Filters through all cars based on query search, brand, min/max price sliders, fuel types, transmission, and AC preference, followed by sorting by price or year.
2. **Dynamic Brand Extraction (`src/App.tsx`)**:
   - Computes a distinct list of available automobile brands from the active inventory for the filter pill bar.

#### Code Example (`src/App.tsx`):
```tsx
const filteredCars = useMemo(() => {
  return cars.filter((car) => {
    // 1. Text Search across name, brand, model, carNumber
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        car.name.toLowerCase().includes(q) ||
        car.brand.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.carNumber.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 2. Brand Filter
    if (filters.brand !== 'All' && car.brand !== filters.brand) return false;

    // 3. Price Range Filter
    if (car.price < filters.minPrice || car.price > filters.maxPrice) return false;

    // 4. AC Requirement Filter
    if (filters.acOnly && !car.ac) return false;

    // 5. Fuel Type Filter
    if (filters.fuel !== 'All' && car.fuel !== filters.fuel) return false;

    // 6. Transmission Filter
    if (filters.transmission !== 'All' && car.transmission !== filters.transmission) return false;

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'price-asc') return a.price - b.price;
    if (filters.sortBy === 'price-desc') return b.price - a.price;
    if (filters.sortBy === 'year-desc') return b.year - a.year;
    return a.id.localeCompare(b.id);
  });
}, [cars, filters]);
```

---

## Framer Motion Animation & Physics Hooks Deep Dive

### 5. `useMotionValue`

#### Purpose
`useMotionValue` creates an animated value that updates outside of React's render cycle. Changing its value with `.set()` directly alters DOM styles via CSS transforms on the GPU, achieving silky 120FPS interactions.

#### Key Usages in New Royal Cars:
- **`CarCard.tsx`**: `const x = useMotionValue(0)` and `const y = useMotionValue(0)` hold the cursor's normalized coordinates `[-0.5, 0.5]` relative to the card's dimensions.
- **`HorizontalShowcase.tsx`**: Tracks the mouse position over each featured showcase vehicle card.
- **`HeroSection.tsx`**: Tracks mouse hover offsets over the hero showcase vehicle stage.

---

### 6. `useSpring`

#### Purpose
`useSpring` converts a raw motion value or scroll progress into a physically simulated spring with customizable `stiffness`, `damping`, and `mass`. This eliminates abrupt movements and creates a natural, weighty feel.

#### Key Usages in New Royal Cars:
1. **Buttery 3D Card Tilt (`CarCard.tsx` & `HorizontalShowcase.tsx`)**:
   ```tsx
   const mouseXSpring = useSpring(x, { stiffness: 260, damping: 25, mass: 0.5 });
   const mouseYSpring = useSpring(y, { stiffness: 260, damping: 25, mass: 0.5 });
   ```
2. **Luxury Scroll Progress Indicator (`Navbar.tsx`)**:
   ```tsx
   const { scrollYProgress } = useScroll();
   const scaleX = useSpring(scrollYProgress, {
     stiffness: 140,
     damping: 30,
     restDelta: 0.001,
   });
   ```
3. **Smooth Hero Parallax (`HeroSection.tsx`)**:
   ```tsx
   const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
   const smoothProgress = useSpring(scrollYProgress, { stiffness: 150, damping: 25 });
   ```

---

### 7. `useTransform`

#### Purpose
`useTransform` creates a new motion value by mapping an existing one through a range or mathematical function.

#### Key Usages in New Royal Cars:
1. **Card 3D Rotation (`CarCard.tsx`)**:
   - Maps normalized vertical cursor position `[-0.5, 0.5]` to `rotateX` (`['6.5deg', '-6.5deg']`).
   - Maps normalized horizontal cursor position `[-0.5, 0.5]` to `rotateY` (`['-6.5deg', '6.5deg']`).
2. **Layered Image Parallax (`CarCard.tsx`)**:
   - Translates the vehicle photograph slightly in the direction of the cursor (`['-4px', '4px']`).
3. **Dynamic Glare Sheen Reflection (`CarCard.tsx` & `HorizontalShowcase.tsx`)**:
   - Maps cursor position to the center of a radial glare gradient:
   ```tsx
   const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['10%', '90%']);
   const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['10%', '90%']);
   ```
4. **Hero Scroll Parallax Speeds (`HeroSection.tsx`)**:
   - Moves headline text upward faster than the vehicle: `useTransform(smoothProgress, [0, 1], ['0px', '-90px'])`.
   - Fades out headline text smoothly: `useTransform(smoothProgress, [0, 0.65], [1, 0])`.
   - Moves the hero car stage downward at an offset: `useTransform(smoothProgress, [0, 1], ['0px', '70px'])`.
   - Scales the hero car stage gently: `useTransform(smoothProgress, [0, 1], [1, 0.97])`.

---

### 8. `useScroll`

#### Purpose
`useScroll` observes scroll progression either across the entire window viewport or relative to a specific target container.

#### Key Usages in New Royal Cars:
1. **Window-Level Scroll Tracking (`src/components/public/Navbar.tsx`)**:
   - `const { scrollY, scrollYProgress } = useScroll();`
   - Supplies `scrollY` for checking when the user has scrolled past the 35px threshold.
   - Supplies `scrollYProgress` for driving the top golden progress bar.
2. **Section-Level Scroll Parallax (`src/components/public/HeroSection.tsx`)**:
   - `const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });`
   - Generates a normalized `0` to `1` value as the hero section scrolls out of the viewport.

---

### 9. `useMotionValueEvent`

#### Purpose
`useMotionValueEvent` safely listens to changes emitted by a motion value (such as `scrollY` or `scrollYProgress`) and invokes a callback. It replaces costly `window.addEventListener('scroll', ...)` listeners and avoids throttling bugs.

#### Key Usage in New Royal Cars (`src/components/public/Navbar.tsx`):
```tsx
const { scrollY } = useScroll();

useMotionValueEvent(scrollY, 'change', (latest) => {
  setIsScrolled(latest > 35);
});
```
When `latest` exceeds `35px`, `isScrolled` turns `true`, which continuously transforms the navbar into a floating glass capsule.

---

## Hook Composition Patterns

### Pattern A: Framer Motion `whileHover` 3D Mouse Tilt & Dynamic Glare
**Files**: `src/components/public/CarCard.tsx`, `src/components/public/HorizontalShowcase.tsx`

```text
User Hovers & Moves Mouse
      │
      ▼
useRef (cardRef.current.getBoundingClientRect())
      │
      ├─► Calculates normalized coordinates [-0.5, 0.5]
      │   ├─► Updates rotateX (-normY * 12deg) and rotateY (normX * 12deg) state
      │   └─► Sets motion values (x, y) for spring glare and image translation
      │
      ▼
motion.div whileHover={{
  rotateX: rotateX,
  rotateY: rotateY,
  y: -5,
  scale: 1.015,
  transition: { type: 'spring', stiffness: 320, damping: 22 }
}}
      │
      ├───────────────────────┬───────────────────────┐
      ▼                       ▼                       ▼
  Card 3D Tilt Body        Glass Glare          Parallax Vehicle
 (GPU CSS 3D matrix)    (Radial Gradient)         (translateZ)
```

```tsx
// Excerpt from src/components/public/CarCard.tsx:
<motion.div
  ref={cardRef}
  onMouseMove={handleMouseMove}
  onMouseLeave={handleMouseLeave}
  initial={{ opacity: 0, y: 35, filter: 'blur(8px)' }}
  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  viewport={{ once: true, margin: '-30px' }}
  whileHover={{
    rotateX: rotateX,
    rotateY: rotateY,
    y: -5,
    scale: 1.015,
    transition: { type: 'spring', stiffness: 320, damping: 22 },
  }}
  style={{
    transformStyle: 'preserve-3d',
    perspective: 1000,
  }}
>
```

### Pattern B: Continuous Scroll Progress & Shrinking Navbar
**File**: `src/components/public/Navbar.tsx`

```text
Window Scroll Event
      │
      ▼
useScroll() ────┬──────────────────────────────────────┐
                ▼                                      ▼
             scrollY                            scrollYProgress
                │                                      │
                ▼                                      ▼
      useMotionValueEvent                     useSpring(stiffness: 140)
                │                                      │
                ▼                                      ▼
      setIsScrolled(latest > 35)              scaleX Motion Value
                │                                      │
                ▼                                      ▼
    Smooth Morph to Floating Glass          Gold Progress Bar along Top
   (Padding, Blur, Border & Capsule)
```

### Pattern C: Layered Hero Parallax
**File**: `src/components/public/HeroSection.tsx`

```text
useScroll({ target: containerRef })
                │
                ▼
      smoothProgress (useSpring)
                │
   ┌────────────┼────────────┬────────────┐
   ▼            ▼            ▼            ▼
 textY     textOpacity   vehicleY   vehicleScale
(-90px)     (1 -> 0)     (+70px)    (1 -> 0.97)
```

### Pattern D: High-Performance 60FPS Ambient Particle Canvas
**File**: `src/components/common/BackgroundCanvas.tsx`

```text
useEffect (mount)
    │
    ├─► Initializes Canvas 2D Context
    ├─► useEventListener: tracks window resize & mouseRef
    └─► Runs requestAnimationFrame render loop (60 FPS)
           │
           ├─► Radial Mouse Spotlight
           ├─► Floating Stardust Particles & Twinkle
           └─► Hero Light Rays (Linear Gradients)
```

---

## Summary

The frontend leverages **9 specialized React and Framer Motion hooks** designed for optimal performance:
- Data state and UI reactivity are handled cleanly via `useState` and `useMemo`.
- DOM references and long-lived animation frames run through `useRef` and `useEffect`.
- High-frequency mouse interactions and scroll choreography run purely on the GPU through Motion's `useMotionValue`, `useSpring`, `useTransform`, `useScroll`, and `useMotionValueEvent`, ensuring a stutter-free 60FPS to 120FPS luxury browsing experience.
