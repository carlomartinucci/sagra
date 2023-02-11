import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface OrderState {
  products: { [key: string]: Product };
}

export interface Product {
  name: string,
  quantity: number,
  euroCents: number,
  notes: string
}

export function displayEuroCents(euroCents: number){
  return '\u20AC' + (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 });;
};

const initialState: OrderState = {
  products: {
    tortelli1: {
      name: "Tordelli* classici al ragù",
      quantity: 0,
      euroCents: 1000,
      notes: ""
    },
    tortelli2: {
      name: "Tordelli* ai funghi porcini",
      quantity: 0,
      euroCents: 1000,
      notes: ""
    },
    tagliatelle1: {
      name: "Tagliatelle* al ragù",
      quantity: 0,
      euroCents: 800,
      notes: ""
    },
    tagliatelle2: {
      name: "Tagliatelle* ai funghi porcini",
      quantity: 0,
      euroCents: 800,
      notes: ""
    },
    rustico: {
      name: "Piatto Rustico",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    salumi: {
      name: "Piatto di salumi tradizionali",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    baccala: {
      name: "Baccalà Marinato",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    panzanelle1: {
      name: "Panzanelle Semplici",
      quantity: 0,
      euroCents: 100,
      notes: ""
    },
    panzanelle2: {
      name: "Panzanelle con Nutella",
      quantity: 0,
      euroCents: 300,
      notes: ""
    },
    stinco1: {
      name: "Stinco* alla Santese con patate",
      quantity: 0,
      euroCents: 1400,
      notes: ""
    },
    mezzostinco: {
      name: "Metà Stinco* alla Santese con patate",
      quantity: 0,
      euroCents: 800,
      notes: ""
    },
    patate: {
      name: "Patatine fritte",
      quantity: 0,
      euroCents: 300,
      notes: ""
    },
    torta: {
      name: "Torta di Riso",
      quantity: 0,
      euroCents: 400,
      notes: ""
    },
    crostata: {
      name: "Crostata Pere e Cioccolato",
      quantity: 0,
      euroCents: 400,
      notes: ""
    },
  },
};

export const orderSlice = createSlice({
  name: 'order',
  initialState,
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
      state.products = initialState.products
    }
  },
});

export const { increment, decrement, editNotes, reset } = orderSlice.actions;

export const selectProducts = (state: RootState) => state.order.products;

export default orderSlice.reducer;
