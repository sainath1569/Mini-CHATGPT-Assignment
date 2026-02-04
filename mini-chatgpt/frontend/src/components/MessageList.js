import { useEffect, useRef } from 'react';
import { useState } from "react";
import { Bot, User, AlertCircle, RefreshCw, Edit2, Send, X, Check, Copy, ChevronDown } from 'lucide-react';

const MessageList = ({ 
  messages = [], 
  isLoading, 
  error, 
  isEmpty, 
  currentChat,
  onRegenerate,
  canRegenerate,
  isRegenerating,
  editingMessageId,
  editingContent,
  onEditMessage,
  onSaveEdit,
  onCancelEdit,
  onContentChange,
  showTypingIndicator = false
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const editTextareaRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // Auto-scroll when new messages arrive and when typing indicator appears
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, autoScroll, showTypingIndicator]);

  // Initial scroll to bottom
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
          setAutoScroll(true);
        }
      }, 50);
    }
  }, [messages.length]);

  // Focus edit textarea
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 200)}px`;
    }
  }, [editingMessageId, editingContent]);

  // Auto-hide copy toast
  useEffect(() => {
    if (showCopyToast) {
      const timer = setTimeout(() => setShowCopyToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showCopyToast]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setAutoScroll(true);
    }
  };

  const isLastUserMessage = (message, index) => {
    if (message.role !== 'user') return false;
    const lastUserMessageIndex = messages
      .map((msg, idx) => ({ role: msg.role, index: idx }))
      .filter(msg => msg.role === 'user')
      .pop()?.index;
    return index === lastUserMessageIndex;
  };

  const handleCopyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setToastMessage('Copied to clipboard!');
      setShowCopyToast(true);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setToastMessage('Failed to copy');
      setShowCopyToast(true);
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236d28d9'/%3E%3Cstop offset='100%25' stop-color='%231d4ed8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grad)' rx='20'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='30' font-weight='bold' fill='white'%3EM%3C/text%3E%3C/svg%3E`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500"></div>
            <p className="text-sm text-gray-300">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center p-5 bg-red-900/20 rounded-xl max-w-md border border-red-800/30">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Error loading messages</p>
          <p className="text-red-400 text-sm mb-4">
            {error.message || 'Please check your connection and try again'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-xl px-4">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-43 h-34 rounded-xl overflow-hidden mb-4 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-15 h-15"
                onError={handleImageError}
              />
            </div>
            <p className="text-lg text-gray-300 mb-6">
              Hey there! I'm your AI assistant. What's up today?
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-gray-200 mb-2 text-sm">Example Prompts</h3>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li>"Explain quantum computing in simple terms"</li>
                <li>"Write a Python function to sort a list"</li>
                <li>"Help me plan a weekend trip"</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-gray-200 mb-2 text-sm">Capabilities</h3>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li>Answer questions on various topics</li>
                <li>Help with coding and debugging</li>
                <li>Creative writing assistance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md px-4">
          <div className="mb-5">
            <div className="inline-flex items-center justify-center w-28 h-24 rounded-xl overflow-hidden mb-3 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-200">Hey there! 👋</h3>
            <p className="text-gray-400 mb-4 text-sm">
              I'm Mini-GPT, your AI assistant. Feel free to ask me anything!
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/30">
              <p className="text-sm text-blue-300">
                <span className="font-medium">Try asking:</span> "What can you help me with?"
              </p>
            </div>
            <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-800/30">
              <p className="text-sm text-purple-300">
                <span className="font-medium">Or:</span> "Explain machine learning in simple terms"
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter out temporary messages that might have been replaced
  const displayMessages = messages.filter(msg => !msg._id?.startsWith('temp-') || msg.role === 'user');

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-gray-800 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-gray-700">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* Messages Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-3 sm:p-4 md:p-6 space-y-8"
      >
        {displayMessages.map((message, index) => (
          <div
            key={message._id || index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            onMouseEnter={() => setHoveredMessageId(message._id || index)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <div className={`max-w-[85%] sm:max-w-[80%] flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-900 text-blue-300' 
                  : 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 text-purple-300'
              }`}>
                {message.role === 'user' ? (
                  <User size={18} />
                ) : (
                  <Bot size={18} />
                )}
              </div>
              
              {/* Message Content with action buttons container */}
              <div className="flex-1 min-w-0 relative">
                {/* Message bubble and action buttons container */}
                <div className="relative">
                  <div
                    className={`rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-700 text-white rounded-br-none border border-blue-600/50'
                        : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
                    } ${editingMessageId === message._id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                  >
                    {editingMessageId === message._id ? (
                      <div className="space-y-4">
                        <textarea
                          ref={editTextareaRef}
                          value={editingContent}
                          onChange={(e) => onContentChange(e.target.value)}
                          className="w-full min-w-0 bg-transparent text-gray-200 focus:outline-none resize-none text-sm placeholder-gray-500"
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.preventDefault();
                              onSaveEdit();
                            }
                            if (e.key === 'Escape') {
                              onCancelEdit();
                            }
                          }}
                          placeholder="Edit your message..."
                        />
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                          <button
                            onClick={onCancelEdit}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <X size={16} />
                            Cancel
                          </button>
                          <button
                            onClick={onSaveEdit}
                            disabled={!editingContent.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Send size={16} />
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content || message.text}
                      </div>
                    )}
                  </div>
                  
                  {/* Message Action Buttons - Always positioned at bottom right of message row */}
                  <div className={`absolute ${
                    message.role === 'user' 
                      ? 'right-0 -bottom-8' 
                      : 'left-0 -bottom-8'
                  } flex items-center gap-2 transition-all duration-200 ${
                    (hoveredMessageId === (message._id || index) || editingMessageId === message._id)
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible translate-y-2'
                  }`}>
                    {/* Copy button for all messages */}
                    {!editingMessageId && (
                      <button
                        onClick={() => handleCopyMessage(message.content || message.text, message._id || index)}
                        className={`p-1.5 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white hover:bg-blue-500'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } transition-colors shadow-md border ${
                          message.role === 'user'
                            ? 'border-blue-500/30'
                            : 'border-gray-600'
                        }`}
                        title="Copy message"
                      >
                        {copiedMessageId === (message._id || index) ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                    
                    {/* Edit and Regenerate buttons only for last user message */}
                    {message.role === 'user' && 
                     isLastUserMessage(message, index) && 
                     !editingMessageId && (
                      <>
                        <button
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                          className="p-1.5 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors shadow-md border border-green-600/30 disabled:opacity-50"
                          title="Regenerate last response"
                        >
                          <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => onEditMessage(message._id, message.content)}
                          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-md border border-blue-500/30"
                          title="Edit message"
                        >
                          <Edit2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* WhatsApp-style typing indicator - Only show if last message isn't from assistant */}
        {showTypingIndicator && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[80%] flex gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 text-purple-300">
                <Bot size={18} />
              </div>
              
              {/* Typing bubble */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="rounded-2xl px-4 py-3 shadow-sm bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700">
                  <div className="flex items-center space-x-2">
                    {/* WhatsApp-style 3 dots animation */}
                    <div className="flex items-center space-x-1">
                      <div className="typing-dot bg-gray-400"></div>
                      <div className="typing-dot bg-gray-400"></div>
                      <div className="typing-dot bg-gray-400"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-4 z-40 p-2.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors border border-blue-500/30"
          title="Scroll to bottom"
        >
          <ChevronDown size={18} />
        </button>
      )}
      
      {/* Add CSS for typing dots */}
      <style jsx>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: typingAnimation 1.4s infinite ease-in-out both;
        }
        
        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typingAnimation {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageList;