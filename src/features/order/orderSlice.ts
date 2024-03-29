import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { fetchGoogleSheetsData } from '../../googleSheetsMapper';

export interface OrderState {
  products: { [key: string]: Product },
  menu: any
}

export interface Product {
  name: string,
  color: string,
  quantity: number,
  euroCents: number,
  notes: string,
  order: number,
  description: string
}

export function displayEuroCents(euroCents: number){
  return '\u20AC' + (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 });;
};

export const getMenu = createAsyncThunk(
  'order/getMenu',
  async () => {
    try {
      const menuData = await fetchGoogleSheetsData({
        sheetsOptions: [{ id: 'menu' }],
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

const emptyInitialState: OrderState = {
  products: {},
  menu: []
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
    }
  },
  extraReducers: (builder) => {
    builder.addCase(getMenu.fulfilled, (state, action) => {
      if (!action.payload) return

      state.menu = action.payload
      for (const item of action.payload) {
        state.products[item.name] = { ...item, quantity: 0, notes: "", order: parseInt(item.order) }
      }
    })
  },
});

export const { increment, decrement, editNotes, reset } = orderSlice.actions;

export const selectProducts = (state: RootState) => state.order.products;

export default orderSlice.reducer;
