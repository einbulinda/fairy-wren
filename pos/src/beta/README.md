# Beta POS - Nightclub Optimized Interface

A redesigned POS interface optimized for nightclub operations with a mobile-first, high-contrast design.

## Features

### Design Philosophy
- **Dark theme** with neon accents (pink/purple) for low-light environments
- **High contrast** elements for quick visibility
- **Thumb-friendly** mobile interface with large touch targets
- **Fast navigation** with minimal clicks required

### Screens

#### 1. POS Screen (BetaPOSScreen)
- Split-view layout: Products on left, Active Bill on right
- Quick product search with category filters
- Real-time stock indicators (in stock, low stock, out of stock)
- Current round management with quantity controls
- Quick action buttons for new bills, open bills, my bills
- Floating payment and void actions

#### 2. Stock Take Screen (BetaStockTakeScreen)
- Quick count interface with +/- buttons
- Visual indicators for modified counts
- Category filtering
- Search products by name
- Summary of changes before saving

#### 3. Z-Report Screen (BetaZReportScreen)
- Visual summary cards for sales, paid, pending, voided
- Payment method breakdown
- Staff performance summary
- Quick Z-Report generation

### Components

#### BetaProductGrid
- Grid layout optimized for touch
- Stock status badges
- Quick add on tap
- Visual feedback on hover/touch

#### BetaCurrentBill
- Clean round item display
- Quantity increment/decrement
- Stock warning indicators
- Quick actions (add round, pay, void, print)

#### BetaOpenBillsModal
- List of open bills with time since creation
- Total amount preview
- Quick selection

#### BetaPaymentModal
- Multi-payment method support
- Quick amount buttons
- Change calculation
- Visual payment method icons

#### BetaQuickActions
- Mobile-optimized action grid
- Badge indicators for counts
- Quick refresh/sync

## Usage

### Switching to Beta UI
1. On the login screen, click "Interface Version" toggle
2. Select "Beta" option
3. Login normally

### Switching Back to Classic
1. In Beta UI, click settings/menu icon in header
2. Select "Switch to Classic"
3. Confirm the switch

### Keyboard Shortcuts
- **Ctrl+1**: Switch to POS tab
- **Ctrl+2**: Switch to Stock tab
- **Ctrl+3**: Switch to Z-Report tab

## Mobile Navigation
- Bottom tab bar for quick navigation
- Large touch targets (min 44px)
- Swipe-friendly interactions
- Collapsed bill panel on mobile

## Technical Details

### State Management
- Uses existing Zustand stores
- Integrates with current AuthProvider
- Maintains UI version in localStorage

### API Integration
- No changes to existing API
- Uses existing service layer
- Compatible with all existing endpoints

### File Structure
```
pos/src/beta/
├── layout/
│   └── BetaMainLayout.jsx      # Main layout with navigation
├── pages/
│   ├── BetaPOSScreen.jsx       # Main POS interface
│   ├── BetaStockTakeScreen.jsx # Stock management
│   └── BetaZReportScreen.jsx   # End-of-day reports
├── components/
│   ├── BetaProductGrid.jsx     # Product display grid
│   ├── BetaCurrentBill.jsx     # Active bill panel
│   ├── BetaOpenBillsModal.jsx  # Bill selection modal
│   ├── BetaPaymentModal.jsx    # Payment processing
│   └── BetaQuickActions.jsx    # Mobile action buttons
├── index.js                    # Export barrel
└── README.md                   # This file
```

## Maintaining Compatibility

The Beta UI:
- Uses the same authentication system
- Calls the same API endpoints
- Stores data in the same format
- Respects the same permissions
- Works alongside the Classic UI

## Future Enhancements

Potential additions for future iterations:
- Split bill functionality
- Table management view
- Kitchen display integration
- Customer loyalty features
- Offline mode improvements
- Voice commands
- Barcode scanning
