import React, { useState } from 'react';

import { useAppSelector } from '../../app/hooks';
import {
  selectProducts,
  displayEuroCents,
} from './orderSlice';
import {
  selectCount,
} from '../counter/counterSlice';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image'

import cent50 from '../../images/050.jpeg'
import eur1 from '../../images/1.jpeg'
import eur2 from '../../images/2.jpeg'
import eur5 from '../../images/5.jpeg'
import eur10 from '../../images/10.jpeg'
import eur20 from '../../images/20.jpeg'
import eur50 from '../../images/50.jpeg'
import eur100 from '../../images/100.jpeg'
import header from '../../images/header.jpg'

export function Total({ onBack, onConfirm }: { onBack: () => void, onConfirm: () => void }) {
  const products = useAppSelector(selectProducts);
  const total = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const [given, setGiven] = useState(0)

  const resto = given - total

  return <>
    <Container fluid style={{paddingTop: 30, textAlign: "center"}} >
      <h3>Totale da pagare:</h3>
      <h2>{displayEuroCents(total)}</h2>

      <h3 style={{paddingTop: 30}}>Totale pagato:</h3>
      <h2>{displayEuroCents(given)}</h2>

      <Row style={{paddingTop: 30}}>
        <Button variant="outline-primary" onClick={() => { setGiven(0) }}>Cancella</Button>
      </Row>

      <Row style={{paddingTop: 10}}>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={cent50} alt={displayEuroCents(50)} onClick={() => { setGiven((given) => given + 50) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={eur1} alt={displayEuroCents(100)} onClick={() => { setGiven((given) => given + 100) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={eur2} alt={displayEuroCents(200)} onClick={() => { setGiven((given) => given + 200) }} />
        </Col>
      </Row>

      <Row>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur5} alt={displayEuroCents(500)} onClick={() => { setGiven((given) => given + 500) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur10} alt={displayEuroCents(1000)} onClick={() => { setGiven((given) => given + 1000) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur20} alt={displayEuroCents(2000)} onClick={() => { setGiven((given) => given + 2000) }} />
        </Col>
      </Row>

      <Row>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur50} alt={displayEuroCents(5000)} onClick={() => { setGiven((given) => given + 5000) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur100} alt={displayEuroCents(10000)} onClick={() => { setGiven((given) => given + 10000) }} />
        </Col>
      </Row>

      <h3 style={{paddingTop: 30}}>Resto:</h3>
      {resto >= 0 ? <h2>{displayEuroCents(resto)}</h2> : <h3>(mancano {displayEuroCents(-resto)})</h3>}
    </Container>

    <Container style={{paddingTop: 30}} className="text-center">
      <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={onBack}>Torna indietro</Button><br/>
      <Button size="lg" onClick={onConfirm} disabled={resto < 0}>Conferma e stampa</Button>
      { resto < 0 && <p className="text-danger">mancano {displayEuroCents(-resto)}, indica il pagamento del cliente per continuare</p> }
    </Container>
  </>
}

export function RecapOrder({ coperti, tavolo }: { coperti: string, tavolo: string }) {
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid>
    <Row><Col className="text-center text-bg-info mb-3"><h3 className="my-2">Tavolo {tavolo}. {coperti}</h3></Col></Row>
    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={12} className="text-center">
          <h4>{product.quantity} {product.name}</h4>
          {product.notes && <span> (Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span>}
        </Col>
      </Row>
    })}
    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>

}

export function PrintableOrder({ coperti, tavolo }: { coperti: string, tavolo: string }) {
  const count = useAppSelector(selectCount)
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)
  const totalClientLines = Object.values(products).reduce((total, product) => total + 1, 0)
  const totalKitchenLines = Object.values(products).reduce((total, product) => total + (product.quantity > 0 ? 1 : 0) + (product.notes !== "" ? 0.5 : 0), 0)

  const isClientFontBig = totalClientLines < 15
  const isKitchenFontBig = totalKitchenLines < 12

  return <>
  <Container fluid style={{ padding: "40px 40px", fontSize: isClientFontBig ? "1.3rem" : "1rem", lineHeight: isClientFontBig ? 1.7 : 1.5 }}>
    <Image style={{width: "100%"}} src={header} alt="Festa della Divina Misericordia. Canevara (MS), domenica 16 aprile 2023" />
    <Row>
      <Col xs={6}>
        <h1 style={{ fontSize: "6rem" }}>{count}</h1>
      </Col>
      <Col xs={6} className="text-end align-self-center">
        <h2>Tavolo {tavolo}</h2>
        <h2>{coperti}</h2>
      </Col>
    </Row>

    { Object.entries(products).map(([key, product]) => {
      const totalPriceCents = product.euroCents * product.quantity
      return <Row key={key}>
        <Col className="me-0 pe-0" xs="auto">{product.quantity} &nbsp; &nbsp; {showName(product.name)} ({displayEuroCents(product.euroCents)})</Col>
        <Col className="text-end ms-0 ps-0 mt-1" style={{ fontSize: isClientFontBig ? "1rem" : "0.8rem" }}>{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
      </Row>
    })}

    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>

  <Break/>

  <Container fluid style={{ padding: "65px 50px", fontSize: isKitchenFontBig ? "1.3rem" : "1rem" }}>
    <Image style={{width: "100%"}} src={header} alt="Festa della Divina Misericordia. Canevara (MS), domenica 16 aprile 2023" />
    <Row>
      <Col>
        PER LA CUCINA
      </Col>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>

    <Row>
      <Col xs={6}>
        <h1 style={{ fontSize: "6rem" }}>{count}</h1>
      </Col>
      <Col xs={6} className="text-end align-self-center">
        <h2>Tavolo {tavolo}</h2>
        <h2>{coperti}</h2>
      </Col>
    </Row>

    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={12}>
          <span style={{ fontSize: isKitchenFontBig ? "1.5rem" : "1.3rem", fontWeight: "bold" }}>{product.quantity}</span> &nbsp; &nbsp; {showName(product.name)}
          {product.notes && <span><br />&nbsp;&nbsp;&nbsp;(Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span>}
        </Col>
      </Row>
    })}
  </Container>
  </>
}


function Break() {
  return <div style={{clear: "both", pageBreakAfter: "always"}}></div>
}

function showName(name: string | string[]): JSX.Element {
  if (typeof name === 'string') {
    return <>{name}</>;
  } else {
    return (
      <>
        {name.map((n, i) => (
          <React.Fragment key={i}>
            {n}
            {i < name.length - 1 && <><br />&nbsp;&nbsp;&nbsp;</>}
          </React.Fragment>
        ))}
      </>
    );
  }
}
