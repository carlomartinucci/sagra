# Sagra - Italian Festival POS System

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app), using the [Redux](https://redux.js.org/) and [Redux Toolkit](https://redux-toolkit.js.org/) TS template.

## Overview

Sagra is a React-based point-of-sale (POS) system designed specifically for Italian festival food stalls (sagre). Features include:

- **Order Management**: Complete workflow from ordering to payment and printing
- **Offline Support**: Works without internet with local data caching
- **Daily Portion Tracking**: Automatic countdown for limited menu items
- **Multi-Payment Modes**: Cash, POS, and service payments
- **Print Integration**: Dual receipt printing for customer and kitchen
- **Google Sheets Menu**: Dynamic menu loaded from Google Sheets

## Setup

### Environment Variables

Create a `.env` file in the root directory with:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_SAGRA_ID=your_sagra_identifier
REACT_APP_SHEETS_API_KEY=your_google_sheets_api_key
REACT_APP_SHEET_ID=your_google_sheet_id
```

### Google Sheets Menu Format

Your menu sheet should include these columns:
- `name`: Product name
- `euroCents`: Price in euro cents (e.g., 500 for €5.00)
- `color`: Background color (hex format)
- `order`: Display order
- `description`: Product description
- `dailyPortions`: Daily portion limit (optional, leave empty for unlimited)
- `criticalThreshold`: Low stock warning threshold (optional, default: 20)

### Firebase Setup

Configure Firestore with collections:
- `sagre/{SAGRA_ID}`: Order counter
- `sagre/{SAGRA_ID}/orderHistory`: Order records
- `sagre/{SAGRA_ID}/dailyPortions`: Daily portion tracking

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Features

### Daily Portion Tracking

The app includes a sophisticated portion tracking system:

- **Automatic Reset**: Portions reset daily at 4pm Italian time
- **Visual Warnings**: Shows remaining portions when below critical threshold
- **Offline Support**: Portion decrements queued when offline
- **Historical Data**: Maintains daily records for analytics

### Hidden Features

- Type "alpaca" to reset offline counter prefix
- Screen wake lock with visual indicators (💡/📺)
- Cash calculator with currency images
- Notes system for kitchen instructions
- CSV export capability (commented out)

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for comprehensive documentation of all features, including hidden functionality and non-obvious behaviors.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
