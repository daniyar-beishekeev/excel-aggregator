import React, {useEffect, useState} from "react";
import {Accordion, Button, Form, ListGroup, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import AsyncCreatableSelect from "react-select/async";

type FilterModes = 'value' | 'formula' | 'type' | 'filename' | 'sheet'
type Operators = 'eq' | 'neq' | 'le' | 'leq' | 'gr' | 'grq' | 'Empty' | 'NEmpty' | 'SWith' | 'NSWith' | 'EWith' | 'NEWith' | 'Contain' | 'NContain' | 'Inc' | 'NInc';
const operator2types: Record<Operators, FilterModes[]> = {
  eq:       ["value", "formula",         "filename", "sheet"],
  neq:      ["value", "formula",         "filename", "sheet"],
  le:       ["value"],
  leq:      ["value"],
  gr:       ["value"],
  grq:      ["value"],
  Empty:    ["value", "formula"],
  NEmpty:   ["value", "formula"],
  SWith:    ["value",                    "filename", "sheet"],
  NSWith:   ["value",                    "filename", "sheet"],
  EWith:    ["value",                    "filename", "sheet"],
  NEWith:   ["value",                    "filename", "sheet"],
  Contain:  ["value", "formula",         "filename", "sheet"],
  NContain: ["value", "formula",         "filename", "sheet"],
  Inc:      ["value",            "type", "filename", "sheet"],
  NInc:     ["value",            "type", "filename", "sheet"],
}

function isValidFilter(filter: Record<string, any>): boolean {
  const { mode, address, operator, operatorArg, operatorItems } = filter;
  if (!mode || mode === '') return false;
  if (['value', 'formula', 'type'].includes(mode) && (!address || address === '')) return false;
  if (!operator || operator === '') return false;
  if (['eq', 'neq', 'le', 'leq', 'gr', 'grq', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'].includes(operator) && operatorArg == null) return false;
  if (['Inc', 'NInc'].includes(operator) && (!operatorItems || operatorItems.length === 0)) return false;
  return true;
}

function Filter() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Partial<{
    enabled: boolean;
    mode: FilterModes;
    address: string;
    operator: Operators;
    operatorArg: string;
    operatorItems: string[];
  }>>({});
  const [valid, setValid] = useState(false);

  useEffect(() => {
    setValid(isValidFilter(filter));
  }, [filter]);

  return (
    <ListGroup.Item className={!filter.enabled ? "bg-secondary" : valid ? "bg-info-subtle" : "bg-danger-subtle"}>
      <Stack gap={2}>
        <Stack direction="horizontal" gap={1}>
          <Form.Check checked={filter.enabled ?? false} onChange={e => setFilter({ ...filter, enabled: e.target.checked })} />
          <Form.Select size="sm" value={filter.mode ?? ''} onChange={e => setFilter({ ...filter, mode: e.target.value as FilterModes })}>
            <option value="" disabled hidden>*{t('mode')}</option>
            {['value', 'formula', 'type', 'filename', 'sheet'].map(tp => <option key={tp} value={tp}>{t(tp)}</option>)}
          </Form.Select>
          {filter.mode && ['value', 'formula', 'type'].includes(filter.mode) && (
            <Form.Control
              value={filter.address ?? ''}
              onChange={e => setFilter({ ...filter, address: e.target.value })}
              size="sm"
              placeholder={`*${t('address')}`}
            />
          )}
          <Form.Select value={filter.operator ?? ''} size="sm" onChange={e => {
            const { operatorArg, operatorItems, ...rest } = filter;
            setFilter({ ...rest, operator: e.target.value as Operators });
          }}>
            <option value="" disabled hidden>*{t('operator')}</option>
            {Object.entries(operator2types)
              .filter(([, value]) => value.includes(filter.mode!))
              .map(([key,]) =>
                <option key={key} value={key}>{t('op.' + key)}</option>)
            }
          </Form.Select>
        </Stack>
        <Stack direction="horizontal" gap={1}>
          {filter.operator && ['eq', 'neq', 'le', 'leq', 'gr', 'grq', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'].includes(filter.operator)
            && <Form.Control value={filter.operatorArg ?? ''} onChange={e => setFilter({ ...filter, operatorArg: e.target.value })} size="sm" type="text" />
          }
          {filter.operator && ['Inc', 'NInc'].includes(filter.operator)
            && <div className="flex-grow-1">
              {/*@ts-expect-error*/}
              <AsyncCreatableSelect isMulti cacheOptions defaultOptions loadOptions={
                filter.mode === 'type' ? async () => ['b', 'n', 'e', 's', 'd', 'z']
                    .map(tp => ({ value: tp, label: t('type.' + tp) }))
                  : async () => []
              } value={filter.operatorItems ?? []} onChange={v => setFilter({ ...filter, operatorItems: (v ?? []) as string[] })} />
            </div>
          }
          <Button
            variant="outline-danger"
            className="ms-auto"
            size="sm"
            onClick={() => console.log("remove filter")}
          ><i className="bi bi-trash" /></Button>
        </Stack>
      </Stack>
    </ListGroup.Item>
  )
}

export type FormTypeFull = {
  mode: 'v' | 'f' | 't';
  generalAggregator: 'none' | 'diff' | 'freq' | 'countSet' | 'set';
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
export function CellParams({sheetNum, form, setForm, activeRange}: {
  sheetNum: number, activeRange: React.RefObject<{c1: number, c2: number, r1: number, r2: number}>
  form: FormType, setForm: React.Dispatch<React.SetStateAction<FormType>>
}) {
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
    type: 'text',
    placeholder: t(`param.${name}`),
    value: temporaryForm[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(/\D/g, '');
      setTemporaryForm({
        ...temporaryForm,
        [name]: (v === '' ? undefined : Number(v)) as FormType[K]
      })
    },
    onBlur: () =>
      setForm({
        ...form, userInput: true,
        [name]: temporaryForm[name]
      })
  })

  return (
    <Accordion defaultActiveKey={['aggregation', 'fileFilter']} alwaysOpen>
      <datalist id="showNumber-list">
        {[1, 3, 5, 10, 20, 50, 100].map(
          n => <option value={n} />
        )}
      </datalist>
      <Accordion.Item color={'bg-danger'} eventKey={'fileFilter'}>
        <Accordion.Header>{t('fileFilter')}</Accordion.Header>
        <Accordion.Body className="p-2">
          <Stack gap={2}>
            <ListGroup>
              <Filter/>
            </ListGroup>
            <Button
              variant="info"
              size="sm"
              onClick={() => console.log(activeRange.current)}
            ><i className="bi bi-plus-lg" /></Button>
          </Stack>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey={'aggregation'}>
        <Accordion.Header>{t('aggregation')}</Accordion.Header>
        <Accordion.Body>
          <Stack gap={2} className="p-2">
            <Form.Select {...s('mode')}>
              <option value="" disabled hidden>*{t('mode')}</option>
              <option value="v">{t('value')}</option>
              <option value="f">{t('formula')}</option>
              <option value="t">{t('type')}</option>
            </Form.Select>
            <Form.Select {...s('generalAggregator')}>
              <option value="" disabled hidden>*{t('aggregator')}</option>
              <option value="none">{t('agg.none')}</option>
              <option value="diff">{t('agg.diff')}</option>
              <option value="freq">{t('agg.freq')}</option>
              <option value="countSet">{t('agg.countSet')}</option>
              <option value="set">{t('agg.set')}</option>
            </Form.Select>
            {form.generalAggregator === 'diff' && <Form.Select {...s('diffLevel')}>
              <option value="" disabled hidden></option>
              <option value="strict">{t('aggStrict.strict')}</option>
            </Form.Select>}
            {(['diff', 'set', 'freq'].includes(form.generalAggregator ?? '')
                || ['diffVar', 'diffVarPercent'].includes(form.numberAggregator ?? '') )
              && <Form.Control list={'showNumber-list'} {...n('showLimit')}/>}
            <Form.Select {...s('numberAggregator')}>
              <option value="" disabled hidden>*{t('numberAggregator')}</option>
              <option value="none">{t('agg.none')}</option>
              <option value="sum">{t('agg.sum')}</option>
              {sheetNum === 2 && (<option value="sub">{t('agg.sub')}</option>)}
              <option value="avg">{t('agg.avg')}</option>
              <option value="min">{t('agg.min')}</option>
              <option value="max">{t('agg.max')}</option>
              <option value="range">{t('agg.range')}</option>
              <option value="diffVar">{t('agg.diffVar')}</option>
              <option value="diffVarPercent">{t('agg.diffVarPercent')}</option>
            </Form.Select>
            {form.numberAggregator && form.numberAggregator !== 'none' && <Form.Select {...s('numberAggregatorStrict')}>
              <option value="" disabled hidden>*{t('numberAggregatorStrict')}</option>
              <option value="strict">{t('aggStrict.strict')}</option>
              <option value="emptyOk">{t('aggStrict.emptyOk')}</option>
              <option value="emptyBooleanOk">{t('aggStrict.emptyBooleanOk')}</option>
              <option value="tryParse">{t('aggStrict.tryParse')}</option>
              <option value="tryHardParse">{t('aggStrict.tryHardParse')}</option>
            </Form.Select>}
            <Form.Check {...b('formatNumber')}/>
            <Form.Check {...b('compactCell')}/>
            <Form.Check {...b('stretchCell')}/>

            <Button onClick={() => setForm({userInput: true})}>{t('reset')}</Button>
          </Stack>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  )
}
