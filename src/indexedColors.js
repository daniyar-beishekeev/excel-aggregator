export const indexedColors = [
  "#000000", //0
  "#FFFFFF", //1
  "#FF0000", //2
  "#00FF00", //3
  "#0000FF", //4
  "#FFFF00", //5
  "#FF00FF", //6
  "#00FFFF", //7
  "#000000", //8
  "#FFFFFF", //9
  "#FF0000", //10
  "#00FF00", //11
  "#0000FF", //12
  "#FFFF00", //13
  "#FF00FF", //14
  "#00FFFF", //15
  "#800000", //16
  "#008000", //17
  "#000080", //18
  "#808000", //19
  "#800080", //20
  "#008080", //21
  "#C0C0C0", //22
  "#808080", //23
  "#9999FF", //24
  "#993366", //25
  "#FFFFCC", //26
  "#CCFFFF", //27
  "#660066", //28
  "#FF8080", //29
  "#0066CC", //30
  "#CCCCFF", //31
  "#000080", //32
  "#FF00FF", //33
  "#FFFF00", //34
  "#00FFFF", //35
  "#800080", //36
  "#800000", //37
  "#008080", //38
  "#0000FF", //39
  "#00CCFF", //40
  "#CCFFFF", //41
  "#CCFFCC", //42
  "#FFFF99", //43
  "#99CCFF", //44
  "#FF99CC", //45
  "#CC99FF", //46
  "#FFCC99", //47
  "#3366FF", //48
  "#33CCCC", //49
  "#99CC00", //50
  "#FFCC00", //51
  "#FF9900", //52
  "#FF6600", //53
  "#666699", //54
  "#969696", //55
  "#003366", //56
  "#339966", //57
  "#003300", //58
  "#333300", //59
  "#993300", //60
  "#993366", //61
  "#333399", //62
  "#333333"  //63
]

const readThemeColor = (scheme, tag) => {
  const node = scheme.getElementsByTagName(`a:${tag}`)[0];
  if (!node) return null;
  const srgb = node.getElementsByTagName("a:srgbClr")[0];
  if (srgb) return srgb.getAttribute("val");
  const sys = node.getElementsByTagName("a:sysClr")[0];
  if (sys) return sys.getAttribute("lastClr");

  return null;
};

const themeTags = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6"
];

export const extractThemeColors = (themes) => {
  if (!themes?.theme1) return [];

  const parser = new DOMParser();
  const xml = parser.parseFromString(themes.theme1, "application/xml");

  const scheme = xml.getElementsByTagName("a:clrScheme")[0];
  if (!scheme) return [];

  return themeTags.map(tag => readThemeColor(scheme, tag));
};

const tintChannel = (c, tint) => {
  if (tint < 0) return Math.round(c * (1 + tint));
  return Math.round(c + (255 - c) * tint);
};

export const applyTint = (hex, tint = 0) => {
  if (!hex) return "#000";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const nr = tintChannel(r, tint);
  const ng = tintChannel(g, tint);
  const nb = tintChannel(b, tint);
  return `#${nr.toString(16).padStart(2, "0")}${ng
    .toString(16)
    .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
};
