# Mobile Summary Cards Testing Checklist

## Visual Layout Tests
- [ ] Cards display properly on widths 320px, 375px, 390px, 430px
- [ ] Icon is vertically centered in circular background
- [ ] Daily amount is prominently displayed (larger, bold font)
- [ ] Monthly amount is secondary (smaller, muted)
- [ ] Right-side currency value matches card color (green/red)
- [ ] No text overflow or truncation issues

## Responsive Behavior
- [ ] Cards maintain consistent left/right padding across screen sizes
- [ ] Text truncates with ellipsis when necessary
- [ ] Touch targets are minimum 44x44px
- [ ] No horizontal scrolling required
- [ ] Content doesn't overlap with bottom navigation

## Accessibility Tests
- [ ] Cards have proper aria-labels with both daily and monthly amounts
- [ ] Color is not the only indicator (+ and - signs present)
- [ ] Focus indicators are visible when navigating with keyboard
- [ ] Screen reader announces amounts correctly with currency

## Data Accuracy Tests
- [ ] Daily totals calculate correctly for today's transactions
- [ ] Monthly totals calculate correctly for current month
- [ ] Zero amounts display as ₹0 instead of empty
- [ ] Large amounts format correctly (e.g., ₹1,00,000)
- [ ] Negative amounts don't show double minus signs

## Touch Interaction Tests
- [ ] Cards respond to touch/tap if interactive
- [ ] No accidental activations from light touches
- [ ] Visual feedback on touch (if applicable)
- [ ] Touch targets don't overlap with other elements

## Cross-Browser Tests
- [ ] Layout consistent in Chrome mobile
- [ ] Layout consistent in Safari mobile
- [ ] Layout consistent in Firefox mobile
- [ ] No layout shifts during loading

## Performance Tests
- [ ] Cards render quickly without layout shift
- [ ] No performance issues when scrolling
- [ ] Calculations complete without blocking UI