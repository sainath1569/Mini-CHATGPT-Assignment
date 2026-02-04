import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://mini-chatgpt-assignment.onrender.com/api";

const MessageInput = ({ chatId, onSend, onFirstMessage, disabled, isCreatingNewChat }) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }) => {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onSend?.();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    },
  });

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    
    if (!chatId && onFirstMessage) {
      onFirstMessage(message);
      setMessage("");
    } else if (chatId && onSend) {
      sendMessageMutation.mutate({ chatId, content: message });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="p-3 border-t bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[56px] max-h-[120px] disabled:bg-gray-100 text-sm"
              rows={1}
              placeholder={chatId ? "Type your message..." : "Type a message to start a new chat..."}
              disabled={disabled}
            />
            
            {message.length > 0 && (
              <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                {message.length}/2000
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={disabled || !message.trim() || (chatId && sendMessageMutation.isPending) || (!chatId && isCreatingNewChat)}
            className="flex-shrink-0 bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {chatId ? (
              sendMessageMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )
            ) : (
              isCreatingNewChat ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )
            )}
          </button>
        </div>

        <div className="mt-1 text-xs text-gray-500 text-center">
          {chatId ? "Press Enter to send • Shift+Enter for new line" : "Press Enter to start a new chat"}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;