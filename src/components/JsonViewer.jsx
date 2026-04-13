import { prettyJson } from "../lib/format.js";

export default function JsonViewer({ value }) {
  return (
    <pre className="json-viewer-react bg-light border rounded p-3 mb-0">
      {prettyJson(value)}
    </pre>
  );
}
