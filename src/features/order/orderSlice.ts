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
      name: "Tordelli al ragù",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    tortelli2: {
      name: "Pasta ripiena al forno",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    tagliatelle1: {
      name: "Lasagne di mare al forno",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    tagliatelle2: {
      name: "Girelline ricotta e spinaci",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    rustico: {
      name: "Stinco con patate",
      quantity: 0,
      euroCents: 1200,
      notes: ""
    },
    salumi: {
      name: "Mezzo stinco con patate",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    baccala: {
      name: "Cozze ripiene",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    panzanelle1: {
      name: "Piatto freddo: bresaola, rucola, scaglie di parmigiano, aceto balsamico",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    panzanelle2: {
      name: "Torta di riso",
      quantity: 0,
      euroCents: 400,
      notes: ""
    },
    stinco1: {
      name: "Torta al cioccolato",
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
