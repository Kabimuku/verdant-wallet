# Category Page UI Testing Checklist

## Layout Tests
- [ ] Reset button is completely removed from filter card
- [ ] Header title reads "Category Manage" instead of "Category Management"
- [ ] Header title font size is smaller and fits on 320px screens
- [ ] Add Category button is now a small floating button in top-right
- [ ] Floating button is properly positioned and doesn't overlap content
- [ ] Container uses consistent 24px (px-6) padding on mobile
- [ ] Content has proper spacing from floating button (pt-16)

## Responsiveness Tests
- [ ] Page works on 320px, 375px, 390px, 430px widths
- [ ] Pinch-to-zoom is enabled and functional
- [ ] No horizontal scrolling required
- [ ] Floating button maintains position during scroll
- [ ] Bottom padding prevents overlap with bottom navigation

## Touch Interaction Tests
- [ ] Floating add button is ≥44×44px touch target
- [ ] Back button maintains ≥44×44px touch target
- [ ] All existing touch targets remain ≥44×44px
- [ ] Floating button doesn't interfere with list scrolling

## Accessibility Tests
- [ ] Floating button has proper focus indicator
- [ ] All existing accessibility features preserved
- [ ] Page zoom works with screen readers

## Visual Tests
- [ ] Floating button has proper shadow and visual hierarchy
- [ ] Header alignment is consistent and balanced
- [ ] Safe margins prevent content overlap
- [ ] Card spacing remains consistent