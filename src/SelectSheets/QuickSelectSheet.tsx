import React, {useState} from "react";
import type {EntityType} from "./SelectSheets.tsx";
import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import {Dropdown} from "react-bootstrap";

export function QuickSelectSheet({files, setRight}: {files: FileHolder[], setRight: React.Dispatch<React.SetStateAction<EntityType['children']>>}) {
  const [items, setItems] = useState<string[]>([]);
  const handleToggle = (isOpen: boolean) => {
    if (isOpen) setItems([...new Set(files.flatMap(file => file.sheetNames))]);
  };
  const addSheet = (sheet: string): void => {
    setRight(prev => prev.concat(files.map(file => {
      const res: EntityType['children'][number] = {
        id: crypto.randomUUID(),
        group: file.file.name,
        name: sheet
      }
      return res;
    })))
  }
  return <Dropdown onToggle={handleToggle}>
    <Dropdown.Toggle size={"sm"} variant={"light"}>🪄</Dropdown.Toggle>
    <Dropdown.Menu>
      {items.map((item) => (
        <Dropdown.Item key={item} onClick={() => addSheet(item)}>{item}</Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>
}
