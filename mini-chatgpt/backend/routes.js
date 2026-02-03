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