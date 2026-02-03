import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react"; // Import hamburger icons
import ChatHistory from "../components/ChatHistory";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import LoadingIndicator from "../components/LoadingIndicator";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// API functions using fetch
const fetchChats = async () => {
  const response = await fetch(`${API_BASE_URL}/chats`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch chats");
  }
  return response.json();
};

const fetchChat = async (chatId) => {
  if (!chatId) throw new Error("Chat ID is required");
  const response = await fetch(`${API_BASE_URL}/chats/${chatId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch chat");
  }
  return response.json();
};

const createNewChat = async () => {
  const response = await fetch(`${API_BASE_URL}/chats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create chat");
  }
  return response.json();
};

const sendNewMessage = async ({ chatId, content }) => {
  if (!chatId || !content) {
    throw new Error("Chat ID and content are required");
  }
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
};

// Regenerate last message API
const regenerateLastMessage = async (chatId) => {
  if (!chatId) throw new Error("Chat ID is required");
  const response = await fetch(`${API_BASE_URL}/chats/${chatId}/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to regenerate response");
  }
  return response.json();
};

// Edit message AND regenerate API
const editAndRegenerateMessage = async ({ chatId, messageId, content }) => {
  if (!chatId || !messageId || !content) {
    throw new Error("Chat ID, message ID and content are required");
  }
  const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/${messageId}/regenerate`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to edit and regenerate");
  }
  return response.json();
};

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Close sidebar when chat is selected on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [chatId, isMobile]);

  // ✅ Fetch chats list
  const {
    data: chats,
    isLoading: isLoadingChats,
    error: chatsError,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ✅ Fetch current chat
  const {
    data: currentChat,
    isLoading: isLoadingChat,
    error: chatError,
    refetch: refetchChat,
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => fetchChat(chatId),
    enabled: !!chatId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ✅ Create chat mutation
  const createChatMutation = useMutation({
    mutationFn: createNewChat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigate(`/chat/${data._id}`);
      if (isMobile) setSidebarOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
      alert("Failed to create chat. Please try again.");
    },
  });

  // ✅ Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: regenerateLastMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setIsRegenerating(false);
    },
    onError: (error) => {
      console.error("Failed to regenerate:", error);
      alert("Failed to regenerate response. Please try again.");
      setIsRegenerating(false);
    },
  });

  // ✅ Edit AND regenerate mutation
  const editAndRegenerateMutation = useMutation({
    mutationFn: editAndRegenerateMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setEditingMessageId(null);
      setEditingContent("");
    },
    onError: (error) => {
      console.error("Failed to edit and regenerate:", error);
      alert("Failed to edit and regenerate response. Please try again.");
    },
  });

  const handleNewChat = () => {
    createChatMutation.mutate();
  };

  const handleSelectChat = (id) => {
    navigate(`/chat/${id}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleMessageSend = async () => {
    setIsLoading(true);
    try {
      await refetchChat();
    } catch (error) {
      console.error("Error refetching chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle regenerate
  const handleRegenerate = () => {
    if (!chatId || !messages.length || isRegenerating) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      setIsRegenerating(true);
      regenerateMutation.mutate(chatId);
    }
  };

  // Handle edit message
  const handleEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (!chatId || !editingMessageId || !editingContent.trim()) return;
    
    editAndRegenerateMutation.mutate({
      chatId,
      messageId: editingMessageId,
      content: editingContent
    });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // The backend returns chat with messages included
  const messages = currentChat?.messages || [];
  
  // Check if we can show regenerate button
  const canRegenerate = chatId && 
                       messages.length > 0 && 
                       messages[messages.length - 1]?.role === 'assistant' &&
                       !isRegenerating;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Hamburger Menu Button for Mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-2 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-64 transform' : 'relative w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out
          bg-white border-r border-gray-200 flex flex-col shadow-lg
        `}
      >
        <div className="p-4">
          <img 
            src="/Mini-Chatgpt.jpg" 
            alt="Chat History Header" 
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewChat}
            disabled={createChatMutation.isPending}
            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {createChatMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <span className="text-lg">+</span> New Chat
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatHistory
            chats={chats || []}
            currentChatId={chatId}
            onSelectChat={handleSelectChat}
            isLoading={isLoadingChats}
            error={chatsError}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${isMobile ? '' : ''}`}>
        

        <div className="flex-1 overflow-hidden relative">
          <MessageList
            messages={messages}
            isLoading={isLoadingChat}
            error={chatError}
            isEmpty={!chatId}
            currentChat={currentChat}
            onRegenerate={handleRegenerate}
            canRegenerate={canRegenerate}
            isRegenerating={isRegenerating}
            editingMessageId={editingMessageId}
            editingContent={editingContent}
            onEditMessage={handleEditMessage}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onContentChange={setEditingContent}
          />

          {(isLoading || createChatMutation.isPending || isRegenerating || editAndRegenerateMutation.isPending) && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <LoadingIndicator />
            </div>
          )}
        </div>

        <MessageInput
          chatId={chatId}
          onSend={handleMessageSend}
          disabled={!chatId || isLoading || isRegenerating || editingMessageId || editAndRegenerateMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ChatPage;