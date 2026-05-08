import React, {useEffect, useState} from "react";
import {Accordion, Button, Form, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";

export type FormTypeFull = {
  mode: 'v' | 'f' | 't';
  generalAggregator: 'diff' | 'freq' | 'countSet' | 'set';
  diffLevel: 'strict';
  showLimit: number;
  numberAggregator: 'none' | 'sum' | 'sub' | 'avg' | 'min' | 'max' | 'range' | 'diffVar' | 'diffVarPercent';
  numberAggregatorStrict: 'strict' | 'emptyOk' | 'emptyBooleanOk' | 'tryParse' | 'tryHardParse';
  formatNumber: boolean;
  stretchCell: boolean;
  compactCell: boolean;
  userInput: boolean;
}
export type FormType = Partial<FormTypeFull>;
export function CellParams({sheetNum, form, setForm}: {sheetNum: number, form: FormType, setForm: React.Dispatch<React.SetStateAction<FormType>>}) {
  const {t} = useTranslation();
  const [temporaryForm, setTemporaryForm] = useState<FormType>({});
  useEffect(() => {
    setTemporaryForm(form);
  }, [form]);
  const s = <K extends keyof FormType>(name: K) => ({
    value: form[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
      setForm({
        ...form, userInput: true,
        [name]: e.target.value as FormType[K]
      })
  });
  const b = <K extends keyof FormType>(name: K) => ({
    checked: form[name] ?? false,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({
        ...form, userInput: true,
        [name]: e.target.checked as FormType[K]
      }),
    label: t(name),
    id: `cell-param-${name}`,
  });
  const n = <K extends keyof FormType>(name: K) => ({
    type: 'number',
    placeholder: t(`param.${name}`),
    value: temporaryForm[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setTemporaryForm({
        ...temporaryForm,
        [name]: Number(e.target.value) as FormType[K]
      }),
    onBlur: () =>
      setForm({
        ...form, userInput: true,
        [name]: temporaryForm[name]
      })
  })

  return (
    <Accordion defaultActiveKey={['aggregation', 'filter']} alwaysOpen>
      <Accordion.Item eventKey={'filter'}>
        <Accordion.Header>{t('filter')}</Accordion.Header>
        <datalist id="types-list">
          {['boolean', 'number', 'error', 'string', 'date', 'empty'].map(
            tp => <option value={t('type.' + tp)} />
          )}
        </datalist>
        <Accordion.Body>
          <Stack gap={2} className="p-2">
            <Form.Control type={'text'} placeholder={'address'}></Form.Control>
            <Form.Select>
              <option value="" disabled hidden></option>
              <option value="v">{t('value')}</option>
              <option value="f">{t('formula')}</option>
              <option value="t">{t('type')}</option>
            </Form.Select>
            <Form.Select>
              <option value="" disabled hidden></option>
              {['=', '!=', '>', '>=', '<', '<=', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'].map(
                op => <option value={op}>{t('operator.' + op)}</option>
              )}
            </Form.Select>
            <Form.Control
              type="text"
              list="types-list"
            />
          </Stack>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey={'aggregation'}>
        <Accordion.Header>{t('aggregation')}</Accordion.Header>
        <Accordion.Body>
          <Stack gap={2} className="p-2">
            <Form.Select {...s('mode')}>
              <option value="" disabled hidden/>
              <option value="v">{t('value')}</option>
              <option value="f">{t('formula')}</option>
              <option value="t">{t('ype')}</option>
            </Form.Select>
            <Form.Select {...s('generalAggregator')}>
              <option value="" disabled hidden/>
              <option value="diff">{t('aggregator.diff')}</option>
              <option value="freq">{t('aggregator.freq')}</option>
              <option value="countSet">{t('aggregator.countSet')}</option>
              <option value="set">{t('aggregator.set')}</option>
            </Form.Select>
            {form.generalAggregator === 'diff' && <Form.Select {...s('diffLevel')}>
              <option value="" disabled hidden></option>
              <option value="strict">{t('aggStrict.strict')}</option>
            </Form.Select>}
            {(['diff', 'set', 'freq'].includes(form.generalAggregator ?? '')
                || ['diffVar', 'diffVarPercent'].includes(form.numberAggregator ?? '') )
              && <Form.Control min={1} {...n('showLimit')}/>}
            <Form.Select {...s('numberAggregator')}>
              <option value="" disabled hidden/>
              <option value="none">{t('aggregator.none')}</option>
              <option value="sum">{t('aggregator.sum')}</option>
              {sheetNum === 2 && (<option value="sub">{t('aggregator.sub')}</option>)}
              <option value="avg">{t('aggregator.avg')}</option>
              <option value="min">{t('aggregator.min')}</option>
              <option value="max">{t('aggregator.max')}</option>
              <option value="range">{t('aggregator.range')}</option>
              <option value="diffVar">{t('aggregator.diffVar')}</option>
              <option value="diffVarPercent">{t('aggregator.diffVarPercent')}</option>
            </Form.Select>
            {form.numberAggregator && form.numberAggregator !== 'none' && <Form.Select {...s('numberAggregatorStrict')}>
              <option value="" disabled hidden/>
              <option value="strict">{t('aggStrict.strict')}</option>
              <option value="emptyOk">{t('aggStrict.emptyOk')}</option>
              <option value="emptyBooleanOk">{t('aggStrict.emptyBooleanOk')}</option>
              <option value="tryParse">{t('aggStrict.tryParse')}</option>
              <option value="tryHardParse">{t('aggStrict.tryHardParse')}</option>
            </Form.Select>}
            <Form.Check {...b('formatNumber')}/>
            <Form.Check {...b('compactCell')}/>
            <Form.Check {...b('stretchCell')}/>

            <Button onClick={() => setForm({})}>RESET</Button>
          </Stack>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  )
}
