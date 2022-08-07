import React from 'react';

import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
  increment,
  decrement,
  selectProducts,
  displayEuroCents,
} from './orderSlice';
import styles from './Order.module.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

export function Order() {
  const products = useAppSelector(selectProducts);
  const dispatch = useAppDispatch();

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid className={styles.order}>
    <Row className="small text-muted">
      <Col className="my-auto">Nome del piatto</Col>
      <Col className="my-auto text-end" xs={2}>Prezzo unitario</Col>
      <Col xs="auto" className="text-center"><span className="d-block" style={{ width: 115 }}>Quantità</span></Col>
      <Col className="my-auto text-end" xs={2}>Subtotale</Col>
    </Row>

    { Object.entries(products).map(([key, product]) => {
      const totalPriceCents = product.euroCents * product.quantity
      return <Row key={key} className={styles.orderRow}>
        <Col className="my-auto">{product.name}</Col>
        <Col className="my-auto text-end" xs={2}>{displayEuroCents(product.euroCents)}</Col>
        <Col xs="auto">
          <InputGroup style={{ width: 115 }}>
            <Button variant="outline-secondary" disabled={product.quantity === 0} onClick={() => dispatch(decrement(key))}>
              -
            </Button>
            <Form.Control readOnly value={product.quantity}/>
            <Button variant="outline-secondary" onClick={() => dispatch(increment(key))}>
              +
            </Button>
          </InputGroup>
        </Col>
        <Col className="my-auto text-end" xs={2}>{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
      </Row>
    })}

    <Row>
      <Col className="text-end">Totale: euro {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>
}
