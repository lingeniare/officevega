// flagprev/render.tsx
var import_server = require("react-dom/server");
var import_react2 = require("react");
var import_node_fs = require("node:fs");

// apps/shell/src/renderer/src/lang-flags.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function FlagSvg({ children }) {
  const clipId = (0, import_react.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: "set-lang-flag", viewBox: "0 0 18 12", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", { id: clipId, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", rx: "2.5" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { clipPath: `url(#${clipId})`, children }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        className: "set-lang-flag-edge",
        x: "0.5",
        y: "0.5",
        width: "17",
        height: "11",
        rx: "2",
        fill: "none"
      }
    )
  ] });
}
var FLAGS = {
  az: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "4", fill: "#00b9e4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "4", width: "18", height: "4", fill: "#ef3340" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "8", width: "18", height: "4", fill: "#509e2f" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "8.6", cy: "6", r: "1.7", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "9.1", cy: "6", r: "1.35", fill: "#ef3340" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        x: "10.35",
        y: "5.45",
        width: "1.1",
        height: "1.1",
        fill: "#fff",
        transform: "rotate(45 10.9 6)"
      }
    )
  ] }),
  en: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", fill: "#fff" }),
    [0, 2, 4, 6, 8, 10].map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y, width: "18", height: "1", fill: "#b22234" }, y)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "7.4", height: "6.5", fill: "#3c3b6e" }),
    [1.5, 3.25, 5].map(
      (y) => [1.7, 3.7, 5.7].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: x, cy: y, r: "0.4", fill: "#fff" }, `${x}-${y}`))
    )
  ] }),
  ka: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "7.5", width: "3", height: "12", fill: "#f00" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "4.5", width: "18", height: "3", fill: "#f00" }),
    [
      [3.75, 2.25],
      [14.25, 2.25],
      [3.75, 9.75],
      [14.25, 9.75]
    ].map(([cx, cy]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { fill: "#f00", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: cx - 0.65, y: cy - 0.225, width: "1.3", height: "0.45" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: cx - 0.225, y: cy - 0.65, width: "0.45", height: "1.3" })
    ] }, `${cx}-${cy}`))
  ] }),
  kk: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", fill: "#00afca" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "0.9", width: "1.8", height: "12", fill: "#fec50c" }),
    [2.5, 6, 9.5].map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        x: "1.35",
        y: y - 0.45,
        width: "0.9",
        height: "0.9",
        fill: "#00afca",
        transform: `rotate(45 1.8 ${y})`
      },
      y
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "10.4", cy: "6", r: "2.3", fill: "#fec50c" }),
    [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
      const rad = deg * Math.PI / 180;
      const [c, s] = [Math.cos(rad), Math.sin(rad)];
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          x1: 10.4 + 2.8 * c,
          y1: 6 + 2.8 * s,
          x2: 10.4 + 3.5 * c,
          y2: 6 + 3.5 * s,
          stroke: "#fec50c",
          strokeWidth: "0.5"
        },
        deg
      );
    }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.2 10.3c1.5-1.3 2.9-1.3 4.4 0", stroke: "#fec50c", strokeWidth: "0.55", fill: "none" })
  ] }),
  ky: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", fill: "#e8112d" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "9", cy: "6", r: "2.7", fill: "#ffed00" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "9", cy: "6", r: "1.9", fill: "#e8112d" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { stroke: "#ffed00", strokeWidth: "0.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "9", y1: "4.25", x2: "9", y2: "7.75" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "7.48", y1: "5.12", x2: "10.52", y2: "6.88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "10.52", y1: "5.12", x2: "7.48", y2: "6.88" })
    ] })
  ] }),
  ru: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "4", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "4", width: "18", height: "4", fill: "#0039a6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "8", width: "18", height: "4", fill: "#d52b1e" })
  ] }),
  tk: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "12", fill: "#00843d" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "2", width: "2.6", height: "12", fill: "#d22630" }),
    [2, 5, 8, 11].map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "2.6", y: y - 0.55, width: "1.4", height: "1.1", fill: "#f6c85f" }, y)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "8.4", cy: "3.1", r: "1.25", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "8.8", cy: "3.1", r: "1", fill: "#00843d" }),
    [
      [10.4, 2.1],
      [11.4, 2.8],
      [10.4, 4.1],
      [11.8, 1.8],
      [12.2, 3.7]
    ].map(([x, y]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: x, cy: y, r: "0.32", fill: "#fff" }, `${x}-${y}`))
  ] }),
  tt: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "5.2", fill: "#009444" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "5.2", width: "18", height: "1.6", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "6.8", width: "18", height: "5.2", fill: "#ee1c25" })
  ] }),
  uz: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: "18", height: "3.9", fill: "#0099b5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "3.9", width: "18", height: "0.55", fill: "#ce1126" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "4.45", width: "18", height: "3.1", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "7.55", width: "18", height: "0.55", fill: "#ce1126" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { y: "8.1", width: "18", height: "3.9", fill: "#1eb53a" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "2.9", cy: "1.95", r: "1.25", fill: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "3.35", cy: "1.95", r: "1", fill: "#0099b5" }),
    [
      [4.9, 1.1],
      [5.8, 1.9],
      [4.9, 2.8]
    ].map(([x, y]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: x, cy: y, r: "0.3", fill: "#fff" }, `${x}-${y}`))
  ] })
};
function LangFlag({ lang }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagSvg, { children: FLAGS[lang] });
}

// flagprev/render.tsx
var langs = ["az", "en", "ka", "kk", "ky", "ru", "tk", "tt", "uz"];
var rows = langs.map((l) => `<div class="row">${(0, import_server.renderToStaticMarkup)((0, import_react2.createElement)(LangFlag, { lang: l }))}<span>${l}</span></div>`).join("\n");
(0, import_node_fs.writeFileSync)(
  "flagprev/index.html",
  `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui">
  <style>.row{display:flex;align-items:center;gap:10px;margin:8px;font-size:14px}.set-lang-flag{width:36px;height:24px}h3{margin:8px}</style>
  <h3>2x scale preview</h3>${rows}`
);
