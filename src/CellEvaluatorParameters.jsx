import {Button, Modal} from "react-bootstrap";
import React, {useState} from "react";
import {Form} from "@formio/react";
import parameterForm from "./parameterForm.json";
import persistentState from "./persistentState.js";

export function CellEvaluatorParameters() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = persistentState("parameters", {});

  return (
    <>
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>Parameters</Button>
      <Modal show={open} onHide={() => setOpen(false)} dialogClassName="modal-90w">
        <Modal.Header closeButton>
          <Modal.Title>Parameters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            submission={formData}
            src={parameterForm}
            onChange={_ => setFormData({..._})}
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button onClick={() => {
            setOpen(false);
          }}>Apply</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
