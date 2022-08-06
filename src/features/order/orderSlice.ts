import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface OrderState {
  products: { [key: string]: Product };
}

export interface Product {
  name: string,
  quantity: number,
  euroCents: number
}

export function displayEuroCents(euroCents: number){
  return '\u20AC' + (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 });;
};

const initialState: OrderState = {
  products: {
    tortelli1: {
      name: "Tordelli* classici al ragù",
      quantity: 0,
      euroCents: 1000
    },
    tortelli2: {
      name: "Tordelli* ai funghi porcini",
      quantity: 0,
      euroCents: 1000
    },
    tagliatelle1: {
      name: "Tagliatelle* al ragù",
      quantity: 0,
      euroCents: 800
    },
    tagliatelle2: {
      name: "Tagliatelle* ai funghi porcini",
      quantity: 0,
      euroCents: 800
    },
    rustico: {
      name: "Piatto Rustico",
      quantity: 0,
      euroCents: 700
    },
    salumi: {
      name: "Piatto di salumi tradizionali",
      quantity: 0,
      euroCents: 700
    },
    baccala: {
      name: "Baccalà Marinato",
      quantity: 0,
      euroCents: 700
    },
    panzanelle1: {
      name: "Panzanelle Semplici",
      quantity: 0,
      euroCents: 100
    },
    panzanelle2: {
      name: "Panzanelle con Nutella",
      quantity: 0,
      euroCents: 300
    },
    stinco1: {
      name: "Stinco* alla Santese con patate",
      quantity: 0,
      euroCents: 1400
    },
    mezzostinco: {
      name: "Metà Stinco* alla Santese con patate",
      quantity: 0,
      euroCents: 800
    },
    patate: {
      name: "Patatine fritte",
      quantity: 0,
      euroCents: 300
    },
    torta: {
      name: "Torta di Riso",
      quantity: 0,
      euroCents: 400
    },
    crostata: {
      name: "Crostata Pere e Cioccolato",
      quantity: 0,
      euroCents: 400
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
    reset: (state) => {
      state.products = initialState.products
    }
  },
});

export const { increment, decrement, reset } = orderSlice.actions;

export const selectProducts = (state: RootState) => state.order.products;

export default orderSlice.reducer;
