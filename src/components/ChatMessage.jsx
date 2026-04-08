import React from 'react';
import { User, Clapperboard } from 'lucide-react';

/**
 * Render basic markdown: **bold**, *italic*, bullet lists, line breaks
 */
function renderMarkdown(text) {
  if (!text) return null;

  // Split by double newline (paragraphs) or single newline for list items
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="chat-md-list">
          {listItems.map((item, i) => (
            <li key={i}>{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const inlineMarkdown = (str) => {
    // **bold** and *italic*
    const parts = [];
    let remaining = str;
    let partKey = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);

      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
      const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity;

      if (boldIdx === Infinity && italicIdx === Infinity) {
        parts.push(<span key={partKey++}>{remaining}</span>);
        break;
      }

      if (boldIdx <= italicIdx && boldMatch) {
        if (boldIdx > 0) parts.push(<span key={partKey++}>{remaining.slice(0, boldIdx)}</span>);
        parts.push(<strong key={partKey++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch[0].length);
      } else if (italicMatch) {
        if (italicIdx > 0) parts.push(<span key={partKey++}>{remaining.slice(0, italicIdx)}</span>);
        parts.push(<em key={partKey++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicIdx + italicMatch[0].length);
      }
    }
    return parts.length > 0 ? parts : str;
  };

  lines.forEach((line) => {
    // Bullet list item
    if (/^[\-\*] /.test(line)) {
      listItems.push(line.slice(2));
    } else if (/^\d+\. /.test(line)) {
      listItems.push(line.replace(/^\d+\. /, ''));
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<br key={key++} />);
      } else {
        elements.push(
          <p key={key++} className="chat-md-p">
            {inlineMarkdown(line)}
          </p>
        );
      }
    }
  });
  flushList();

  return elements;
}

/**
 * ChatMessage — renders a single chat message bubble.
 * - User messages: right-aligned
 * - AI messages: left-aligned with markdown rendering
 * - Typing indicator when streaming with no content yet
 */
export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg--user' : 'chat-msg--ai'}`}>
      <div className="chat-avatar">
        {isUser ? <User size={14} /> : <Clapperboard size={14} />}
      </div>
      <div className="chat-bubble">
        {isStreaming && !message.content ? (
          <div className="chat-typing">
            <span /><span /><span />
          </div>
        ) : isUser ? (
          <div className="chat-bubble-text chat-bubble-text--user">
            {message.content || ''}
          </div>
        ) : (
          <div className="chat-bubble-text chat-bubble-text--ai">
            {renderMarkdown(message.content || '')}
          </div>
        )}
      </div>
    </div>
  );
}
