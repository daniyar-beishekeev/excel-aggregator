import {Button, Modal} from "react-bootstrap";
import React, {useCallback, useEffect, useState} from "react";
import {Form} from "@formio/react";
import parameterForm from "./parameterForm.json";
import persistentState from "./persistentState.js";

export function CellEvaluatorParameters({applyChanges}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = persistentState("parameters", {});
  const [draftData, setDraftData] = useState(formData);
  useEffect(() => {
    applyChanges(formData);
  }, []);
  const setParameters = useCallback(() => {
    setOpen(false);
    if (JSON.stringify(draftData) !== JSON.stringify(formData))
      applyChanges(draftData);
    setFormData(draftData);
  }, [applyChanges, draftData, setFormData]);

  return (
    <>
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>Parameters</Button>
      <Modal show={open} onHide={setParameters} dialogClassName="modal-90w">
        <Modal.Header closeButton>
          <Modal.Title>Parameters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            submission={{data: formData}}
            src={parameterForm}
            onChange={_ => setDraftData(_.data)}
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button onClick={setParameters}>Apply</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
