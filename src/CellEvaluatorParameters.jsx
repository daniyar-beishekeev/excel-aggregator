import {Button, Modal} from "react-bootstrap";
import React, {useCallback, useEffect, useState} from "react";
import {Form} from "@formio/react";
import parameterForm from "./parameterForm.json";
import {useLocalStorage} from "./utils/persistentState.ts";
import {useTranslation} from "react-i18next";
import i18n from "./global/i18n.ts";
import './css_cdn/formio.full.css';

const buildFormioI18n = () => {
  const lang = i18n.language;
  return {
    language: lang,
    i18n: {[lang]: i18n.getResourceBundle(lang, 'translation')}
  };
};

export function CellEvaluatorParameters({applyChanges}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useLocalStorage("parameters", {});
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
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>{t('Parameters')}</Button>
      <Modal show={open} onHide={setParameters} dialogClassName="modal-90w">
        <Modal.Header closeButton>
          <Modal.Title>{t('Parameters')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            submission={{data: formData}}
            src={parameterForm}
            options={buildFormioI18n()}
            onChange={_ => setDraftData(_.data)}
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button onClick={setParameters}>{t('Apply')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
