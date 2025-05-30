import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { fetchGoogleSheetsData } from '../../googleSheetsMapper';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from '@firebase/firestore/lite';

export interface OrderState {
  products: { [key: string]: Product },
  menu: any,
  dailyPortions: { [key: string]: DailyPortion },
  currentDate: string
}

export interface Product {
  name: string,
  color: string,
  quantity: number,
  euroCents: number,
  notes: string,
  order: number,
  description: string,
  dailyPortions?: number,
  criticalThreshold?: number
}

export interface DailyPortion {
  remaining: number,
  criticalThreshold: number,
  isLimited: boolean
}

export function displayEuroCents(euroCents: number){
  return '\u20AC' + (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 });;
};

export const getMenu = createAsyncThunk(
  'order/getMenu',
  async () => {
    try {
      const menuData = await fetchGoogleSheetsData({
        sheetsOptions: [{ id: 'menu' }] as any,
      });
      console.log("menuData", menuData[0].data)
      window.localStorage.setItem("menu", JSON.stringify(menuData[0].data))
      return menuData[0].data
    } catch (error) {
      console.error(error);
    }

    try {
      const rawMenu = window.localStorage.getItem("menu")
      return JSON.parse(rawMenu ?? "{}")
    } catch (error) {
      console.error(error)
    }
  }
)

// Get Italian date string for daily portions (YYYY-MM-DD)
const getItalianDateString = (date = new Date()): string => {
  return date.toLocaleDateString('sv-SE', { 
    timeZone: 'Europe/Rome' 
  });
};

// Check if we should create new daily portions (after 4pm Italian time)
const shouldCreateNewDailyPortions = (lastDate: string): boolean => {
  const now = new Date();
  const italianTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const currentItalianDate = getItalianDateString(italianTime);
  const currentHour = italianTime.getHours();
  
  // If it's after 4pm and we're on a different date, create new portions
  return currentHour >= 16 && lastDate !== currentItalianDate;
};

export const getDailyPortions = createAsyncThunk(
  'order/getDailyPortions',
  async (firestore: any, { getState }) => {
    const state = getState() as RootState;
    const currentDate = getItalianDateString();
    
    console.log('📊 Loading daily portions...');
    console.log('Current date:', currentDate);
    console.log('Menu loaded:', state.order.menu.length, 'items');
    
    try {
      // Check if we should create new daily portions
      if (shouldCreateNewDailyPortions(state.order.currentDate)) {
        console.log('🔄 Creating new daily portions (after 4pm or new date)');
        // Need to initialize new daily portions from menu data
        const dailyPortions: { [key: string]: DailyPortion } = {};
        
        for (const item of state.order.menu) {
          console.log('Processing menu item:', item.name, 'dailyPortions:', item.dailyPortions, 'criticalThreshold:', item.criticalThreshold);
          if (item.dailyPortions && parseInt(item.dailyPortions) > 0) {
            dailyPortions[item.name] = {
              remaining: parseInt(item.dailyPortions),
              criticalThreshold: parseInt(item.criticalThreshold) || 20,
              isLimited: true
            };
          }
        }
        
        console.log('Created new daily portions:', dailyPortions);
        
        // Save to Firebase
        const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/dailyPortions`, currentDate);
        await setDoc(docRef, {
          portions: dailyPortions,
          created: serverTimestamp(),
          date: currentDate
        });
        
        return { dailyPortions, currentDate };
      }
      
      // Try to load existing daily portions
      console.log('📥 Trying to load existing daily portions from Firebase...');
      const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/dailyPortions`, currentDate);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Found existing daily portions:', data.portions);
        return { dailyPortions: data.portions || {}, currentDate };
      } else {
        console.log('❌ No existing daily portions found, creating new ones...');
        // Create new daily portions from menu
        const dailyPortions: { [key: string]: DailyPortion } = {};
        
        for (const item of state.order.menu) {
          console.log('Processing menu item for new portions:', item.name, 'dailyPortions:', item.dailyPortions);
          if (item.dailyPortions && parseInt(item.dailyPortions) > 0) {
            dailyPortions[item.name] = {
              remaining: parseInt(item.dailyPortions),
              criticalThreshold: parseInt(item.criticalThreshold) || 20,
              isLimited: true
            };
          }
        }
        
        console.log('Created daily portions from menu:', dailyPortions);
        
        // Save to Firebase
        await setDoc(docRef, {
          portions: dailyPortions,
          created: serverTimestamp(),
          date: currentDate
        });
        
        return { dailyPortions, currentDate };
      }
    } catch (error) {
      console.error('❌ Error loading daily portions:', error);
      
      // Fallback to localStorage or empty state
      try {
        const cached = window.localStorage.getItem(`dailyPortions_${currentDate}`);
        if (cached) {
          console.log('📋 Using cached daily portions:', JSON.parse(cached));
          return { dailyPortions: JSON.parse(cached), currentDate };
        }
      } catch (e) {
        console.error('Error loading cached portions:', e);
      }
      
      console.log('🔄 Returning empty daily portions');
      return { dailyPortions: {}, currentDate };
    }
  }
);

