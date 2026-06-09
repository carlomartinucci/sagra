import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

test('renders the offline prefix selection screen on first load', () => {
  const { getByText } = render(
    <Provider store={store}>
      <App firestore={undefined} />
    </Provider>
  );

  // With no stored countPrefix the app asks the operator to pick A/B/C.
  expect(getByText(/Scegli il prefisso/i)).toBeInTheDocument();
});
