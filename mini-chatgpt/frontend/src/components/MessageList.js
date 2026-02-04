import { useEffect, useRef } from 'react';
import { useState } from "react";
import { format } from 'date-fns';
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
  onContentChange
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const editTextareaRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, autoScroll]);

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

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setToastMessage('Copied!');
      setShowCopyToast(true);
      setCopiedMessageId(content);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setToastMessage('Copied to clipboard');
      setShowCopyToast(true);
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%233b82f6'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grad)' rx='20'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='30' font-weight='bold' fill='white'%3EM%3C/text%3E%3C/svg%3E`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-600">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-5 bg-red-50 rounded-xl max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium mb-2">Error loading messages</p>
          <p className="text-red-500 text-sm mb-4">
            {error.message || 'Please check your connection and try again'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-xl px-4">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-43 h-34 rounded-xl overflow-hidden  mb-4 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-15 h-15 "
                onError={handleImageError}
              />
            </div>
            <p className="text-lg text-gray-600 mb-6">
              Hey there! I'm your AI assistant. What's up today?
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Example Prompts</h3>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>"Explain quantum computing in simple terms"</li>
                <li>"Write a Python function to sort a list"</li>
                <li>"Help me plan a weekend trip"</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Capabilities</h3>
              <ul className="space-y-1.5 text-xs text-gray-600">
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-4">
          <div className="mb-5">
            <div className="inline-flex items-center justify-center w-28 h-24 rounded-xl overflow-hidden bg-gradient-to-r from-blue-500/20 to-purple-600/20 mb-3 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Hey there! 👋</h3>
            <p className="text-gray-600 mb-4 text-sm">
              I'm Mini-GPT, your AI assistant. Feel free to ask me anything!
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Try asking:</span> "What can you help me with?"
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800">
                <span className="font-medium">Or:</span> "Explain machine learning in simple terms"
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-gray-800/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* Messages Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4"
      >
        {messages.map((message, index) => (
          <div
            key={message._id || index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[80%] flex gap-2.5 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User size={16} />
                ) : (
                  <Bot size={16} />
                )}
              </div>
              
              {/* Message Content */}
              <div className="flex flex-col flex-1 min-w-0">
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  } ${editingMessageId === message._id ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
                >
                  {editingMessageId === message._id ? (
                    <div className="space-y-3">
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-gray-800 focus:outline-none resize-none text-sm"
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
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={onCancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                        <button
                          onClick={onSaveEdit}
                          disabled={!editingContent.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send size={14} />
                          Save & Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-sm">
                      {message.content || message.text}
                    </div>
                  )}
                </div>
                
                {/* Message Actions */}
                <div className={`flex items-center justify-between mt-1.5 px-1 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className="flex items-center gap-1.5">
                    {message.role === 'user' && 
                     isLastUserMessage(message, index) && 
                     !editingMessageId && (
                      <>
                        <button
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                          className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                          title="Regenerate last response"
                        >
                          <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => onEditMessage(message._id, message.content)}
                          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Edit message"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                    
                    {!editingMessageId && (
                      <button
                        onClick={() => handleCopyMessage(message.content || message.text)}
                        className={`p-1 ${
                          copiedMessageId === (message.content || message.text)
                            ? 'text-green-500 hover:text-green-600 bg-green-50'
                            : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'
                        } rounded transition-colors`}
                        title="Copy message"
                      >
                        {copiedMessageId === (message.content || message.text) ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className={`text-xs ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {format(new Date(message.createdAt || message.timestamp || new Date()), 'HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-4 z-40 p-2.5 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="Scroll to bottom"
        >
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  );
};

export default MessageList;