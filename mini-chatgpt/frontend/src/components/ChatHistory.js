import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Search, Edit2, MessageSquare, Clock, Mail, Shield, LogOut, ChevronDown, ChevronUp, CheckCircle, XCircle, Server } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://mini-chatgpt-assignment.onrender.com/api";

const ChatHistory = ({ chats = [], currentChatId, onSelectChat, isLoading, error, onCloseSidebar }) => {
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

        // Uncomment below for actual API calls:
        /*
        // Fetch IP address
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          setUserInfo(prev => ({
            ...prev,
            ipAddress: ipData.ip,
          }));
        } catch (ipError) {
          console.error('Failed to fetch IP:', ipError);
          setUserInfo(prev => ({
            ...prev,
            ipAddress: 'Not available',
          }));
        }

        // Fetch user details from backend
        try {
          const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserInfo(prev => ({
              ...prev,
              username: userData.username || userData.name || 'User',
              email: userData.email || '',
              lastLogin: userData.lastLogin || new Date().toISOString(),
              role: userData.role || 'User',
            }));
          }
        } catch (userError) {
          console.log('No user session or backend endpoint');
        }
        */

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
    
    // Check health every 30 seconds
    const intervalId = setInterval(checkBackendHealth, 30000);
    
    return () => clearInterval(intervalId);
  }, []);



  // Manually check backend health
  const handleCheckHealth = async () => {
    try {
      setIsCheckingHealth(true);
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        setBackendHealth({
          status: 'healthy',
          message: data.message || 'Backend is running',
          timestamp: new Date().toISOString(),
          responseTime
        });
        
        
      } else {
        setBackendHealth({
          status: 'unhealthy',
          message: 'Backend returned error',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
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
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Clear React Query cache
        queryClient.clear();
        
        // Redirect to login page
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

  const handleTitleEdit = (chat) => {
    setEditingChatId(chat._id);
    setEditingTitle(chat.title || 'Untitled Chat');
  };
  
  const handleTitleSave = (chatId) => {
    if (editingTitle.trim() && chatId) {
      updateTitleMutation.mutate({ chatId, title: editingTitle.trim() });
    } else {
      setEditingChatId(null);
    }
  };

  const handleTitleCancel = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      deleteChatMutation.mutate(chatId);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get random color for avatar based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-rose-500'
    ];
    if (!name) return colors[0];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Get health status color and icon
  const getHealthStatus = () => {
    if (!backendHealth) return { color: 'text-gray-500', bgColor: 'bg-gray-100', icon: <Server className="w-4 h-4" /> };
    
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
          icon: <Server className="w-4 h-4" />,
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
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 rounded-lg p-4 mb-3">
          <p className="text-red-600 text-sm font-medium mb-1">Failed to load chats</p>
          <p className="text-red-500 text-xs">{error.message || 'Please try again later'}</p>
        </div>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['chats'] })}
          className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Search Bar - Only show if there are chats */}
      {chats.length > 0 && (
        <div className="p-4 border-b border-gray-100">
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
      
      {/* Chat List or Empty State */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            {searchTerm ? (
              <>
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-2">No matching chats found</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-500 text-sm hover:text-blue-600"
                >
                  Clear search
                </button>
              </>
            ) : chats.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No chats yet</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Start your first conversation by clicking "New Chat"
                </p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Chats will appear here</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Select one to continue</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => onSelectChat(chat._id)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 group ${
                  currentChatId === chat._id 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : 'border-l-4 border-transparent'
                } ${deleteChatMutation.isLoading && deleteChatMutation.variables === chat._id ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {currentChatId === chat._id ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      ) : (
                        <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                      {editingChatId === chat._id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleTitleSave(chat._id);
                              if (e.key === 'Escape') handleTitleCancel();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTitleSave(chat._id);
                            }}
                            className="p-1 text-green-600 hover:text-green-700"
                            disabled={updateTitleMutation.isLoading}
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTitleCancel();
                            }}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chat.title || 'Untitled Chat'}
                        </h3>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatChatDate(chat.updatedAt || chat.createdAt)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {chat.messagesCount || 0} messages
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTitleEdit(chat);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit title"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(chat._id, e)}
                      disabled={deleteChatMutation.isLoading}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Stats - Only show if there are chats */}
      {chats.length > 0 && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex justify-between text-xs text-gray-500 mb-3">
            <span className="font-medium">{chats.length} chat{chats.length !== 1 ? 's' : ''}</span>
            <span>
              {chats.reduce((sum, chat) => sum + (chat.messagesCount || 0), 0)} total messages
            </span>
          </div>
        </div>
      )}
      
      {/* User Info Section - Fixed at the bottom */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4 mt-auto">
        <div 
          className="cursor-pointer hover:bg-gray-100 rounded-lg transition-colors p-3 -m-3"
          onClick={() => setShowUserDetails(!showUserDetails)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(userInfo.username)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-semibold text-sm">
                  {getUserInitials(userInfo.username)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {userInfo.username}
                </h3>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {userInfo.email}
                </p>
              </div>
            </div>
            <div className="text-gray-400">
              {showUserDetails ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </div>
        </div>

        {/* Expanded User Details */}
        {showUserDetails && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {/* Backend Health Check */}
            <button
              onClick={handleCheckHealth}
              disabled={isCheckingHealth}
              className={`w-full flex items-center justify-between gap-2 text-sm py-2.5 px-4 rounded-lg border transition-colors ${getHealthStatus().bgColor} ${getHealthStatus().color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-2">
                {isCheckingHealth ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  getHealthStatus().icon
                )}
                <span className="font-medium">Backend Health</span>
              </div>
              
            </button>

            {/* Role Badge */}
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">Role</span>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {userInfo.role}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-4 rounded-lg border border-red-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {/* Always visible buttons when details are collapsed */}
        {!showUserDetails && (
          <div className="space-y-2 mt-2">
            
              
                <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-4 rounded-lg border border-red-200 transition-colors"
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