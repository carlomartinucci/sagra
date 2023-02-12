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

export function Total() {
  const products = useAppSelector(selectProducts);
  const total = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const [given, setGiven] = useState(0)

  const resto = given - total

  return <Container fluid style={{paddingTop: 30, textAlign: "center"}} >
    <h3>Totale da pagare:</h3>
    <h2>{displayEuroCents(total)}</h2>

    <h3 style={{paddingTop: 30}}>Totale pagato:</h3>
    <h2>{displayEuroCents(given)}</h2>
    <div className="d-grid gap-1" style={{width: 300, margin: "auto"}}>
      <div className="btn-group" role="group" aria-label="Basic example">
        <Button variant="outline-primary" onClick={() => { setGiven(0) }}>Cancella</Button>
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 50) }}>{displayEuroCents(50)}</Button>
      </div>

      <div className="btn-group" role="group" aria-label="Basic example">
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 100) }}>{displayEuroCents(100)}</Button>
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 200) }}>{displayEuroCents(200)}</Button>
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 500) }}>{displayEuroCents(500)}</Button>
      </div>

      <div className="btn-group" role="group" aria-label="Basic example">
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 1000) }}>{displayEuroCents(1000)}</Button>
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 2000) }}>{displayEuroCents(2000)}</Button>
        <Button variant="outline-primary" onClick={() => { setGiven((given) => given + 5000) }}>{displayEuroCents(5000)}</Button>
      </div>
    </div>

    <h3 style={{paddingTop: 30}}>Resto:</h3>
    {resto >= 0 ? <h2>{displayEuroCents(resto)}</h2> : <h3>(mancano {displayEuroCents(-resto)})</h3>}
  </Container>
}

export function RecapOrder() {
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid style={{paddingTop: 30}}>
    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={12}>
          <span style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{product.quantity}</span> {product.name}
          {product.notes && <span> (Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span>}
        </Col>
      </Row>
    })}
    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>

}

export function PrintableOrder() {
  const count = useAppSelector(selectCount)
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <>
  <Container fluid style={{padding: "65px 50px"}}>
    <h1 style={{ fontSize: "3rem" }}>{count}</h1>

    { Object.entries(products).map(([key, product]) => {
      const totalPriceCents = product.euroCents * product.quantity
      return <Row key={key}>
        <Col xs={9}>{product.quantity} {product.name} ({displayEuroCents(product.euroCents)})</Col>
        <Col xs={3} className="text-end">{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
      </Row>
    })}

    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>

  <Break/>

  <Container fluid style={{padding: "65px 50px"}}>
    <Row>
      <Col xs={8}>
        PER LA CUCINA
      </Col>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>

    <h1 style={{ fontSize: "3rem" }}>{count}</h1>

    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={12}>
          <span style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{product.quantity}</span> {product.name}
          {product.notes && <span> (Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span>}
        </Col>
      </Row>
    })}
  </Container>
  </>
}


function Break() {
  return <div style={{clear: "both", pageBreakAfter: "always"}}></div>
}
