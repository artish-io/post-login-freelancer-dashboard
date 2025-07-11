# Animation System Documentation

This project uses a comprehensive animation system built with Framer Motion to provide smooth, uniform transitions across all pages and components.

## 🎯 Overview

The animation system includes:
- **Page transitions** - Smooth enter/exit animations between routes
- **Navigation progress** - Visual feedback during route changes  
- **Smooth links** - Enhanced Link components with micro-interactions
- **Loading states** - Skeleton components and loading overlays
- **Stagger animations** - Coordinated animations for lists and grids
- **Hover effects** - Consistent micro-interactions

## 📁 Core Components

### 1. PageTransition (`components/ui/page-transition.tsx`)
Wraps page content with smooth enter/exit animations.

```tsx
import PageTransition from '../../../components/ui/page-transition';

export default function MyPage() {
  return (
    <PageTransition>
      <div>Your page content</div>
    </PageTransition>
  );
}
```

### 2. SmoothLink (`components/ui/smooth-link.tsx`)
Enhanced Link component with hover animations and smooth transitions.

```tsx
import SmoothLink from '../../../components/ui/smooth-link';

<SmoothLink href="/dashboard" className="button">
  Go to Dashboard
</SmoothLink>
```

### 3. NavigationProgress (`components/ui/navigation-progress.tsx`)
Shows a progress bar during route changes. Already included in root layout.

### 4. Loading Components (`components/ui/loading-skeleton.tsx`)
Pre-built skeleton components for loading states.

```tsx
import { CardSkeleton, PageSkeleton } from '../../../components/ui/loading-skeleton';

// For individual cards
{loading ? <CardSkeleton /> : <MyCard />}

// For entire pages
{loading ? <PageSkeleton /> : <MyPageContent />}
```

## 🎨 Animation Variants

Pre-defined animation variants for consistent motion:

```tsx
import { 
  staggerContainer, 
  staggerItem, 
  fadeIn, 
  slideInFromBottom, 
  scaleIn 
} from '../../../components/ui/page-transition';

// Stagger animation for lists
<motion.div variants={staggerContainer} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      {item.content}
    </motion.div>
  ))}
</motion.div>

// Simple fade in
<motion.div variants={fadeIn} initial="hidden" animate="show">
  Content
</motion.div>
```

## 🚀 Implementation Guide

### For New Pages

1. **Wrap content in PageTransition** (if not using dashboard layout):
```tsx
import PageTransition from '../../../components/ui/page-transition';

export default function NewPage() {
  return (
    <PageTransition>
      {/* Your content */}
    </PageTransition>
  );
}
```

2. **Use stagger animations for lists**:
```tsx
<motion.div variants={staggerContainer} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      <ItemComponent item={item} />
    </motion.div>
  ))}
</motion.div>
```

3. **Replace Link with SmoothLink**:
```tsx
// Before
<Link href="/path">Text</Link>

// After  
<SmoothLink href="/path">Text</SmoothLink>
```

### For Loading States

1. **Use skeleton components**:
```tsx
import { CardSkeleton } from '../../../components/ui/loading-skeleton';

{loading ? <CardSkeleton /> : <ActualCard />}
```

2. **For custom skeletons**:
```tsx
import { Skeleton } from '../../../components/ui/loading-skeleton';

<Skeleton height={20} width="80%" className="mb-2" />
```

### For Modal/Overlay Animations

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="fixed inset-0 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        Modal content
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

## 🎛️ CSS Classes

Additional CSS classes for enhanced animations:

```css
/* Smooth hover effects */
.smooth-hover {
  transition: all 0.2s ease-out;
}

.smooth-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Loading skeleton */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

## ⚡ Performance Tips

1. **Use `AnimatePresence` for conditional rendering**
2. **Prefer `variants` over inline animations** for better performance
3. **Use `layout` prop sparingly** - only when needed
4. **Optimize with `will-change: transform`** for heavy animations

## 🔧 Configuration

Animation timing can be adjusted in `page-transition.tsx`:

```tsx
const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4, // Adjust global timing
};
```

## 📱 Responsive Considerations

- Animations automatically respect `prefers-reduced-motion`
- Mobile animations are optimized for performance
- Touch interactions include appropriate feedback

## 🎯 Best Practices

1. **Consistency** - Use predefined variants when possible
2. **Performance** - Avoid animating expensive properties
3. **Accessibility** - Respect motion preferences
4. **Timing** - Keep animations snappy (200-400ms)
5. **Purpose** - Every animation should enhance UX, not distract

## 🐛 Troubleshooting

**Animation not working?**
- Check if Framer Motion is imported
- Ensure `initial` and `animate` props are set
- Verify component is wrapped in `motion.div`

**Performance issues?**
- Use `transform` and `opacity` instead of layout properties
- Add `will-change: transform` to CSS
- Consider reducing animation complexity on mobile
