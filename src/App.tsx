import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import Button from 'react-bootstrap/Button';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';

import { Order } from './features/order/Order';
import { RecapOrder, PrintableOrder } from './features/order/PrintableOrder';
import { useAppSelector, useAppDispatch } from './app/hooks';
import {
  selectCount,
  increment
} from './features/counter/counterSlice';

import {
  reset,
} from './features/order/orderSlice';

function App() {
  const [navigation, setNavigation] = useState("order")
  const count = useAppSelector(selectCount)
  const dispatch = useAppDispatch();

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: () => {
      dispatch(increment())
      dispatch(reset())
    }
  });

  return (
    <>
    <Navbar bg="dark" variant="dark">
      <Container fluid>
         <Navbar.Brand>Ordine #{count}</Navbar.Brand>
      </Container>
    </Navbar>

    {
      navigation === "order" ?
        <main>
          <Order />

          <Container fluid className="text-center">
            <Button size="lg" onClick={() => { setNavigation("confirm") }}>Conferma e paga</Button>
          </Container>
        </main> :
      navigation === "confirm" ?
        <main>
          <RecapOrder />

          <Container fluid className="text-center">
            <Button style={{ marginRight: 20 }}variant="secondary" size="lg" onClick={() => { setNavigation("order") }}>Torna all'ordine</Button>
            <Button size="lg" onClick={() => { handlePrint(); setNavigation("order") }}>Conferma e stampa</Button>
          </Container>
        </main> :
        <div></div> 
    }

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder />
    </div>
    </>
  );
}

export default App;
