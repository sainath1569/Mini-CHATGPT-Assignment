const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Chat, Message } = require('./db');

// Rate limiters
const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    error: 'Too many messages sent. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const chatLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    error: 'Too many new chats created. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// OpenAI utility
const OpenAI = require('openai');
let openai;
const mockResponses = [
  "I understand you're asking about that topic. Could you provide more details?",
  "That's an interesting question! Let me think about it...",
  "Based on the information provided, here's what I can suggest.",
  "I'd be happy to help with that. Here are some thoughts.",
  "Thanks for asking! Here's my perspective on that matter.",
  "Cool,My knowledge on that is a bit limited, but here's what I know.",
  "I'm not sure about that, but I can help you find more information.",
  "Let's explore that topic together. Here's a starting point.",
  "That's a great question! Here's what I've found.",
  "I appreciate your curiosity! Here's some information that might help."
];

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI initialized');
} else {
  console.log('⚠️  OpenAI API key not found. Using mock responses.');
}

const generateAIResponse = async (userMessage, chatId) => {
  if (!openai) {
    return {
      content: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      tokens: 0
    };
  }
  
  try {
    const history = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(10)
      .sort({ createdAt: 1 });
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Keep responses concise and friendly.'
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: parseInt(process.env.MAX_TOKENS) || 500,
      temperature: parseFloat(process.env.TEMPERATURE) || 0.7
    });
    
    return {
      content: response.choices[0].message.content,
      tokens: response.usage.total_tokens
    };
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    return {
      content: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      tokens: 0
    };
  }
};

// ============ ROUTES ============

// Create new chat
router.post('/chats', chatLimiter, async (req, res, next) => {
  try {
    const { title = 'New Chat' } = req.body;
    
    const chat = await Chat.create({
      title: title.trim() || 'New Chat',
      messagesCount: 0
    });
    
    res.status(201).json(chat);
  } catch (error) {
    next(error);
  }
});

// Get all chats
router.get('/chats', async (req, res, next) => {
  try {
    const chats = await Chat.find()
      .sort({ updatedAt: -1 })
      .select('-__v')
      .limit(50);
    
    res.json(chats);
  } catch (error) {
    next(error);
  }
});

// Get single chat with messages - NO ObjectId validation
router.get('/chats/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    const messages = await Message.find({ chatId: id })
      .sort({ createdAt: 1 })
      .select('-__v');
    
    res.json({
      ...chat.toObject(),
      messages
    });
  } catch (error) {
    next(error);
  }
});

// Update chat title - NO ObjectId validation
router.patch('/chats/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        error: 'Title is required', 
        code: 'EMPTY_TITLE' 
      });
    }
    
    const chat = await Chat.findByIdAndUpdate(
      id,
      { 
        title: title.trim(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    res.json(chat);
  } catch (error) {
    next(error);
  }
});

