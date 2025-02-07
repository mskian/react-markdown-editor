import { useState, useEffect } from 'react';
import { createCommand, $createTextNode, $getRoot, $getSelection, $isRangeSelection } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FaCopy, FaBold, FaItalic, FaHeading, FaHighlighter, FaQuoteLeft, FaListUl, FaMarkdown, FaEye, FaGripLines, FaLink, FaImage } from 'react-icons/fa';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const initialConfig = {
  namespace: 'markdown-editor',
  onError: (error) => console.error('Editor Error:', error),
};

const INSERT_MARKDOWN_COMMAND = createCommand();

function useDebouncedEffect(callback, delay) {
  useEffect(() => {
    const handler = setTimeout(() => callback(), delay);
    return () => clearTimeout(handler);
  }, [callback, delay]);
}

// eslint-disable-next-line react/prop-types
function Alert({ message, type }) {
  return <div className={`notification is-${type}`}>{message}</div>;
}

function Editor() {
  const [editor] = useLexicalComposerContext();
  const [markdown, setMarkdown] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem('editor-state');
      if (savedState) {
        editor.update(() => {
          const parsedState = editor.parseEditorState(savedState);
          editor.setEditorState(parsedState);
        });
      }
    } catch (error) {
      console.error('Error loading editor state:', error);
    }
  }, [editor]);
  
  useDebouncedEffect(() => {
    try {
      const editorState = editor.getEditorState();
      const serializedState = JSON.stringify(editorState.toJSON());
      localStorage.setItem('editor-state', serializedState);
    } catch (error) {
      console.error('Error saving editor state:', error);
    }
  }, 500, [editor]); 

  const handleEditorChange = (editorState) => {
    editorState.read(() => {
      const text = $getRoot().getTextContent().trim();
      setMarkdown(text);
      const wordsArray = text.split(/\s+/).filter(Boolean);
      const wordCount = wordsArray.length;
      const spaceCount = wordCount > 1 ? wordCount - 1 : 0;
      const totalCount = text.replace(/\s/g, "").length + spaceCount;
      setWordCount(totalCount);
    });
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showAlert('Content copied to clipboard', 'success');
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      showAlert('Failed to copy content', 'danger');
    }
  };

  const insertMarkdown = (symbol, wrapText = false) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const text = selection.getTextContent();
      const newText = wrapText ? `${symbol}${text}${symbol}` : `${symbol}${text}`;

      selection.insertNodes([$createTextNode(newText)]);
    });
  };

  useEffect(() => {
    return editor.registerCommand(
      INSERT_MARKDOWN_COMMAND,
      (payload) => {
        editor.update(() => {
          const selection = editor.getSelection();
          if (!$isRangeSelection(selection)) return;
          selection.insertText(payload);
        });
        return true;
      },
      0
    );
  }, [editor]);

  const cleanHtml = marked(markdown, { breaks: true })
  .replace(/<\/?p>/g, '')
  .replace(/==(.*?)==/g, '<mark>$1</mark>');

  return (
    <div className="container mt-5">
      {alert && <Alert message={alert.message} type={alert.type} />}

      {/* Editor Card */}
      <div className="card">
        <div className="card-content">
          <h2 className="title has-text-danger-dark mb-5"><FaMarkdown size={40} /></h2>

          {/* Markdown Toolbar */}
          <div className="buttons">
            <button className="button is-small is-primary" onClick={() => insertMarkdown('**', true)}><FaBold /></button>
            <button className="button is-small is-warning" onClick={() => insertMarkdown('_', true)}><FaItalic /></button>
            <button className="button is-small is-link" onClick={() => insertMarkdown('# ', false)}><FaHeading /></button>
            <button className="button is-small is-info" onClick={() => insertMarkdown('==', true)}><FaHighlighter /></button>
            <button className="button is-small is-link" onClick={() => insertMarkdown('*** ', false)}><FaGripLines /></button>
            <button className="button is-small is-danger" onClick={() => insertMarkdown('> ', false)}><FaQuoteLeft /></button>
            <button className="button is-small is-success" onClick={() => insertMarkdown('- ', false)}><FaListUl /></button>
            <button className="button is-small is-link" onClick={() => insertMarkdown('[Text](https://medit.pages.dev/)', false)}><FaLink /></button>
            <button className="button is-small is-warning" onClick={() => insertMarkdown('![Alt text](/favicon.ico)', false)}><FaImage /></button>
            <button className="button is-small is-success" onClick={copyToClipboard}><FaCopy /></button>
          </div>

          {/* Editor */}
            <RichTextPlugin
              contentEditable={<ContentEditable className="textarea is-warning" style={{ minHeight: '300px', width: '100%' }} />}
              placeholder={<p className="has-text-danger mt-2">Start typing here...</p>}
            />
            <OnChangePlugin onChange={handleEditorChange} />
            <HistoryPlugin />
          {/* Word Count Display */}
             <p className="has-text-info-dark has-text-weight-bold mt-3">Total Words: {wordCount}</p>
        </div>
      </div>

      {/* Preview Card */}
      <div className="card mt-4">
        <div className="card-content content">
          <h2 className="title mb-5"><FaEye size={30} /></h2>
          <div style={{ minHeight: '300px', width: '100%' }} className="mt-5 mb-5">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanHtml) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="section">
      <h1 className="title is-4 has-text-centered has-text-dark is-flex is-align-items-center is-justify-content-center mb-4">
        <FaMarkdown size={40} />
         &nbsp; Markdown Editor
      </h1>
      <LexicalComposer initialConfig={initialConfig}>
        <Editor />
      </LexicalComposer>
    </div>
  );
}

export default App;
