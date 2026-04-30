import React, {type ChangeEvent, useCallback, useEffect, useRef, useState} from "react";
import {Button, Modal} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import pLimit from "p-limit";
import * as XLSX from "xlsx";
import './ManageFiles.css'
import type {FileHolder} from "./FileHolder.ts";
import {ManageFilesTable} from "./ManageFilesTable.tsx";

let file_descriptor = 1;
const limit = pLimit(32);
let sampleFilesAdd = true;

export function ManageFiles({ applyChanges }: {applyChanges: (a: FileHolder[]) => void}) {
  const {t} = useTranslation();
  const [files, setFiles] = useState<FileHolder[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const applyFiles: () => void = useCallback(() => {
    setOpen(false);
    applyChanges(files.filter(file => file.status === 'ready'));
  }, [applyChanges, files]);

  const processFile = async (file: FileHolder): Promise<void> => {
    const extraProps = {} as FileHolder;
    try {
      if (file.file.name.startsWith('~$')) {
        throw new Error(t('ignored_file_prefix ~$'));
      }
      const buffer = await file.file.arrayBuffer();
      const wb = XLSX.read(buffer, {
        type: 'array',
        bookSheets: true,
        bookProps: true
      });
      extraProps.status = 'ready';
      extraProps.sheetNames = wb.SheetNames;
      extraProps.props = wb.Props ?? {};
    }catch (err) {
      extraProps.status = 'error';
      if (err instanceof Error)
        extraProps.error = err.message;
    }finally {
      setFiles(prev => prev.map((f: FileHolder) => f.id == file.id ? {...f, ...extraProps} : f));
    }
  }
  const fileAdd = (selected: File[]): void => {
    const new_files = selected.map(file => {
      const fileHolder: FileHolder = {
        id: crypto.randomUUID(),
        uploadOrder: file_descriptor++,
        status: 'processing',
        file,
        sheetNames: [],
        props: {}
      };
      limit(() => processFile(fileHolder));
      return fileHolder;
    });
    setFiles(prev => [...prev, ...new_files]);
  }

  const fileAddInput = useRef<HTMLInputElement>(null);
  const handleFileAdd = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []) as File[];
    e.target.value = "";
    if (!selected.length) return;
    fileAdd(selected);
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!sampleFilesAdd) return;
    sampleFilesAdd = false;
    Promise.all(
        Object.keys(import.meta.glob('/public/*'))
            .map(_ => import.meta.env.BASE_URL + _.slice(7))
            .filter(_ => _.endsWith('.xlsx'))
            .map(async (url, index) => {
          const response = await fetch(url);
          const blob = await response.blob();

          const fileName = url.split('/').pop() || `file-${index}`;

          return new File([blob], fileName, { type: blob.type });
        })
    ).then(fileAdd);
  }, []);

  return (
    <>
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>{t('manage_files')}</Button>
      <Modal show={open} onHide={applyFiles} dialogClassName="manage-files-modal">
        <Modal.Header closeButton>
          <Modal.Title>{t('manage_files')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input type="file" style={{"display": "none"}} ref={fileAddInput} multiple onChange={handleFileAdd} />
          <ManageFilesTable files={files} setFiles={setFiles}>
            <Button style={{left: 0, position: 'sticky'}} variant="info" className={"btn-sm"} onClick={() => fileAddInput.current?.click()}>➕</Button>
          </ManageFilesTable>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button onClick={applyFiles}>{t('apply')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
