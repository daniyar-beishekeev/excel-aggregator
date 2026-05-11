import React, {useCallback, useEffect, useState} from "react";
import {Accordion, Alert, Button, Form, ListGroup, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";

const operators: string[] = ['eq', 'neq', 'le', 'leq', 'gr', 'grq', 'Empty', 'NEmpty', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'];
type Operators = typeof operators[number];
export interface FilterInstance {
  enabled: boolean;
  valid: boolean;
  address: string;
  operator: Operators;
  operatorArg: string;
}

function isValidFilter(filter: Record<string, any>): boolean {
  const { address, operator, operatorArg, operatorItems } = filter;
  if (!address || address === '') return false;
  if (!operator || operator === '') return false;
  if (['le', 'leq', 'gr', 'grq', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'].includes(operator) && (!operatorArg || operatorArg === '')) return false;
  if (['le', 'leq', 'gr', 'grq'].includes(operator) && isNaN(operatorArg)) return false;
  return true;
}

function Filter({filter, setFilter, onDelete, activeRangeText}:
                {filter: Partial<FilterInstance>, setFilter: (nf: Partial<FilterInstance>) => void, onDelete: () => void, activeRangeText: string | null}) {
  const { t } = useTranslation();
  const setFilterPre = useCallback((f: Partial<FilterInstance>) => {
    setFilter({
      ...f,
      valid: isValidFilter(f)
    });
  }, [setFilter]);

  const [focused, setFocused] = useState<boolean>(false);
  useEffect(() => {
    if (!focused) return;
    setFilterPre({
      ...filter,
      address: (activeRangeText ?? '').split(':')[0]!
    })
  }, [activeRangeText]);

  return (
    <ListGroup.Item className={!filter.enabled ? "bg-secondary" : filter.valid ? "bg-info-subtle" : "bg-danger-subtle"}>
      <Stack gap={2}>
        <Stack direction="horizontal" gap={1}>
          <Form.Check checked={filter.enabled ?? false} onChange={e => setFilterPre({ ...filter, enabled: e.target.checked })} />
          <Form.Control
            value={filter.address ?? ''}
            size="sm"
            placeholder={`*${t('address')}`}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <Form.Select value={filter.operator ?? ''} size="sm" onChange={e => {
            const { operatorArg, ...rest } = filter;
            setFilterPre({ ...rest, operator: e.target.value as Operators });
          }}>
            <option value="" disabled hidden>*{t('operator')}</option>
            {operators.map(key => <option key={key} value={key}>{t('op.' + key)}</option>)}
          </Form.Select>
        </Stack>
        <Stack direction="horizontal" gap={1}>
          {filter.operator && ['eq', 'neq', 'le', 'leq', 'gr', 'grq', 'SWith', 'NSWith', 'EWith', 'NEWith', 'Contain', 'NContain'].includes(filter.operator)
            && <Form.Control value={filter.operatorArg ?? ''} onChange={e => setFilterPre({ ...filter, operatorArg: e.target.value })} size="sm" type="text" />
          }
          <Button
            variant="outline-danger"
            className="ms-auto"
            size="sm"
            onClick={() => onDelete()}
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
export function CellParams({sheetNum, form, setForm, activeRangeText, applyFilters}: {
  sheetNum: number, activeRangeText: string | null
  form: FormType, setForm: React.Dispatch<React.SetStateAction<FormType>>,
  applyFilters: (nf: Partial<FilterInstance>[]) => void
}) {
  const {t} = useTranslation();
  const [filters, setFilters] = useState<Partial<FilterInstance>[]>([]);
  const [temporaryForm, setTemporaryForm] = useState<FormType>({});
  useEffect(() => {
    setTemporaryForm(form);
  }, [form]);
  useEffect(() => {
    const tmp = filters.filter(f => f.enabled)
    if (tmp.every(f => f.valid))
      applyFilters(tmp);
  }, [filters, applyFilters]);
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
    <Accordion defaultActiveKey={['aggregation']} alwaysOpen>
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
              {filters.map((filter, idx) => (<Filter filter={filter} setFilter={
                nf => setFilters(filters.map((f, i) => (i === idx ? nf : f)))
              } key={idx} onDelete={
                () => setFilters(filters.filter((_, i) => i !== idx))
              } activeRangeText={activeRangeText}/>))}
            </ListGroup>
            {filters.some(filter => filter.enabled && !filter.valid)
              && <Alert variant="danger">{t('invalidFilter')}</Alert>
            }
            <Button
              variant="info"
              size="sm"
              onClick={() => setFilters(filters.concat([{address: (activeRangeText ?? '').split(':')[0]!}]))}
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
