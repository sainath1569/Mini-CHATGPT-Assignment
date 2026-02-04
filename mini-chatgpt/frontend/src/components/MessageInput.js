import  { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const MessageInput = ({ chatId, onSend, onFirstMessage, disabled, isCreatingNewChat }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || disabled) return;

    if (chatId) {
      onSend(trimmedValue);
    } else {
      onFirstMessage(trimmedValue);
    }
    
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3 bg-gray-700 rounded-xl p-2 border border-gray-600 focus-within:border-blue-500 transition-colors">
          
          
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={chatId ? "Message Mini ChatGPT..." : "Type your first message..."}
            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none max-h-32 min-h-[40px] py-2 text-sm"
            rows={1}
            disabled={disabled}
          />
          
          <div className="flex items-center gap-1">
            
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || disabled}
              className={`p-2 rounded-lg ${!inputValue.trim() || disabled ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-500'} transition-colors`}
            >
              {isCreatingNewChat ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-2 px-4">
          Mini ChatGPT can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};

export default MessageInput;