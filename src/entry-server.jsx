// Used only at build time: renders the home page to plain HTML so search engines
// and link previews see the real content without running JavaScript.
import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

export function render() {
  return renderToString(<App />);
}
