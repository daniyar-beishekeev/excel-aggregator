export function BasicTable({ws, wbHolder, cellEvaluator}) {
  const {totalRow, totalCol} = wbHolder.worksheetSize(ws);
  const zoom = 1 /*(ws.pageSetup.scale ?? 100) / 100*/;

  return (
    <table className={"excel"} style={{
      fontSize: `${14 * zoom}px`
    }}>
      <thead>
      <tr>
        <th>[]</th>
        {Array.from({length: totalCol}).map((_, col) =>
          <th>{ws.getColumn(col + 1).letter}</th>
        )}
      </tr>
      </thead>
      <tbody>{
        Array.from({length: totalRow}, (_, rowNum) => {
          rowNum++;
          const row = ws.getRow(rowNum);
          const cells = Array.from({length: totalCol}, (_, colNum) => {
            colNum++;
            const cell = row.getCell(colNum)
            if(cell.master !== cell) return null;
            return cellEvaluator(cell, {zoom});
          }).map(_ => _);
          return (
            <tr className={"selection"} key={row.number}>
              <td className={"colHead"}>{rowNum}</td>
              {cells}
            </tr>
          )
        })
      }</tbody>
    </table>
  )
}