export const forceReloadDailyPortions = createAsyncThunk(
  'order/forceReloadDailyPortions',
  async (firestore: any, { getState }) => {
    const state = getState() as RootState;
    const currentDate = getItalianDateString();
    
    console.log('🍕 Force reloading daily portions from Google Sheets...');
    console.log('Current date:', currentDate);
    console.log('Menu items:', state.order.menu.length);
    
    try {
      // Always create new daily portions from current menu data
      const dailyPortions: { [key: string]: DailyPortion } = {};
      
      for (const item of state.order.menu) {
        console.log('Processing item:', item.name, 'dailyPortions:', item.dailyPortions, 'criticalThreshold:', item.criticalThreshold);
        
        if (item.dailyPortions && parseInt(item.dailyPortions) > 0) {
          dailyPortions[item.name] = {
            remaining: parseInt(item.dailyPortions),
            criticalThreshold: parseInt(item.criticalThreshold) || 20, // Always use fresh value from sheets
            isLimited: true
          };
        }
      }
      
      console.log('Created daily portions:', dailyPortions);
      
      // Force save to Firebase (overwrite existing)
      const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/dailyPortions`, currentDate);
      await setDoc(docRef, {
        portions: dailyPortions,
        created: serverTimestamp(),
        date: currentDate,
        forceReloaded: true
      });
      
      // Cache in localStorage
      window.localStorage.setItem(`dailyPortions_${currentDate}`, JSON.stringify(dailyPortions));
      
      console.log('✅ Daily portions force reloaded successfully');
      
      return { dailyPortions, currentDate };
    } catch (error) {
      console.error('❌ Error force reloading daily portions:', error);
      
      // Fallback to localStorage or empty state
      try {
        const cached = window.localStorage.getItem(`dailyPortions_${currentDate}`);
        if (cached) {
          return { dailyPortions: JSON.parse(cached), currentDate };
        }
      } catch (e) {
        console.error('Error loading cached portions:', e);
      }
      
      return { dailyPortions: {}, currentDate };
    }
  }
);

export const resetSinglePortion = createAsyncThunk(
  'order/resetSinglePortion',
  async ({ firestore, productName }: { firestore: any, productName: string }, { getState }) => {
    const state = getState() as RootState;
    const currentDate = state.order.currentDate;
    
    console.log(`🔄 Resetting ${productName} to Google Sheets values...`);
    
    try {
      // Find the product in menu to get original values
      const menuItem = state.order.menu.find((item: any) => item.name === productName);
      if (!menuItem || !menuItem.dailyPortions || parseInt(menuItem.dailyPortions) <= 0) {
        console.log(`❌ ${productName} not found or not limited in menu`);
        return null;
      }
      
      const originalRemaining = parseInt(menuItem.dailyPortions);
      const originalThreshold = parseInt(menuItem.criticalThreshold) || 20;
      
      // Update Firebase
      const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/dailyPortions`, currentDate);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const portions = data.portions || {};
        
        portions[productName] = {
          remaining: originalRemaining,
          criticalThreshold: originalThreshold,
          isLimited: true
        };
        
        await updateDoc(docRef, { portions });
        
        // Cache in localStorage
        window.localStorage.setItem(`dailyPortions_${currentDate}`, JSON.stringify(portions));
        
        console.log(`✅ ${productName} reset to: ${originalRemaining} portions, threshold: ${originalThreshold}`);
        
        return { 
          productName, 
          newRemaining: originalRemaining, 
          newThreshold: originalThreshold 
        };
      }
    } catch (error) {
      console.error(`❌ Error resetting ${productName}:`, error);
    }
    
    return null;
  }
);

