import React, {useState, useEffect, useRef, useCallback} from "react";

import {
  DndContext,
  closestCenter
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import {Button, Modal, Stack} from "react-bootstrap";
import {useTranslation} from "react-i18next";

function SortableItem({ item, removeFile }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "8px",
    marginBottom: "6px",
    border: "1px solid #ccc",
    background: "#f9f9f9",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  };

  return (
    <li ref={setNodeRef} style={style}>
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          userSelect: "none"
        }}
      >☰</span>
      <span style={{ flex: 1 }} className={"font-monospace"}>
        {item.name}
      </span>
      <Button
        variant={"secondary"}
        className={"btn-sm"}
        onClick={(e) => {
          e.stopPropagation();
          removeFile(item.id);
        }}
      >❌</Button>
    </li>
  );
}

export default function ManageFiles({ applyChanges }) {
  const {t} = useTranslation();
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const manageFiles = useCallback(() => {
    setOpen(false);
    applyChanges(files);
  }, [applyChanges, files]);

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFiles((items) => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };
  const fileAddInput = useRef(null);
  const handleFileAdd = (e) => {
    let selected = Array.from(e.target.files || []);
    e.target.value = "";
    selected.forEach(file => file.id = crypto.randomUUID());
    selected = selected.filter(file => (file.name.endsWith('.xlsx') && !file.name.startsWith('~$')))
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (async () => {
      const urls = Object.keys(import.meta.glob('/public/*')).map(_ => _.slice(7))
        .map(e => import.meta.env.BASE_URL + e);

      const files = await Promise.all(
        urls.slice(0, 3).map(async (url, index) => {
          const response = await fetch(url);
          const blob = await response.blob();

          const fileName = url.split('/').pop() || `file-${index}`;

          return new File([blob], fileName, { type: blob.type });
        })
      )
      files.forEach(file => file.id = crypto.randomUUID());
      setFiles(files);
      applyChanges(files);
    })();
  }, []);
  return (
    <>
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>{t('Manage Files')}</Button>
      <Modal show={open} onHide={manageFiles}>
        <Modal.Header closeButton>
          <Modal.Title>{t('Manage Files')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack style={{maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden'}} gap={2}>
            <Stack direction="horizontal" gap={1}>
              <input type="file" style={{"display": "none"}} ref={fileAddInput} multiple onChange={handleFileAdd} />
              <Button variant="info" className={"btn-sm"} onClick={() => fileAddInput.current.click()}>➕</Button>
              <Button variant="danger" className={"btn-sm"} onClick={() => {
                if (confirm(t('Clean files list'))) setFiles([]);
              }}>🗑</Button>
            </Stack>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={files.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {files.map(item => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      removeFile={removeFile}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </Stack>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button onClick={manageFiles}>{t('Apply')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
