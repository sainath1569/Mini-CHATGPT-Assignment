import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import ChatHistory from "../components/ChatHistory";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import LoadingIndicator from "../components/LoadingIndicator";

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
    refetch: refetchChat,
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

  const handleFirstMessage = async (content) => {
    if (!content.trim() || isCreatingNewChat) return;
    
    setIsCreatingNewChat(true);
    
    try {
      const newChat = await createNewChat();
      await fetch(`${API_BASE_URL}/chats/${newChat._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      
      navigate(`/chat/${newChat._id}`);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      
    } catch (error) {
      console.error("Failed to create chat and send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const handleRegenerate = () => {
    if (!chatId || !messages.length || isRegenerating) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      setIsRegenerating(true);
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
  const canRegenerate = chatId && 
                       messages.length > 0 && 
                       messages[messages.length - 1]?.role === 'assistant' &&
                       !isRegenerating;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          disabled={isEditingTitle}
          className={`fixed top-3 left-3 z-50 p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors ${
            isEditingTitle ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && !isEditingTitle && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-72 transform' : 'relative w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out
          bg-white border-r border-gray-200 flex flex-col shadow-xl
          h-screen
        `}
      >
        <div className="p-4 border-b">
          <div className="flex justify-center">
            <img 
              src="/Mini-Chatgpt.jpg" 
              alt="Chat History Header" 
              className="w-48 h-28 object-cover rounded-lg"
            />
          </div>
        </div>
        <div className="p-4 border-b">
          <button
            onClick={handleNewChat}
            disabled={createChatMutation.isPending || isEditingTitle}
            className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 ${
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
  <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 md:left-64">
    <div className="h-full flex items-center justify-center px-4">
      <div className="relative w-full max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-800 text-center line-clamp-2 px-12 md:px-4 leading-tight">
          {currentChat?.title || 'Mini ChatGPT'}
        </h1>
        {isMobile && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
            <img 
              src="/Mini-Chatgpt.jpg" 
              alt="Mini-ChatGPT"
              className="w-13 h-10 squared-full object-cover "
            />
          </div>
        )}
      </div>
    </div>
  </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden pt-14 pb-20">
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
        </div>

        {/* Fixed Message Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 md:left-64">
          <MessageInput
            chatId={chatId}
            onSend={handleMessageSend}
            onFirstMessage={handleFirstMessage}
            disabled={
              chatId ? 
              (isLoading || isRegenerating || editingMessageId || editAndRegenerateMutation.isPending) 
              : false
            }
            isCreatingNewChat={isCreatingNewChat}
          />
        </div>

        {/* Loading Indicator */}
        {(isLoading || createChatMutation.isPending || isRegenerating || editAndRegenerateMutation.isPending) && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
            <LoadingIndicator />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;