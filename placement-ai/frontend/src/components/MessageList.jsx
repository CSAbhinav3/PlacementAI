import { Component } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";

// PrismAsyncLight ships the highlighter core only - no languages - and
// loads it as an async chunk. Register just what this project's chatbot
// actually produces instead of pulling in every Prism language up front.
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);

// Fenced code blocks get a `language-xxx` className from remark; inline
// code doesn't. That's the signal react-markdown's docs recommend for
// telling the two apart in the `code` override. A fenced language outside
// the registered set (e.g. ```typescript```) still renders - just as plain
// unhighlighted text, since Prism has no grammar loaded for it.
function CodeBlock({ className, children, ...rest }) {
  const match = /language-(\w+)/.exec(className || "");
  const text = String(children).replace(/\n$/, "");

  if (!match) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }

  return (
    <SyntaxHighlighter
      language={match[1]}
      style={oneDark}
      PreTag="div"
      customStyle={{ margin: 0, borderRadius: 8 }}
    >
      {text}
    </SyntaxHighlighter>
  );
}

// Markdown streams in token by token, so mid-stream text is routinely
// invalid/incomplete markdown (an unclosed ``` fence, a dangling `**`, ...).
// remark/react-markdown parse that gracefully on their own, but this
// boundary is a last-resort net: if rendering ever does throw, fall back to
// plain text for that message instead of taking down the whole chat.
class MarkdownErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    // A message's content changes on every streamed token; once it's valid
    // again (e.g. the fence finally closed), retry rendering as markdown.
    if (prevProps.text !== this.props.text && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <p className="message-text">{this.props.text}</p>;
    }
    return this.props.children;
  }
}

function AssistantMessage({ text }) {
  return (
    <MarkdownErrorBoundary text={text}>
      <div className="message-text markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
          {text}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}

export default function MessageList({ messages }) {
  return (
    <div className="message-list">
      {messages.length === 0 && (
        <p className="message-list-empty">Say hello to start the round trip.</p>
      )}
      {messages.map((message) => (
        <div key={message.id} className={`message message-${message.role}`}>
          <span className="message-role">{message.role === "user" ? "You" : "Claude"}</span>
          {message.role === "assistant" ? (
            <AssistantMessage text={message.text} />
          ) : (
            <p className="message-text">{message.text}</p>
          )}
          {message.streaming && <span className="cursor" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
