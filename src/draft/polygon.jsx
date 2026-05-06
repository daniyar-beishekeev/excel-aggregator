import React, {StrictMode, useState} from 'react'

import '../App.css'

import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import {MemoryUsage} from "../utils/MemoryUsage.jsx";
import {Form} from "@formio/react";
import parameterForm from "../parameterForm.json";
import '../css_cdn/formio.full.css';
import {Col, Row} from "react-bootstrap";

function App() {
  const [draftData, setDraftData] = useState({});
  if (!import.meta.env.DEV) return <>AVAILABLE IN DEV MODE ONLY</>;
  return <div>
    <MemoryUsage/>
    <Row>
      <Col>
        <Form
          src={parameterForm}
          onChange={_ => setDraftData(_.data)}
        />
      </Col>
      <Col>
        HI
      </Col>
    </Row>
  </div>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
