import React, {useState, useEffect} from "react";

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
      <span style={{ flex: 1 }}>
        {item.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFile(item.id);
        }}
      >❌</button>
    </li>
  );
}

export default function ManageFiles({ applyChanges }) {
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);

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
  const handleFileAdd = (e) => {
    let selected = Array.from(e.target.files || []);
    e.target.value = "";
    selected.forEach(file => file.id = crypto.randomUUID());
    selected = selected.filter(file => file.name.endsWith('.xlsx'))
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
  };

  useEffect(() => {
    (async () => {
      const urls = Object.keys(import.meta.glob('/public/e/*')).map(_ => _.slice(7));

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
      <button onClick={() => setOpen(true)}>Manage Files</button>
      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={buttonStyle}>❌</button>
            <input type="file" multiple onChange={handleFileAdd} />
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
            <button onClick={() => {
              setOpen(false);
              applyChanges(files);
            }}>Apply</button>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingTop: "20vh",
  zIndex: 9999
};

const modalStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  width: "fit-content",
  maxWidth: "80vw",
  minWidth: "30vw",
  overflow: "auto",
  maxHeight: "70vh",
  position: "relative",
};

const buttonStyle = {
  position: "absolute",
  right: 5,
  top: 5
};
