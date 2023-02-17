import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import Button from 'react-bootstrap/Button';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';

import { Order } from './features/order/Order';
import { RecapOrder, PrintableOrder, Total } from './features/order/PrintableOrder';
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
    content: () => componentRef.current
  });

  return (
    <>
    <div className="d-print-none mb-5">
      <Navbar bg="dark" variant="dark">
        <Container fluid>
          <Navbar.Brand onClick={() => setNavigation("order")}>Ordine #{count}</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link active={navigation === "recap"} disabled={navigation === "order"} onClick={() => setNavigation("recap")}>&gt; Riepilogo</Nav.Link>
            <Nav.Link active={navigation === "pay"} disabled={["order", "recap"].includes(navigation)} onClick={() => setNavigation("pay")}>&gt; Paga</Nav.Link>
            <Nav.Link active={navigation === "done"} disabled={["order", "recap", "pay"].includes(navigation)} onClick={() => setNavigation("done")}>&gt; Fatto</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      {
        navigation === "order" ?
          <main>
            <Order />

            <Container className="text-center">
              <Button size="lg" onClick={() => { setNavigation("recap") }}>Procedi al riepilogo</Button>
            </Container>
          </main> :
        navigation === "recap" ?
          <main>
            <RecapOrder />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }}variant="secondary" size="lg" onClick={() => { setNavigation("order") }}>Torna indietro</Button><br/>
              <Button size="lg" onClick={() => { setNavigation("pay") }}>Procedi al pagamento</Button>
            </Container>
          </main> :
        navigation === "pay" ?
          <main>
            <Total onBack={() => { setNavigation("recap") }} onConfirm={() => { handlePrint(); setNavigation("done") }} />
          </main> :
        navigation === "done" ?
          <main>
            <Container className="text-center">
              <p style={{ marginTop: 10 }}>Ordine #{count} concluso! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</p>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { setNavigation("pay") }}>Torna indietro</Button><br/>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { handlePrint() }}>Stampa di nuovo</Button><br/>
              <Button size="lg" onClick={() => { dispatch(increment()); dispatch(reset()); setNavigation("order") }}>Nuovo ordine</Button>
            </Container>
          </main> :
          <div>Questo non dovrebbe mai succedere. Se vedi questa schermata, ricordati la parola "{navigation}" e aggiorna la pagina. Grazie.</div>
      }
    </div>

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder />
    </div>
    </>
  );
}

export default App;
