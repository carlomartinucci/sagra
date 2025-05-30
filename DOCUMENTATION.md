# Sagra App - Complete Documentation

## Overview
Sagra is a React-based point-of-sale (POS) system designed specifically for Italian festival food stalls (sagre). The app manages orders, handles payments, prints receipts with offline capabilities, and tracks daily portion limits for popular items.

## Technology Stack
- **Frontend**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **UI Framework**: React Bootstrap 5
- **Database**: Firebase Firestore (Lite)
- **Menu Data**: Google Sheets integration
- **Printing**: react-to-print library

---

## Setup and Configuration

### Required Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_SAGRA_ID=your_sagra_identifier
REACT_APP_SHEETS_API_KEY=your_google_sheets_api_key
REACT_APP_SHEET_ID=your_google_sheet_id
```

### Firebase Setup
The app connects to a Firebase project with:
- **Project ID**: sagra-360015
- **Database**: Firestore (with collections: `sagre/{SAGRA_ID}`, `sagre/{SAGRA_ID}/orderHistory`, and `sagre/{SAGRA_ID}/dailyPortions`)

### Google Sheets Integration
Menu data is pulled from a Google Sheet with a worksheet named "menu". The sheet should contain columns for:
- `name`: Product name
- `euroCents`: Price in euro cents (e.g., 500 for €5.00)
- `color`: Background color for the product badge (hex format)
- `order`: Display order (numeric)
- `description`: Product description
- `dailyPortions`: Maximum portions available per day (leave empty for unlimited)
- `criticalThreshold`: When to show low stock warning (default: 20)

---

## Core Features

### 1. Order Management Workflow
The app follows a 5-step workflow:
1. **Pre-order** (`pre`): Set table number and covers
2. **Menu** (`order`): Select items and quantities with portion warnings
3. **Recap** (`recap`): Review order
4. **Payment** (`pay`): Handle payment and calculate change
5. **Done** (`done`): Print receipt, decrement portions, and start new order

### 2. Offline-First Architecture
- **Order Numbering**: Uses Firebase for sequential numbering with offline fallback
- **Menu Caching**: Google Sheets data is cached in localStorage
- **Offline Prefixes**: A/B prefixes for offline order numbers
- **Portion Sync**: Portion decrements queued for offline sync

### 3. Multi-Mode Payment System
- **Cash**: Manual amount entry with change calculation
- **POS**: Electronic payment (no change needed)
- **Service**: Complimentary service (no payment)

### 4. **Daily Portion Tracking** *(NEW FEATURE)*
- **Automatic Reset**: Portions reset daily at 4pm Italian time
- **Visual Warnings**: Shows remaining portions when below critical threshold
- **Firebase Storage**: Uses date-based document IDs (YYYY-MM-DD) for historical tracking
- **Offline Resilience**: Portion decrements queued when offline

---

## Hidden Features and Non-Obvious Functionality

### 1. Secret Keyboard Shortcut: "alpaca"
**How it works**: Type "alpaca" on any screen
**Effect**: Resets the offline counter prefix to empty, forcing the prefix selection screen to appear
**Use case**: Quick reset when switching between terminals or staff members

**Implementation**: Uses `useDetectKeypress` hook that monitors keystrokes without modifier keys

### 1.5. **Secret Keyboard Shortcut: "pizza"** *(NEW)*
**How it works**: Type "pizza" on any screen
**Effect**: Force reloads daily portions from Google Sheets, overwriting Firebase data
**Use case**: Refresh portions when Google Sheets is updated or troubleshooting portion issues
**Debug**: Check browser console for detailed logging of the reload process

**Implementation**: Uses `forceReloadDailyPortions` action with extensive console logging

### 2. Screen Wake Lock Management
**Visual Indicator**: The navbar shows emoji status:
- 💡 (light bulb) = Screen wake lock is active
- 📺 (TV) = Screen wake lock failed or released

**Purpose**: Prevents the tablet/device screen from turning off during service
**Automatic**: Reactivates when the app becomes visible again

### 3. Offline Counter System
**Online Mode**: 4-digit sequential numbers (0001, 0002, etc.)
**Offline Mode**: 3-digit numbers with prefix (A001, B001, etc.)
**Persistence**: Uses localStorage for offline counting
**Random Start**: If no stored count exists, starts from random number to avoid conflicts

### 4. Smart Cover Handling
**Special Inputs**:
- "Da asporto" (Takeaway): Sets table to empty, shows "Da asporto" as covers
- "Aggiunta" (Addition): For adding items to existing orders
- Numeric input: Automatically formats as "X coperti" (X covers)

### 5. Notes System
**Hidden UI**: Click the edit icon (✏️) next to any product to add kitchen notes
**Warning**: Red warning appears if notes exist but quantity is 0
**Printing**: Notes appear in bold on kitchen receipts

### 6. **Daily Portion Warnings** *(NEW)*
**Visual Indicators**:
- 🔴 Red dot + count: ≤5 portions remaining
- ⚠️ Orange warning + count: Below critical threshold (default 20)
- ❌ "Esaurito": 0 portions remaining (grayed out)
- **Visual-only**: Users can still order sold-out items (no blocking)

**Automatic Reset Logic**:
- Checks daily at 4pm Italian time (Europe/Rome timezone)
- Creates new Firebase document with date-based ID
- Pulls fresh portion limits from Google Sheets
- Maintains historical records for analytics

### 7. **Portion Sync Strategy** *(NEW)*
**Online Mode**: 
- Immediate Firebase decrement on order confirmation
- Optimistic local updates for responsiveness
- Real-time sync across terminals

**Offline Mode**:
- Local portion tracking in Redux state
- Queued decrements in localStorage (`pendingPortionDecrements`)
- Automatic sync when connectivity restored

### 8. Data Export Capability
**Hidden Feature**: Order history can be exported to CSV
**Implementation**: The `download` function in `logOrder.js` is commented out but functional
**Data**: Exports date, order number, quantity, product name, and price

### 9. Visual Cash Calculator
**Euro Bills and Coins**: Clicking on currency images adds that amount to payment
**Available Denominations**: 
- Coins: €0.50, €1, €2
- Bills: €5, €10, €20, €50, €100
**Smart Layout**: Responsive grid layout for touch-friendly operation

### 10. Dual Receipt Printing
**Always Prints Two Copies**: Customer copy and kitchen copy
**Kitchen Optimized**: 
- Large fonts for kitchen visibility
- Product notes prominently displayed
- Order number in huge font (20vw)
- Header image customization support

### 11. Dynamic Font Sizing on Receipts
**Smart Scaling**: Receipt font size adjusts based on order complexity:
- **Big Font**: ≤9 items (including notes) → 6vw quantity, 4.4vw product name
- **Small Font**: ≥13 items → 3.5vw quantity, 2.8vw product name
- **Medium Font**: 10-12 items → 4.5vw quantity, 3.2vw product name

### 12. Menu Synchronization Strategy
**Primary**: Fetches from Google Sheets on app load
**Fallback**: Uses localStorage cached version if Sheets unavailable
**Caching**: Automatically caches successful fetches
**Real-time**: Updates require app refresh (no real-time sync)

---

## Database Schema

### Firebase Collections

#### `sagre/{SAGRA_ID}`
```javascript
{
  count: number  // Current order counter
}
```

#### `sagre/{SAGRA_ID}/orderHistory/{orderId}`
```javascript
{
  count: string,           // Order number (e.g., "0001" or "A001")
  cachedQuantity: number,  // Total items in order
  cachedEuroCents: number, // Total price in euro cents
  created: timestamp,      // Server timestamp
  products: [              // Array of ordered products
    {
      euroCents: number,
      name: string,
      quantity: number
    }
  ],
  mode: string            // Payment mode: "cash", "POS", or "servizio"
}
```

#### **`sagre/{SAGRA_ID}/dailyPortions/{YYYY-MM-DD}`** *(NEW)*
```javascript
{
  date: string,           // Date string (YYYY-MM-DD)
  created: timestamp,     // Server timestamp
  portions: {             // Product portion tracking
    [productName]: {
      remaining: number,        // Current remaining portions
      criticalThreshold: number, // Warning threshold
      isLimited: boolean        // Whether this product has limits
    }
  }
}
```

### Google Sheets Schema
The menu sheet should have these columns:
- `name`: Product name (can include line breaks)
- `euroCents`: Price in cents (integer)
- `color`: Background color (hex, e.g., "#FF0000")
- `order`: Sort order (integer)  
- `description`: Product description
- **`dailyPortions`**: *(NEW)* Daily portion limit (integer, empty = unlimited)
- **`criticalThreshold`**: *(NEW)* Low stock warning threshold (integer, default: 20)

**Example Google Sheets Data:**
```
name          | euroCents | color   | order | dailyPortions | criticalThreshold
Lasagne       | 800       | #FF5733 | 1     | 50           | 15
Pizza Marghe. | 500       | #33FF57 | 2     |              |     (unlimited)
Pasta Fresca  | 600       | #3357FF | 3     | 30           | 10
```

---

## Daily Portion Management

### Setup Process
1. **Google Sheets Configuration**: Add `dailyPortions` and `criticalThreshold` columns
2. **Set Portion Limits**: Enter maximum daily portions for limited items
3. **Configure Thresholds**: Set when to show warnings (default: 20)

### Operational Workflow
1. **4pm Reset**: New daily portions automatically created after 4pm Italian time
2. **Visual Warnings**: Staff see remaining portions when below threshold
3. **Order Processing**: Portions automatically decremented on order confirmation
4. **Historical Tracking**: Previous days' data preserved for analytics

### Staff Training Points
- **Not Blocking**: Sold-out items can still be ordered (visual warning only)
- **Manual Override**: Kitchen can prepare extra if needed
- **Timing Important**: 4pm reset means setup portions before evening service
- **Offline Resilience**: App continues working without internet

---

## Error Handling and Resilience

### 1. Network Failure Handling
- **Firebase Unavailable**: Falls back to localStorage counter
- **Google Sheets Unavailable**: Uses cached menu data
- **Portion Sync**: Queues decrements for later sync
- **Graceful Degradation**: App continues functioning without cloud connectivity

### 2. Order Number Generation
- **Race Condition Protection**: TODO comment indicates atomic operations needed
- **Prefix System**: Prevents conflicts between terminals during network issues
- **Random Fallback**: Uses random starting number if no cached count

### 3. Print Failure Recovery
- **Reprint Option**: "Stampa di nuovo" button on completion screen
- **Manual Backup**: Warning message for manual order number writing
- **Navigation Flexibility**: Can go back through workflow if needed

### 4. **Portion Data Protection** *(NEW)*
- **Date Validation**: Italian timezone calculations for accurate daily resets
- **Fallback Caching**: localStorage backup for portion data
- **Error Recovery**: Graceful handling of Firebase connectivity issues
- **Data Integrity**: Prevents negative portion counts

---

## Performance Optimizations

### 1. Component Optimization
- **React.memo**: ProductRow components avoid unnecessary re-renders
- **Callback Optimization**: useCallback for event handlers
- **State Management**: Centralized Redux store for consistent state

### 2. Print Optimization
- **CSS Print Styles**: Separate print-only CSS with page breaks
- **Image Optimization**: Cached currency images for fast loading
- **Layout Efficiency**: CSS Grid for responsive currency calculator

### 3. Data Efficiency
- **Selective Rendering**: Only renders products with quantity > 0 in recap
- **Computed Values**: Cached totals and quantities in database
- **Lazy Loading**: Google Sheets data loaded on app initialization
- **Optimistic Updates**: Immediate UI feedback for portion changes

---

## Customization Points

### 1. Currency Images
Location: `src/images/` (050.jpeg, 1.jpeg, 2.jpeg, etc.)
**Customizable**: Replace with local currency or custom designs

### 2. Header Image
Location: `src/images/forno-2024.jpeg`
**Usage**: Appears on all printed receipts
**Customizable**: Replace with event/festival specific branding

### 3. Color Scheme
**Product Colors**: Defined in Google Sheets per product
**Theme**: Bootstrap 5 classes with dark navbar
**Text Contrast**: Automatic black/white text based on background brightness
**Portion Warnings**: Red/orange color coding for stock levels

### 4. Language and Text
**Hardcoded Italian**: All UI text is in Italian
**Customizable**: Edit component JSX files for different languages
**Currency**: Uses Italian locale formatting (€X,XX)

### 5. **Portion Thresholds** *(NEW)*
**Critical Threshold**: Configurable per product in Google Sheets
**Warning Colors**: Customizable in Order.tsx component
**Reset Time**: Currently 4pm, modifiable in orderSlice.ts

---

## Deployment Considerations

### 1. Environment Setup
- Configure Firebase project with appropriate security rules
- Set up Google Sheets API access with proper permissions
- Configure environment variables for production
- **Add dailyPortions collection permissions in Firebase rules**

### 2. Device Configuration
- **Printer Setup**: Ensure browser print settings are configured
- **Kiosk Mode**: Consider browser kiosk mode for dedicated terminals
- **Touch Optimization**: App designed for touch interfaces
- **Timezone Accuracy**: Verify system timezone for accurate 4pm resets

### 3. Backup Procedures
- **Order Export**: Implement the CSV export feature for data backup
- **Menu Backup**: Keep offline copies of menu data
- **Counter Backup**: Monitor and backup counter values
- **Portion History**: Daily portion records provide historical data

---

## Troubleshooting Guide

### Common Issues

1. **Order numbers not incrementing**
   - Check Firebase connectivity
   - Verify REACT_APP_SAGRA_ID configuration
   - Look for prefix selection screen

2. **Menu not loading**
   - Check Google Sheets API permissions
   - Verify REACT_APP_SHEET_ID and REACT_APP_SHEETS_API_KEY
   - Check browser localStorage for cached menu

3. **Printing issues**
   - Verify browser print settings
   - Check print preview before printing
   - Use "Stampa di nuovo" for reprints

4. **Screen keeps turning off**
   - Check wake lock emoji in navbar
   - Verify HTTPS connection (required for wake lock)
   - Check browser permissions

5. **Portion warnings not showing** *(NEW)*
   - Verify Google Sheets has `dailyPortions` and `criticalThreshold` columns
   - Check Firebase connectivity and permissions
   - Verify Italian timezone settings (Europe/Rome)
   - Check browser console for portion loading errors

6. **Portions not resetting at 4pm** *(NEW)*
   - Verify system timezone is correct
   - Check that app is actively used after 4pm for reset trigger
   - Manual page refresh may be needed
   - Check Firebase permissions for dailyPortions collection

### Debug Information
- **Console Logs**: Check browser console for error messages
- **localStorage**: 
  - Menu data stored in "menu" key
  - Portion data cached in "dailyPortions_{date}" keys
  - Pending portion decrements in "pendingPortionDecrements"
- **Counter Storage**: Offline counter in "count" and "countPrefix" keys

---

## Security Considerations

### 1. Data Protection
- **Firebase Rules**: Implement proper Firestore security rules for all collections
- **API Keys**: Restrict Google Sheets API key to specific domains
- **Environment Variables**: Never commit .env files to version control

### 2. Access Control
- **No Authentication**: App currently has no user authentication
- **Recommendation**: Add simple PIN/password for production use
- **Audit Trail**: All orders and portion changes logged with timestamps

### 3. Data Privacy
- **Customer Data**: No personal information stored
- **Transaction Records**: Only order details and amounts stored
- **Portion Data**: Only product quantities, no customer identification
- **GDPR Compliance**: Minimal data collection by design

---

## Future Enhancement Opportunities

### 1. Planned Features (from TODO comments)
- Atomic counter increments to prevent race conditions
- Real-time order synchronization across multiple terminals
- Enhanced data export functionality

### 2. Suggested Improvements
- User authentication system
- Real-time menu updates
- Multi-language support
- Advanced reporting dashboard with portion analytics
- Integration with fiscal printers
- Customer display screens
- Inventory management
- Staff scheduling integration
- Real-time portion sync across terminals
- Portion adjustment admin panel
- Predictive low-stock warnings

### 3. **Portion Feature Enhancements** *(NEW)*
- Admin interface for real-time portion adjustments
- Portion analytics and forecasting
- Integration with kitchen preparation queue
- Automatic portion replenishment notifications
- Multi-location portion synchronization
- Waste tracking and reporting

---

#### Admin Interface

The secret "pizza" shortcut opens a comprehensive admin panel for managing daily portions:

**Features:**
- **Product List**: Shows ALL products (23 total) with their portion status
- **5-Column Layout**:
  - **Prodotto**: Product name
  - **Google Sheets**: Shows original `dailyPortions` and `criticalThreshold` values as badges
  - **Attuale**: Current remaining portions with status icons (✅/⚠️/🔴/❌), plus actual critical threshold when different from Google Sheets
  - **Azioni**: Quick adjustment buttons (-10, +10, +25, +50) for limited items
  - **Reset**: Individual reset button (🔄) to restore product to Google Sheets values

**Admin Actions:**
- **Individual Reset**: Each limited product has a 🔄 button to reset only that product to its original Google Sheets values (both `dailyPortions` and `criticalThreshold`)
- **Global Reset**: "Reset Tutto da Google Sheets" button reloads ALL products from Google Sheets
- **Quick Adjustments**: Buttons to add/subtract portions in common increments
- **Real-time Sync**: All changes immediately sync to Firebase and update across terminals
- **Threshold Monitoring**: Yellow warning badge shows actual critical threshold when it differs from Google Sheets values

**Reset Behavior:**
- Individual resets restore both `remaining`