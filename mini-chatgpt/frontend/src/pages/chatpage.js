import  { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import ChatHistory from "../components/ChatHistory";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://mini-chatgpt-assignment.onrender.com/api";

// API functions
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

const sendMessage = async (chatId, content) => {
  if (!chatId || !content) throw new Error("Chat ID and content are required");
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
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);

  // Responsive sidebar handling
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
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

  useEffect(() => {
    if (isMobile && !isEditingTitle) {
      setSidebarOpen(false);
    }
  }, [chatId, isMobile, isEditingTitle]);

  const handleTitleEditStatus = (isEditing) => {
    setIsEditingTitle(isEditing);
    if (isEditing && isMobile && !sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  // Queries
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

  const {
    data: currentChat,
    isLoading: isLoadingChat,
    error: chatError,
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => fetchChat(chatId),
    enabled: !!chatId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const createChatMutation = useMutation({
    mutationFn: createNewChat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigate(`/chat/${data._id}`);
      if (isMobile && !isEditingTitle) setSidebarOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
      alert("Failed to create chat. Please try again.");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, content }) => sendMessage(chatId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      setIsLoading(false);
      setShowTypingIndicator(false);
      setLocalMessages([]);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
      setIsLoading(false);
      setShowTypingIndicator(false);
      setLocalMessages([]);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateLastMessage,
    onMutate: () => {
      setIsRegenerating(true);
      setShowTypingIndicator(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setIsRegenerating(false);
      setShowTypingIndicator(false);
    },
    onError: (error) => {
      console.error("Failed to regenerate:", error);
      alert("Failed to regenerate response. Please try again.");
      setIsRegenerating(false);
      setShowTypingIndicator(false);
    },
  });

  const editAndRegenerateMutation = useMutation({
    mutationFn: editAndRegenerateMessage,
    onMutate: () => {
      setShowTypingIndicator(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setEditingMessageId(null);
      setEditingContent("");
      setShowTypingIndicator(false);
    },
    onError: (error) => {
      console.error("Failed to edit and regenerate:", error);
      alert("Failed to edit and regenerate response. Please try again.");
      setShowTypingIndicator(false);
    },
  });

  const handleNewChat = () => {
    if (!isEditingTitle) {
      createChatMutation.mutate();
    }
  };

  const handleSelectChat = (id) => {
    if (!isEditingTitle) {
      navigate(`/chat/${id}`);
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  const handleMessageSend = async (content) => {
    if (!content.trim() || !chatId) return;
    
    // Add user message to local state immediately
    setLocalMessages([{ 
      role: 'user', 
      content, 
      _id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString()
    }]);
    
    setIsLoading(true);
    setShowTypingIndicator(true);
    
    // Send the message
    sendMessageMutation.mutate({ chatId, content });
  };

  const handleFirstMessage = async (content) => {
    if (!content.trim() || isCreatingNewChat) return;
    
    setIsCreatingNewChat(true);
    
    try {
      // Add user message to local state immediately
      setLocalMessages([{ 
        role: 'user', 
        content, 
        _id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString()
      }]);
      
      setShowTypingIndicator(true);
      
      // Create new chat
      const newChat = await createNewChat();
      
      // Send message to the new chat
      await sendMessage(newChat._id, content);
      
      navigate(`/chat/${newChat._id}`);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      
      // Clear local state
      setLocalMessages([]);
      setShowTypingIndicator(false);
      
    } catch (error) {
      console.error("Failed to create chat and send message:", error);
      alert("Failed to send message. Please try again.");
      setLocalMessages([]);
      setShowTypingIndicator(false);
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const handleRegenerate = () => {
    if (!chatId || !messages.length || isRegenerating) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      regenerateMutation.mutate(chatId);
    }
  };

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
    if (!isEditingTitle) {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const messages = currentChat?.messages || [];
  const allMessages = [...messages, ...localMessages];
  
  const canRegenerate = chatId && 
                       messages.length > 0 && 
                       messages[messages.length - 1]?.role === 'assistant' &&
                       !isRegenerating;

  // Determine if we should show typing indicator
  const shouldShowTypingIndicator = showTypingIndicator && 
                                   (isLoading || isRegenerating || editAndRegenerateMutation.isPending);

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Mobile Hamburger Button */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          disabled={isEditingTitle}
          className={`fixed top-3 left-3 z-50 p-2.5 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition-colors border border-gray-700 ${
            isEditingTitle ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Open sidebar"
        >
          <Menu size={20} className="text-gray-300" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && !isEditingTitle && (
        <div
          className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-72 transform' : 'relative w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out
          bg-gray-800 border-r border-gray-700 flex flex-col shadow-xl
          h-screen
        `}
      >
        {/* Sidebar Header with Image and Close Button */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {/* Logo/Image on left */}
            <div className="flex-shrink-0 flex items-center gap-3">
              {/* Image - Hidden on mobile, visible on desktop */}
              <div className="hidden md:block">
                <img 
                  src="/Mini-Chatgpt.jpg" 
                  alt="Chat History Header" 
                  className="w-10 h-10 object-cover rounded-full"
                />
              </div>
              
              {/* Text - Always visible */}
              <h1 className="text-2xl font-bold text-blue-500">Mini ChatGPT</h1>
            </div>

            
            {/* Close Button on right (mobile only) */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                disabled={isEditingTitle}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* New Chat Button below */}
          <div className="mt-4">
            <button
              onClick={handleNewChat}
              disabled={createChatMutation.isPending || isEditingTitle}
              className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center justify-center gap-2 border border-blue-500/30 ${
                createChatMutation.isPending || isEditingTitle ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatHistory
            chats={chats || []}
            currentChatId={chatId}
            onSelectChat={handleSelectChat}
            onTitleEditStatus={handleTitleEditStatus}
            isLoading={isLoadingChats}
            error={chatsError}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!sidebarOpen && !isMobile ? 'ml-0' : ''}`}>
        {/* Fixed Navbar */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-gray-800 border-b border-gray-700 z-30 md:left-64">
          <div className="h-full flex items-center justify-center px-4">
            <div className="relative w-full max-w-4xl mx-auto">
              <h1 className="text-lg font-semibold text-gray-200 text-center line-clamp-2 px-12 md:px-4 leading-tight">
                {currentChat?.title || 'Mini ChatGPT'}
              </h1>
              {isMobile && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                  <img 
                    src="/Mini-Chatgpt.jpg" 
                    alt="Mini-ChatGPT"
                    className="w-13 h-10 squared-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden pt-14 pb-20 bg-gray-900">
          <MessageList
            messages={allMessages}
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
            showTypingIndicator={shouldShowTypingIndicator}
          />
        </div>

        {/* Fixed Message Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-30 md:left-64">
          <MessageInput
            chatId={chatId}
            onSend={handleMessageSend}
            onFirstMessage={handleFirstMessage}
            disabled={
              isLoading || 
              isRegenerating || 
              isCreatingNewChat || 
              editingMessageId || 
              editAndRegenerateMutation.isPending ||
              sendMessageMutation.isPending
            }
            isCreatingNewChat={isCreatingNewChat}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;