import React from "react";
import {Button, Form, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";

export type FormType = Partial<{
  mode: 'v' | 'f' | 't';
  generalAggregator: 'diff' | 'freq' | 'countSet' | 'set';
  numberAggregator: 'none' | 'sum' | 'sub' | 'avg' | 'min' | 'max';
  formatNumber: boolean;
  stretchCell: boolean;
  userInput: boolean;
}>
export function CellParams({sheetNum, form, setForm}: {sheetNum: number, form: FormType, setForm: React.Dispatch<React.SetStateAction<FormType>>}) {
  const {t} = useTranslation();
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
    label: name,
    id: `cell-param-${name}`,
  });

  return (
    <Stack gap={2} className="p-2">
      <Form.Select {...s('mode')}>
        <option value="" disabled hidden/>
        <option value="v">{t('mode.value')}</option>
        <option value="f">{t('mode.formula')}</option>
        <option value="t">{t('mode.type')}</option>
      </Form.Select>
      <Form.Select {...s('generalAggregator')}>
        <option value="" disabled hidden/>
        <option value="diff">{t('aggregator.diff')}</option>
        <option value="freq">{t('aggregator.freq')}</option>
        <option value="countSet">{t('aggregator.countSet')}</option>
        <option value="set">{t('aggregator.set')}</option>
      </Form.Select>
      <Form.Select {...s('numberAggregator')}>
        <option value="" disabled hidden/>
        <option value="none">{t('aggregator.none')}</option>
        <option value="sum">{t('aggregator.sum')}</option>
        {sheetNum === 2 && (<option value="sub">{t('aggregator.sub')}</option>)}
        <option value="avg">{t('aggregator.avg')}</option>
        <option value="min">{t('aggregator.min')}</option>
        <option value="max">{t('aggregator.max')}</option>
      </Form.Select>
      <Form.Check {...b('formatNumber')}/>
      <Form.Check {...b('stretchCell')}/>

      <Button onClick={() => setForm({})}>RESET</Button>
    </Stack>
  )
}
