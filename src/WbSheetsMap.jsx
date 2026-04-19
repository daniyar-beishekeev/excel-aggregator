import React, {useState} from "react";
import {Button, Modal} from "react-bootstrap";
import Table from 'react-bootstrap/Table';

export function WbSheetsMap({wbs}) {
  const [open, setOpen] = useState(false);
  const wsList = [...new Set(wbs.flatMap(wb => wb.wb.worksheets.map(ws => ws.name)))];
  return (
    <>
      <Button type="button" className={"btn btn-info btn-sm"} onClick={() => setOpen(true)}>*Sheets*</Button>
      <Modal show={open} onHide={() => setOpen(false)} dialogClassName="modal-stretch">
        <Modal.Header closeButton>
          <Modal.Title>*Sheets map*</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered hover className="w-auto">
            <thead>
            <tr>
              <th>*Sheets*</th>
              {wsList.map(wsTitle =>
                <th className="text-nowrap">{wsTitle}</th>
              )}
            </tr>
            </thead>
            <tbody style={{textAlign: "center"}}>
            {wbs.map(wb => <tr>
              <td>{wb.fileName}</td>
              {wsList.map(wsTitle => {
                  const ws = wb.wb.getWorksheet(wsTitle);
                  if (!ws) return <td style={{backgroundColor: 'indianred'}}>X</td>
                if (ws.state === 'hidden') return <td style={{backgroundColor: 'darkgray'}}>👻</td>
                if (ws.state === 'veryHidden') return <td style={{backgroundColor: 'orange'}}>👻</td>
                  return <td style={{backgroundColor: 'lightgreen'}}>✓</td>
                })}
            </tr>)}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
}