export const decrementPortion = createAsyncThunk(
  'order/decrementPortion',
  async ({ firestore, productName, quantity }: { firestore: any, productName: string, quantity: number }, { getState }) => {
    const state = getState() as RootState;
    const currentDate = state.order.currentDate;
    
    try {
      const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/dailyPortions`, currentDate);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const portions = data.portions || {};
        
        if (portions[productName]) {
          const newRemaining = Math.max(0, portions[productName].remaining - quantity);
          portions[productName].remaining = newRemaining;
          
          await updateDoc(docRef, { portions });
          
          // Cache in localStorage
          window.localStorage.setItem(`dailyPortions_${currentDate}`, JSON.stringify(portions));
          
          return { productName, newRemaining };
        }
      }
    } catch (error) {
      console.error('Error decrementing portion:', error);
      
      // Fallback: queue for later sync
      const queueKey = 'pendingPortionDecrements';
      const pending = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
      pending.push({ productName, quantity, date: currentDate, timestamp: Date.now() });
      window.localStorage.setItem(queueKey, JSON.stringify(pending));
    }
    
    return null;
  }
);

const emptyInitialState: OrderState = {
  products: {},
  menu: [],
  dailyPortions: {},
  currentDate: getItalianDateString()
}

export const orderSlice = createSlice({
  name: 'order',
  initialState: emptyInitialState,
  reducers: {
    increment: (state, action: PayloadAction<string>) => {
      if (state.products[action.payload] !== null) {
        state.products[action.payload].quantity += 1
      }
    },
    decrement: (state, action: PayloadAction<string>) => {
      if (state.products[action.payload] !== null && state.products[action.payload].quantity > 0) {
        state.products[action.payload].quantity -= 1
      }
    },
    editNotes: (state, action: PayloadAction<{key: string, notes: string}>) => {
      if (state.products[action.payload.key] !== null) {
        state.products[action.payload.key].notes = action.payload.notes
      }
    },
    reset: (state) => {
      state.products = {}
      for (const item of state.menu) {
        state.products[item.name] = { ...item, quantity: 0, notes: "", order: parseInt(item.order) }
      }
    },
    decrementPortionLocal: (state, action: PayloadAction<{productName: string, quantity: number}>) => {
      const { productName, quantity } = action.payload;
      if (state.dailyPortions[productName]) {
        state.dailyPortions[productName].remaining = Math.max(0, state.dailyPortions[productName].remaining - quantity);
      }
    },
    updatePortionManually: (state, action: PayloadAction<{productName: string, newQuantity: number}>) => {
      const { productName, newQuantity } = action.payload;
      if (state.dailyPortions[productName]) {
        state.dailyPortions[productName].remaining = Math.max(0, newQuantity);
      }
    },
    resetSinglePortionLocal: (state, action: PayloadAction<{productName: string, newRemaining: number, newThreshold: number}>) => {
      const { productName, newRemaining, newThreshold } = action.payload;
      if (state.dailyPortions[productName]) {
        state.dailyPortions[productName].remaining = newRemaining;
        state.dailyPortions[productName].criticalThreshold = newThreshold;
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(getMenu.fulfilled, (state, action) => {
      if (!action.payload) return

      state.menu = action.payload
      console.log('📊 Menu loaded with', action.payload.length, 'items:');
      for (const item of action.payload) {
        console.log(`  ${item.name}: dailyPortions=${item.dailyPortions}, criticalThreshold=${item.criticalThreshold}`);
        state.products[item.name] = { ...item, quantity: 0, notes: "", order: parseInt(item.order) }
      }
    })
    .addCase(getDailyPortions.fulfilled, (state, action) => {
      if (action.payload) {
        state.dailyPortions = action.payload.dailyPortions;
        state.currentDate = action.payload.currentDate;
      }
    })
    .addCase(forceReloadDailyPortions.fulfilled, (state, action) => {
      if (action.payload) {
        state.dailyPortions = action.payload.dailyPortions;
        state.currentDate = action.payload.currentDate;
      }
    })
    .addCase(resetSinglePortion.fulfilled, (state, action) => {
      if (action.payload) {
        const { productName, newRemaining, newThreshold } = action.payload;
        if (state.dailyPortions[productName]) {
          state.dailyPortions[productName].remaining = newRemaining;
          state.dailyPortions[productName].criticalThreshold = newThreshold;
        }
      }
    })
    .addCase(decrementPortion.fulfilled, (state, action) => {
      if (action.payload) {
        const { productName, newRemaining } = action.payload;
        if (state.dailyPortions[productName]) {
          state.dailyPortions[productName].remaining = newRemaining;
        }
      }
    });
  },
});

export const { increment, decrement, editNotes, reset, decrementPortionLocal, updatePortionManually, resetSinglePortionLocal } = orderSlice.actions;

export const selectProducts = (state: RootState) => state.order.products;
export const selectDailyPortions = (state: RootState) => state.order.dailyPortions;

export default orderSlice.reducer;
