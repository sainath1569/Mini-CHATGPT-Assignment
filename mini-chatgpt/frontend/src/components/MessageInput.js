import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Mic } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const MessageInput = ({ chatId, onSend, disabled }) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  // Send message mutation using fetch directly
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
      // Invalidate both chats and specific chat queries
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
    if (!message.trim() || disabled || !chatId) return;
    sendMessageMutation.mutate({ chatId, content: message });
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="border-t bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[56px] max-h-[120px] disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              placeholder="Type your message here..."
              disabled={disabled || sendMessageMutation.isPending}
            />
            
            {/* Character count */}
            {message.length > 0 && (
              <div className="absolute bottom-2 right-4 text-xs text-gray-400">
                {message.length}/2000
              </div>
            )}
          </div>

          {/* Send button */}
                <button
                onClick={handleSend}
                disabled={disabled || sendMessageMutation.isPending || !message.trim()}
                className="flex-shrink-0 bg-blue-600 text-white p-4 mb-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                {sendMessageMutation.isPending ? (
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={26} />
                )}
                </button>
              </div>

              {/* Recording indicator */}
        {isRecording && (
          <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording...</span>
            <button
              onClick={() => setIsRecording(false)}
              className="text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200"
            >
              Stop
            </button>
          </div>
        )}

        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default MessageInput;