import React from "react";

export default function LoadingOverlay({ visible }) {
  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={spinnerStyle}>
        Loading...
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 99999, // must be above modals
  pointerEvents: "all"
};

const spinnerStyle = {
  padding: "20px 30px",
  background: "white",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "bold"
};
