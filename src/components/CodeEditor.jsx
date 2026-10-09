import { useEffect, useId } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/editor/browser/coreCommands.js";
import "monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js";
import "monaco-editor/editor/contrib/clipboard/browser/clipboard.js";
import "monaco-editor/editor/contrib/comment/browser/comment.js";
import "monaco-editor/editor/contrib/contextmenu/browser/contextmenu.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import "monaco-editor/editor/contrib/folding/browser/folding.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/indentation/browser/indentation.js";
import "monaco-editor/editor/contrib/multicursor/browser/multicursor.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/tokenization/browser/tokenization.js";
import "monaco-editor/editor/contrib/wordOperations/browser/wordOperations.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

// Load the editor and its worker from the Vite bundle rather than a remote CDN.
globalThis.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

const options = {
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 23,
  fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
  tabSize: 4,
  insertSpaces: true,
  detectIndentation: false,
  autoIndent: "full",
  lineNumbers: "on",
  matchBrackets: "always",
  scrollBeyondLastLine: false,
  padding: { top: 18, bottom: 18 },
  ariaLabel: "Code nháp",
};

function defineTheme(editorApi) {
  editorApi.editor.defineTheme("problem-bank-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#20242b",
      "editorGutter.background": "#20242b",
      "editorLineNumber.foreground": "#656e7c",
      "editorLineNumber.activeForeground": "#dbe3ef",
      "editor.lineHighlightBackground": "#242830",
    },
  });
}

export default function CodeEditor({ language, value, onChange }) {
  const id = useId();
  const modelRoot = `inmemory://problem-bank/${encodeURIComponent(id)}`;

  // Keep each language's undo history and view state, then release both models
  // when this workspace closes (including navigation to another problem).
  useEffect(() => () => {
    for (const extension of ["cpp", "py"]) {
      monaco.editor.getModel(monaco.Uri.parse(`${modelRoot}/draft.${extension}`))?.dispose();
    }
  }, [modelRoot]);

  return (
    <Editor
      height="100%"
      language={language}
      path={`${modelRoot}/draft.${language === "python" ? "py" : "cpp"}`}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      beforeMount={defineTheme}
      theme="problem-bank-dark"
      options={options}
      saveViewState
      keepCurrentModel
      loading={<div className="bank-editor-loading" role="status">Đang tải trình soạn thảo code…</div>}
    />
  );
}
