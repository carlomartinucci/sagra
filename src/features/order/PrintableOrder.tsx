import React from 'react';

import { useAppSelector } from '../../app/hooks';
import {
  selectProducts,
  displayEuroCents,
} from './orderSlice';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export function PrintableOrder({ count }: { count: string }) {
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <>
  <Container fluid style={{padding: "65px 50px"}}>
    <h1 style={{ fontSize: "5rem" }}>{count}</h1>

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
    <h1>PER LA CUCINA</h1>

    <h1 style={{ fontSize: "5rem" }}>{count}</h1>

    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      const totalPriceCents = product.euroCents * product.quantity
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={9}>{product.quantity} {product.name} ({displayEuroCents(product.euroCents)})</Col>
        <Col xs={3} className="text-end">{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
      </Row>
    })}

    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>
  </>
}


function Break() {
  return <div style={{clear: "both", pageBreakAfter: "always"}}></div>
}
