import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Search, Edit2, MessageSquare, Clock, Mail, Shield, LogOut, ChevronDown, ChevronUp, CheckCircle, XCircle, Server, Check, X, Save, XSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://mini-chatgpt-assignment.onrender.com/api";

const ChatHistory = ({ 
  chats = [], 
  currentChatId, 
  onSelectChat, 
  onTitleEditStatus, // NEW prop to notify parent
  isLoading, 
  error 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [userInfo, setUserInfo] = useState({
    username: 'John Doe',
    email: 'abc@gmail.com',
    ipAddress: '192.168.1.100',
    lastLogin: new Date().toISOString(),
    role: 'Premium User',
  });
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const queryClient = useQueryClient();

  // Notify parent when editing starts/stops
  useEffect(() => {
    if (onTitleEditStatus) {
      onTitleEditStatus(!!editingChatId);
    }
  }, [editingChatId, onTitleEditStatus]);

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Mock data for demonstration - replace with actual API calls
        setUserInfo({
          username: 'John Doe',
          email: 'abc@gmail.com',
          ipAddress: '192.168.1.100',
          lastLogin: new Date().toISOString(),
          role: 'Premium User',
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  // Check backend health on component mount and periodically
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        setIsCheckingHealth(true);
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBackendHealth({
            status: 'healthy',
            message: data.message || 'Backend is running',
            timestamp: new Date().toISOString(),
            responseTime: Date.now()
          });
        } else {
          setBackendHealth({
            status: 'unhealthy',
            message: 'Backend is not responding properly',
            timestamp: new Date().toISOString(),
            responseTime: Date.now()
          });
        }
      } catch (error) {
        setBackendHealth({
          status: 'error',
          message: 'Cannot connect to backend',
          timestamp: new Date().toISOString(),
          responseTime: Date.now()
        });
      } finally {
        setIsCheckingHealth(false);
      }
    };

    checkBackendHealth();
    const intervalId = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Update chat title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ chatId, title }) => {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update chat title");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setEditingChatId(null);
    },
    onError: (error) => {
      console.error('Failed to update chat title:', error);
      alert('Failed to update title. Please try again.');
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId) => {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete chat");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error) => {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat. Please try again.');
    },
  });

  // Logout function
  const handleLogout = async () => {
    try {
      if (window.confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        queryClient.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    return chats.filter(chat =>
      chat.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chats, searchTerm]);

  const formatChatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'HH:mm');
      } else if (diffInHours < 168) {
        return format(date, 'EEE');
      } else {
        return format(date, 'MMM d');
      }
    } catch {
      return '';
    }
  };

  const handleTitleEdit = (chat, e) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingChatId(chat._id);
    setEditingTitle(chat.title || 'Untitled Chat');
  };

  const handleTitleSave = (chatId, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingTitle.trim() && chatId) {
      updateTitleMutation.mutate({ chatId, title: editingTitle.trim() });
    } else {
      setEditingChatId(null);
    }
  };

  const handleTitleCancel = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      deleteChatMutation.mutate(chatId);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500'
    ];
    if (!name) return colors[0];
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getHealthStatus = () => {
    if (!backendHealth) return {
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      icon: <Server className="w-4 h-4" />,
      text: 'Checking...'
    };

    switch (backendHealth.status) {
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Backend OK'
        };
      case 'unhealthy':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          icon: <XCircle className="w-4 h-4" />,
          text: 'Backend Warning'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: <XCircle className="w-4 h-4" />,
          text: 'Backend Error'
        };
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          icon: <Server className="w-4 h-4" />,
          text: 'Checking...'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-white border-r border-gray-200 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <h3 className="font-semibold text-gray-900 mb-1">Failed to load chats</h3>
          <p className="text-sm text-gray-600 mb-4">{error.message || 'Please try again later'}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['chats'] })}
            className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Search Bar */}
      {chats.length > 0 && (
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {searchTerm ? (
              <>
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium mb-1">No matching chats found</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-500 text-sm hover:text-blue-600"
                >
                  Clear search
                </button>
              </>
            ) : chats.length === 0 ? (
              <>
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium mb-1">No chats yet</p>
                <p className="text-gray-400 text-sm">Start your first conversation by clicking "New Chat"</p>
              </>
            ) : (
              <>
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium mb-1">Chats will appear here</p>
                <p className="text-gray-400 text-sm">Select one to continue</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => {
                  if (editingChatId !== chat._id) {
                    onSelectChat(chat._id);
                  }
                }}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 group ${
                  currentChatId === chat._id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'border-l-4 border-transparent'
                } ${deleteChatMutation.isLoading && deleteChatMutation.variables === chat._id ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {currentChatId === chat._id ? (
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingChatId === chat._id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        {/* Edit input field */}
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTitleSave(chat._id, e);
                            if (e.key === 'Escape') handleTitleCancel(e);
                          }}
                          autoFocus
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* Action buttons - styled as square boxes */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleTitleSave(chat._id, e)}
                            disabled={updateTitleMutation.isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span className="text-sm font-medium">Save</span>
                          </button>
                          <button
                            onClick={handleTitleCancel}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <XSquare className="w-4 h-4" />
                            <span className="text-sm font-medium">Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Chat title and action buttons */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-gray-900 text-sm truncate flex-1">
                            {chat.title || 'Untitled Chat'}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleTitleEdit(chat, e)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit title"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(chat._id, e)}
                              disabled={deleteChatMutation.isLoading}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chat metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatChatDate(chat.updatedAt || chat.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {chat.messagesCount || 0} messages
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {chats.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex-shrink-0">
          <div className="flex justify-between">
            <span>{chats.length} chat{chats.length !== 1 ? 's' : ''}</span>
            <span>{chats.reduce((sum, chat) => sum + (chat.messagesCount || 0), 0)} total messages</span>
          </div>
        </div>
      )}

      {/* User Info Section */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => setShowUserDetails(!showUserDetails)}
          className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className={`w-10 h-10 rounded-full ${getAvatarColor(userInfo.username)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
            {getUserInitials(userInfo.username)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{userInfo.username}</p>
            <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
          </div>
          <div className="flex-shrink-0">
            {showUserDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {showUserDetails && (
          <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
            {/* Backend Health */}
            <div className={`p-3 rounded-lg ${getHealthStatus().bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={getHealthStatus().color}>
                    {isCheckingHealth ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      getHealthStatus().icon
                    )}
                  </div>
                  <span className={`text-sm font-medium ${getHealthStatus().color}`}>
                    Backend Health
                  </span>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Role</span>
              <span className="text-sm font-medium text-gray-900 bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {userInfo.role}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {!showUserDetails && (
          <div className="px-4 pb-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;