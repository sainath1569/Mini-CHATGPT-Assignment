import React, { useEffect, useRef } from 'react';
import { useState } from "react";
import { format } from 'date-fns';
import { Bot, User, AlertCircle, RefreshCw, Edit2, Send, X, Check, Copy } from 'lucide-react';

const MessageList = ({ 
  messages = [], 
  isLoading, 
  error, 
  isEmpty, 
  currentChat,
  onRegenerate,
  onEditAndRegenerate,
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

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);
  
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 200)}px`;
    }
  }, [editingMessageId, editingContent]);
  
  // Auto-hide copy toast after 2 seconds
  useEffect(() => {
    if (showCopyToast) {
      const timer = setTimeout(() => {
        setShowCopyToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showCopyToast]);
  
  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      const isAtBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };
  
  // Check if message is the last user message
  const isLastUserMessage = (message, index) => {
    if (message.role !== 'user') return false;
    
    // Find the last user message index
    const lastUserMessageIndex = messages.map((msg, idx) => ({
      role: msg.role,
      index: idx
    }))
    .filter(msg => msg.role === 'user')
    .pop()?.index;
    
    return index === lastUserMessageIndex;
  };
  
  // Copy message content to clipboard
  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setToastMessage('copied');
      setShowCopyToast(true);
      
      setCopiedMessageId(content);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setToastMessage('Text copied');
      setShowCopyToast(true);
      
      setCopiedMessageId(content);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };
  
  // Image error fallback
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%233b82f6'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grad)' rx='20'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='30' font-weight='bold' fill='white'%3EM%3C/text%3E%3C/svg%3E`;
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6 bg-red-50 rounded-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
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
        <div className="text-center max-w-2xl px-4">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-36 h-33 squared-2xl overflow-hidden bg-gradient-to-r from-blue-500/20 to-purple-600/20 mb-6 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <p className="text-lg text-gray-600 mb-8">
              Hey there! I'm your AI assistant. What's up today?
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2">Example Prompts</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>"Explain quantum computing in simple terms"</li>
                <li>"Write a Python function to sort a list"</li>
                <li>"Help me plan a weekend trip"</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800 mb-2">Capabilities</h3>
              <ul className="space-y-2 text-sm text-gray-600">
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
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-36 h-33 rounded-xl overflow-hidden bg-gradient-to-r from-blue-500/20 to-purple-600/20 mb-4 mx-auto">
              <img 
                src="/Mini-Chatgpt.jpg" 
                alt="Mini-ChatGPT"
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Hey there! 👋</h3>
            <p className="text-gray-600 mb-6">
              I'm Mini-GPT, your AI assistant. Feel free to ask me anything!
            </p>
          </div>
          
          <div className="space-y-3">
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
    <div className="h-full flex flex-col min-w-0">
      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-gray-800/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[140px] justify-center">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {currentChat && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center">
            <div className="flex-1 flex items-center justify-center relative">
              <div className="text-center min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-gray-800 px-12 md:px-0 break-words line-clamp-2">
                  {currentChat.title || 'Untitled Chat'}
                </h1>
              </div>
            </div>
            
            <div className="md:hidden absolute right-4">
              <div className="relative">
                <img 
                  src="/Mini-Chatgpt.jpg" 
                  alt="Mini-ChatGPT"
                  className="w-13 h-10 squared-full object-cover border-2 border-gray-100 shadow"
                  onError={handleImageError}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Container - FIXED FOR NEAT DISPLAY */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 bg-gradient-to-b from-white to-gray-50 min-w-0"
      >
        {messages.map((message, index) => (
          <div
            key={message._id || index}
            className={`flex group ${message.role === 'user' ? 'justify-end' : 'justify-start'} min-w-0`}
          >
            <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] min-w-0 flex gap-2 sm:gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User size={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <Bot size={14} className="sm:w-4 sm:h-4" />
                )}
              </div>
              
              {/* Message Bubble */}
              <div className="flex flex-col flex-1 min-w-0 max-w-full">
                <div
                  className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm min-w-0 w-full ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  } ${message.error ? 'bg-red-50 border-red-200' : ''} ${
                    editingMessageId === message._id ? 'ring-2 ring-blue-400 shadow-lg' : ''
                  }`}
                >
                  {editingMessageId === message._id ? (
                    // Edit mode
                    <div className="space-y-3 min-w-0">
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full min-w-0 bg-transparent text-gray-800 focus:outline-none resize-none text-sm sm:text-base break-words"
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
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={onCancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <X size={14} />
                            <span className="hidden sm:inline">Cancel</span>
                            <span className="sm:hidden">Cancel</span>
                          </button>
                          <button
                            onClick={onSaveEdit}
                            disabled={!editingContent.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={14} />
                            <span className="hidden sm:inline">Save & Regenerate</span>
                            <span className="sm:hidden">Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode - FIXED FOR NEAT TEXT DISPLAY
                    <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed text-sm sm:text-base min-w-0">
                      {message.content || message.text}
                    </div>
                  )}
                </div>
                
                {/* Message Actions & Timestamp */}
                <div className={`flex items-center justify-between mt-1 px-1 min-w-0 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Regenerate button */}
                    {message.role === 'user' && 
                     isLastUserMessage(message, index) && 
                     !editingMessageId && (
                      <>
                        <button
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                          className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors flex-shrink-0"
                          title="Regenerate last response"
                        >
                          <RefreshCw size={12} className={`sm:w-3 sm:h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                        </button>
                        
                        <button
                          onClick={() => onEditMessage(message._id, message.content)}
                          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                          title="Edit message & regenerate response"
                        >
                          <Edit2 size={12} className="sm:w-3 sm:h-3" />
                        </button>
                      </>
                    )}
                    
                    {/* Copy button */}
                    {!editingMessageId && (
                      <button
                        onClick={() => handleCopyMessage(message.content || message.text)}
                        className={`p-1 flex-shrink-0 ${
                          copiedMessageId === (message.content || message.text)
                            ? 'text-green-500 hover:text-green-600 bg-green-50'
                            : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'
                        } rounded transition-colors`}
                        title="Copy message"
                      >
                        {copiedMessageId === (message.content || message.text) ? (
                          <Check size={12} className="sm:w-3 sm:h-3" />
                        ) : (
                          <Copy size={12} className="sm:w-3 sm:h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs flex-shrink-0 whitespace-nowrap ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {format(new Date(message.createdAt || message.timestamp || new Date()), 'HH:mm')}
                    {message.error && <span className="text-red-500 ml-1">• Error</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
};

export default MessageList;