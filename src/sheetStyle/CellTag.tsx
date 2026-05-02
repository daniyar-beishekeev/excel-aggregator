import './CellTag.css'
import React from "react";
export const CellTag = ({children, color = null}: {children?: any, color?: undefined | null | React.CSSProperties['color']}) => {
  return (
    <div className="comment-wrapper">
      <div className="comment-indicator" style={color ? {backgroundColor: color} : {}}/>
      {children && <div className="comment-popup">{children}</div>}
    </div>
  )
}