// Delete chat - NO ObjectId validation
router.delete('/chats/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findByIdAndDelete(id);
    
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    // Delete all messages in this chat
    await Message.deleteMany({ chatId: id });
    
    res.json({ 
      success: true, 
      message: 'Chat deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// Send message to chat - NO ObjectId validation
router.post('/chats/:id/messages', messageLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({ 
        error: 'Message content is required', 
        code: 'EMPTY_MESSAGE' 
      });
    }
    
    if (content.length > 4096) {
      return res.status(400).json({ 
        error: 'Message too long (max 4096 characters)', 
        code: 'MESSAGE_TOO_LONG' 
      });
    }
    
    const chat = await Chat.findById(id);
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    // Save user message
    const userMessage = await Message.create({
      chatId: id,
      role: 'user',
      content: content.trim()
    });
    
    // Update chat
    chat.updatedAt = new Date();
    chat.messagesCount += 1;
    await chat.save();
    
    // If this is the first message, update chat title
    if (chat.messagesCount === 1) {
      chat.title = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await chat.save();
    }
    
    // Generate AI response
    try {
      const aiResponse = await generateAIResponse(content.trim(), id);
      
      const assistantMessage = await Message.create({
        chatId: id,
        role: 'assistant',
        content: aiResponse.content,
        tokens: aiResponse.tokens
      });
      
      // Update messages count again
      chat.messagesCount += 1;
      chat.updatedAt = new Date();
      await chat.save();
      
      res.json({
        userMessage: userMessage.toObject(),
        assistantMessage: assistantMessage.toObject(),
        chat: chat.toObject()
      });
      
    } catch (aiError) {
      console.error('AI Response Error:', aiError);
      
      // Save error message
      const errorMessage = await Message.create({
        chatId: id,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        error: true
      });
      
      res.json({
        userMessage: userMessage.toObject(),
        assistantMessage: errorMessage.toObject(),
        chat: chat.toObject()
      });
    }
    
  } catch (error) {
    next(error);
  }
});
router.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mini ChatGPT API</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                line-height: 1.6;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                background: white;
                border-radius: 16px;
                padding: 40px;
                margin-bottom: 24px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            
            .logo {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            h1 {
                color: #2d3748;
                font-size: 32px;
                font-weight: 600;
                margin-bottom: 12px;
            }
            
            .description {
                color: #4a5568;
                font-size: 18px;
                margin-bottom: 24px;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .status-badge {
                display: inline-flex;
                align-items: center;
                background: #48bb78;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 32px;
            }
            
            .status-badge::before {
                content: "●";
                margin-right: 8px;
                font-size: 12px;
            }
            
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 32px;
            }
            
            .card {
                background: white;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            }
            
            .card-title {
                font-size: 18px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .endpoint-list {
                list-style: none;
            }
            
            .endpoint-item {
                margin-bottom: 12px;
                padding: 12px;
                background: #f7fafc;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .method {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                margin-right: 10px;
                min-width: 60px;
                text-align: center;
            }
            
            .get { background: #48bb78; color: white; }
            .post { background: #4299e1; color: white; }
            .put { background: #ed8936; color: white; }
            .patch { background: #9f7aea; color: white; }
            .delete { background: #f56565; color: white; }
            
            .endpoint-path {
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 14px;
                color: #2d3748;
            }
            
            .endpoint-desc {
                color: #718096;
                font-size: 14px;
                margin-top: 6px;
                margin-left: 72px;
            }
            
            .feature-list {
                list-style: none;
            }
            
            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                color: #4a5568;
            }
            
            .feature-item::before {
                content: "✓";
                color: #48bb78;
                margin-right: 10px;
                font-weight: bold;
            }
            
            .quickstart {
                background: #fffaf0;
                border-left: 4px solid #ed8936;
            }
            
            .quickstart-step {
                margin-bottom: 10px;
                padding-left: 8px;
            }
            
            .step-number {
                display: inline-block;
                width: 24px;
                height: 24px;
                background: #ed8936;
                color: white;
                border-radius: 50%;
                text-align: center;
                line-height: 24px;
                margin-right: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .info-box {
                background: white;
                border-radius: 12px;
                padding: 24px;
                margin-top: 24px;
                border-top: 4px solid #4299e1;
            }
            
            .info-box h3 {
                color: #2d3748;
                margin-bottom: 16px;
                font-size: 18px;
            }
            
            .note-item {
                padding: 8px 0;
                color: #4a5568;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .note-item:last-child {
                border-bottom: none;
            }
            
            .footer {
                text-align: center;
                margin-top: 40px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
            }
            
            .footer a {
                color: white;
                text-decoration: none;
                font-weight: 500;
            }
            
            .footer a:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 768px) {
                .grid {
                    grid-template-columns: 1fr;
                }
                
                .header {
                    padding: 24px;
                }
                
                h1 {
                    font-size: 24px;
                }
                
                .description {
                    font-size: 16px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖</div>
                <h1>Mini ChatGPT API</h1>
                <p class="description">A lightweight ChatGPT-like API service with conversation management</p>
                <div class="status-badge">Version 1.0.0 • Service Online</div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3 class="card-title">📊 Chat Management</h3>
                    <ul class="endpoint-list">
                        <li class="endpoint-item">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/chats</span>
                            <div class="endpoint-desc">Create new chat (50/hr limit)</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/chats</span>
                            <div class="endpoint-desc">Get all chats (50 most recent)</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/chats/:id</span>
                            <div class="endpoint-desc">Get specific chat with messages</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method patch">PATCH</span>
                            <span class="endpoint-path">/chats/:id</span>
                            <div class="endpoint-desc">Update chat title</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method delete">DELETE</span>
                            <span class="endpoint-path">/chats/:id</span>
                            <div class="endpoint-desc">Delete chat and all messages</div>
                        </li>
                    </ul>
                </div>
                
                <div class="card">
                    <h3 class="card-title">💬 Message Operations</h3>
                    <ul class="endpoint-list">
                        <li class="endpoint-item">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/chats/:id/messages</span>
                            <div class="endpoint-desc">Get all messages for a chat</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/chats/:id/messages</span>
                            <div class="endpoint-desc">Send message (50/10min limit)</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/chats/:id/regenerate</span>
                            <div class="endpoint-desc">Regenerate last assistant response</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method put">PUT</span>
                            <span class="endpoint-path">/chats/:chatId/messages/:messageId/regenerate</span>
                            <div class="endpoint-desc">Edit message & regenerate</div>
                        </li>
                    </ul>
                </div>
                
                <div class="card">
                    <h3 class="card-title">✨ Features</h3>
                    <ul class="feature-list">
                        <li class="feature-item">Chat creation and management</li>
                        <li class="feature-item">AI-powered responses (OpenAI or mock)</li>
                        <li class="feature-item">Message regeneration</li>
                        <li class="feature-item">Message editing with regeneration</li>
                        <li class="feature-item">Rate limiting for spam protection</li>
                        <li class="feature-item">Chat statistics</li>
                    </ul>
                </div>
            </div>
            
            <div class="grid">
                <div class="card quickstart">
                    <h3 class="card-title">🚀 Quick Start Guide</h3>
                    <div class="quickstart-step">
                        <span class="step-number">1</span>
                        <strong>POST /chats</strong> - Create a new chat
                    </div>
                    <div class="quickstart-step">
                        <span class="step-number">2</span>
                        <strong>POST /chats/:chatId/messages</strong> - Send your first message
                    </div>
                    <div class="quickstart-step">
                        <span class="step-number">3</span>
                        <strong>GET /chats/:chatId</strong> - Get the conversation
                    </div>
                    <div class="quickstart-step">
                        <span class="step-number">4</span>
                        <strong>POST /chats/:chatId/regenerate</strong> - Regenerate if needed
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="card-title">📈 System Endpoints</h3>
                    <ul class="endpoint-list">
                        <li class="endpoint-item">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/stats</span>
                            <div class="endpoint-desc">Get API statistics</div>
                        </li>
                        <li class="endpoint-item">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/health</span>
                            <div class="endpoint-desc">Health check endpoint</div>
                        </li>
                    </ul>
                </div>
            </div>
            
            <div class="info-box">
                <h3>📝 Important Notes</h3>
                <div class="note-item">• All :id parameters are MongoDB ObjectId strings</div>
                <div class="note-item">• POST endpoints require JSON body with appropriate fields</div>
                <div class="note-item">• If OpenAI API key is not configured, mock responses will be used</div>
                <div class="note-item">• Messages are limited to 4096 characters</div>
                <div class="note-item">• Rate limits: 50 new chats/hour, 50 messages/10min</div>
            </div>
            
            <div class="footer">
                <p>Timestamp: ${new Date().toLocaleString()} • For support, check the API documentation</p>
                <p>Base URL: /api • All endpoints return JSON format</p>
            </div>
        </div>
        
        <script>
            // Add subtle animations
            document.addEventListener('DOMContentLoaded', function() {
                const cards = document.querySelectorAll('.card');
                cards.forEach((card, index) => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.5s, transform 0.5s';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            });
            
            // Highlight current endpoint if accessed with query param
            const urlParams = new URLSearchParams(window.location.search);
            const endpoint = urlParams.get('endpoint');
            if (endpoint) {
                setTimeout(() => {
                    const endpointItems = document.querySelectorAll('.endpoint-item');
                    endpointItems.forEach(item => {
                        if (item.textContent.includes(endpoint)) {
                            item.style.background = '#ebf8ff';
                            item.style.borderLeftColor = '#4299e1';
                            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }, 500);
            }
        </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Get messages for a chat - NO ObjectId validation
router.get('/chats/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const messages = await Message.find({ chatId: id })
      .sort({ createdAt: 1 })
      .select('-__v');
    
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Get stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalChats, totalMessages] = await Promise.all([
      Chat.countDocuments(),
      Message.countDocuments()
    ]);
    
    res.json({
      totalChats,
      totalMessages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Regenerate last assistant message
router.post('/chats/:id/regenerate', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the chat
    const chat = await Chat.findById(id);
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    // Get the last two messages (user + assistant)
    const lastMessages = await Message.find({ chatId: id })
      .sort({ createdAt: -1 })
      .limit(2);
    
    if (lastMessages.length < 2) {
      return res.status(400).json({ 
        error: 'Cannot regenerate - need at least one user message and one assistant response',
        code: 'NO_PAIR_TO_REGENERATE'
      });
    }
    
    // Last message should be from assistant, previous from user
    const lastAssistantMsg = lastMessages[0];
    const lastUserMsg = lastMessages[1];
    
    if (lastAssistantMsg.role !== 'assistant' || lastUserMsg.role !== 'user') {
      return res.status(400).json({ 
        error: 'Cannot regenerate - last pair must be user message followed by assistant response',
        code: 'INVALID_MESSAGE_PAIR'
      });
    }
    
    // Delete the last assistant message
    await Message.findByIdAndDelete(lastAssistantMsg._id);
    
    // Update chat message count
    chat.messagesCount = Math.max(0, chat.messagesCount - 1);
    chat.updatedAt = new Date();
    await chat.save();
    
    // Generate new AI response using the same user message
    try {
      const aiResponse = await generateAIResponse(lastUserMsg.content, id);
      
      const newAssistantMessage = await Message.create({
        chatId: id,
        role: 'assistant',
        content: aiResponse.content,
        tokens: aiResponse.tokens
      });
      
      // Update messages count again
      chat.messagesCount += 1;
      chat.updatedAt = new Date();
      await chat.save();
      
      res.json({
        success: true,
        newMessage: newAssistantMessage.toObject()
      });
      
    } catch (aiError) {
      console.error('AI Response Error during regeneration:', aiError);
      
      // Create error message
      const errorMessage = await Message.create({
        chatId: id,
        role: 'assistant',
        content: 'Sorry, I encountered an error while regenerating the response. Please try again.',
        error: true
      });
      
      res.json({
        success: false,
        newMessage: errorMessage.toObject()
      });
    }
    
  } catch (error) {
    next(error);
  }
});

// Edit user message AND regenerate assistant response
router.put('/chats/:chatId/messages/:messageId/regenerate', async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    
    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({ 
        error: 'Message content is required', 
        code: 'EMPTY_MESSAGE' 
      });
    }
    
    if (content.length > 4096) {
      return res.status(400).json({ 
        error: 'Message too long (max 4096 characters)', 
        code: 'MESSAGE_TOO_LONG' 
      });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found', 
        code: 'CHAT_NOT_FOUND' 
      });
    }
    
    // Find and update the user message
    const userMessage = await Message.findOneAndUpdate(
      { _id: messageId, chatId: chatId, role: 'user' },
      { 
        content: content.trim(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!userMessage) {
      return res.status(404).json({ 
        error: 'User message not found', 
        code: 'MESSAGE_NOT_FOUND' 
      });
    }
    
    // Find the next assistant message (if exists) and delete it
    const assistantMessage = await Message.findOne({
      chatId: chatId,
      role: 'assistant',
      createdAt: { $gt: userMessage.createdAt }
    }).sort({ createdAt: 1 });
    
    let deletedAssistant = null;
    if (assistantMessage) {
      deletedAssistant = await Message.findByIdAndDelete(assistantMessage._id);
      if (deletedAssistant) {
        chat.messagesCount = Math.max(0, chat.messagesCount - 1);
      }
    }
    
    // Update chat timestamp
    chat.updatedAt = new Date();
    await chat.save();
    
    // Generate new AI response with the edited content
    try {
      const aiResponse = await generateAIResponse(content.trim(), chatId);
      
      const newAssistantMessage = await Message.create({
        chatId: chatId,
        role: 'assistant',
        content: aiResponse.content,
        tokens: aiResponse.tokens
      });
      
      // Update messages count again
      chat.messagesCount += 1;
      chat.updatedAt = new Date();
      await chat.save();
      
      res.json({
        success: true,
        userMessage: userMessage.toObject(),
        assistantMessage: newAssistantMessage.toObject(),
        deletedAssistant: deletedAssistant ? deletedAssistant.toObject() : null
      });
      
    } catch (aiError) {
      console.error('AI Response Error during edit+regenerate:', aiError);
      
      // Save error message
      const errorMessage = await Message.create({
        chatId: chatId,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your edited message. Please try again.',
        error: true
      });
      
      res.json({
        success: false,
        userMessage: userMessage.toObject(),
        assistantMessage: errorMessage.toObject(),
        deletedAssistant: deletedAssistant ? deletedAssistant.toObject() : null
      });
    }
    
  } catch (error) {
    next(error);
  }
});
module.exports = router;