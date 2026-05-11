const bgColors =  [
  "lightgreen",
  "palevioletred",
  "#f7b32b",
  "#9b59b6",
  "#3498db",
  "#e67e22",
  "#1abc9c",
  "#e84393",
  "#ebf83b",
]
export const backgroundColor = (idx = 0) => {
  return bgColors[idx % bgColors.length];
}
