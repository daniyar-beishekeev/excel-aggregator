import React, {useEffect, useMemo, useState} from "react";
import {Button, Col, Modal, Row, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import {ReactSortable} from "react-sortablejs";
import {debounce} from "lodash";
import './SelectSheets.css';
import {QuickSelectSheet} from "./QuickSelectSheet.tsx";

//@ts-expect-error
import {backgroundColor} from "../DiffCell.jsx"

export interface EntityType{
  id: string;
  name: string;
  children: {
    id: string;
    group: string;
    groupId: string;
    name: string;
  }[]
}

export const renderItem = (item: EntityType['children'][number], idx: number): React.ReactElement => {
  return(
    <div style={{backgroundColor: backgroundColor(idx)}} key={idx}>
      <code className={"font-mono text-blue-700"}>{item.group}</code>
      <br/>
      <b>└ {item.name}</b>
    </div>
  );
}

export function SelectSheets({files, applySheets}: {files: FileHolder[], applySheets: (a: EntityType['children']) => void}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const applySheetsInternal = () => {
    setOpen(false);
    applySheets(right);
  }

  const [query, setQuery] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const debouncedSetFilterQuery = useMemo(
    () =>
      debounce((value: string) => {
        setFilterQuery(value);
      }, 500),
    []
  );
  useEffect(() => {
    debouncedSetFilterQuery(query);
    return () => {
      debouncedSetFilterQuery.cancel();
    };
  }, [query, debouncedSetFilterQuery]);
  const [filtered, setFiltered] = useState<EntityType[]>([]);
  useEffect(() => {
    const q = filterQuery.toLowerCase().trim() ?? '';
    const result: EntityType[] = files.map(file => ({
      id: file.id,
      name: file.file.name,
      children: file.sheetNames.map(sheet => ({
        id: crypto.randomUUID(),
        group: file.file.name,
        groupId: file.id,
        name: sheet,
      })).filter(item => item.name.toLowerCase().includes(q)),
    })).filter(group => group.children.length > 0);
    setFiltered(result);
  }, [files, filterQuery]);

  const [right, setRight] = useState<EntityType['children']>([]);
  useEffect(() => {
    if(import.meta.env.DEV) {
      if (files.length > 0)
        applySheets(files.map(file => {
          const res: EntityType['children'][number] = {
            id: crypto.randomUUID(),
            group: file.file.name,
            groupId: file.id,
            name: 'Р.2',
          };
          return res;
        }));
    }
    const fileIds = new Set(files.map(file => file.id));
    const res = right.filter(sheet => fileIds.has(sheet.groupId));
    if (res.length !== right.length) {
      if (!open)
        applySheets(res);
      setRight(res);
    }
  }, [files]);
  return (
  <>
    <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>{t('manage_sheets')}</Button>
    <Modal show={open} onHide={applySheetsInternal} dialogClassName="sheet-select-modal">
      <Modal.Header closeButton>
        <Modal.Title>{t('manage_sheets')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row style={{marginTop: 5, userSelect: 'none'}}>
          <Col className={'border-end'}>
            <Stack gap={1}>
              <Stack gap={2} direction="horizontal" className={'bg-white'} style={{marginTop: 5, position: "sticky", top: 5, justifyContent: "space-between"}}>
                <Stack gap={2} direction="horizontal">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('search') + '...'}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                  <Button
                    variant={"outline-success"}
                    className={"btn-sm"}
                    onClick={() => {if(confirm(t('insert_filtered'))){
                      setRight(prev =>
                        prev.concat(filtered.map(
                          group => group.children.map(
                            item => ({...item, id: crypto.randomUUID()})
                          ) as EntityType['children']
                        ).flat(1))
                      )
                    }}}
                  >{t('insert_filtered')}</Button>
                  <QuickSelectSheet files={files} setRight={setRight}/>
                </Stack>
                <Button
                  variant={"outline-danger"}
                  className={"btn-sm"}
                  onClick={() => {if(confirm(t('confirm_clean'))) setRight([])}}
                >❌</Button>
              </Stack>
              {filtered.map(group => (
                <div key={group.id}>
                  <code className={"font-mono text-blue-700"}>{group.name}</code>
                  <ReactSortable
                    list={group.children}
                    setList={(list) => {
                      setFiltered(old => old.map(g => group.id === g.id
                        ? {...g, children: list} : g
                      ))
                    }}
                    group={{
                      name: "shared",
                      pull: "clone",
                      put: false
                    }}
                    sort={false}
                    clone={item => ({...item, id: crypto.randomUUID()})}
                  >
                    {group.children.map(item => (
                      <div
                        key={item.id}
                        className={'m-1 ms-2 px-1 bg-secondary-subtle'}
                        style={{
                          cursor: "grab"
                        }}
                      >{item.name}</div>
                    ))}
                  </ReactSortable>
                </div>
              ))}
            </Stack>
          </Col>
          <Col style={{position: 'relative'}}>
            {right.length === 0 && (
              <div
                className="rounded p-5 text-center"
                style={{ position: "absolute", top: 0, left: '50%', transform: "translate(-50%, 0)" }}
              >{t('dnd_here')}</div>
            )}
            <ReactSortable
              list={right}
              setList={setRight}
              group={{
                name: "shared",
                pull: true,
                put: true
              }}
              animation={150}
              swapThreshold={0.65}
              invertSwap={true}
              style={{
                minHeight: "95%"
              }}
            >
              {right.map((item, idx) => (
                <div
                  key={item.id}
                  className={'my-2 pt-0 p-2 d-flex justify-content-between align-items-center'}
                  style={{cursor: "grab", backgroundColor: backgroundColor(idx)}}
                >
                  {renderItem(item, idx)}
                  <Button
                    variant={"danger"}
                    className={"btn-sm"}
                    onClick={(e) => {
                      setRight(old => old.filter(_ => _.id !== item.id));
                      e.stopPropagation();
                    }}
                  >🗑</Button>
                </div>
              ))}
            </ReactSortable>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        <Button onClick={applySheetsInternal}>{t('apply')}</Button>
      </Modal.Footer>
    </Modal>
  </>
  );
}
