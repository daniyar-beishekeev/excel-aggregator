import './CellTag.css'
export const CellTag = ({children, color = null}) => {
  return (
    <div className="comment-wrapper">
      <div className="comment-indicator" style={color ? {backgroundColor: color} : {}}/>
      {children && <div className="comment-popup">{children}</div>}
    </div>
  )
}
