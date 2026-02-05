# Mini ChatGPT

A lightweight ChatGPT-like web application with real-time messaging and AI-powered responses.

## 🚀 Live Demo
- **Frontend**: https://mini-chatgpt-assignment.vercel.app
- **Backend**: https://mini-chatgpt-assignment.onrender.com

## ✨ Features
- 💬 Real-time chat with AI responses
- 📁 Chat history with search
- 🔄 Regenerate & edit messages
- 📱 Responsive mobile/desktop UI
- ⚡ Fast loading with React Query
- 🛡️ Rate limiting & error handling

## 🛠️ Tech Stack
**Frontend**: React, React Query, Tailwind CSS  
**Backend**: Express.js, MongoDB  
**AI**: OpenAI GPT-3.5 (with mock fallback)

## ⚙️ Quick Setup

### 1. Clone the repository
```bash
git clone https://github.com/sainath1569/Mini-CHATGPT-Assignment
```
## 2. Backend Setup
```bash
- cd mini-chatgpt/backend/
- npm install
```
Create .env file:
```bash
MONGODB_URI=your_mongodb_connection
OPENAI_API_KEY=your_openai_key  # Optional
PORT=5000
```


## 3.Frontend Setup
```bash
cd mini-chatgpt/frontend/
npm install
```
## 4.Run Application
```bash
# Terminal 1 - Backend
node server.js
# Server will run on port number 5000

# Terminal 2 - Frontend
npm start
# Visit http://localhost:3000
```

# 📞 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/chats` | List all chats |
| POST | `/api/chats` | Create new chat |
| GET | `/api/chats/:id` | Get chat with messages |
| PATCH | `/api/chats/:id` | Update chat title |
| DELETE | `/api/chats/:id` | Delete chat |
| GET | `/api/chats/:id/messages` | Get chat messages |
| POST | `/api/chats/:id/messages` | Send message |
| POST | `/api/chats/:id/regenerate` | Regenerate last response |
| PUT | `/api/chats/:chatId/messages/:messageId/regenerate` | Edit & regenerate |


### Backend Health Check
```http
https://mini-chatgpt-assignment.onrender.com/api/health
```
## 🚀 Deployment
- Backend: Deployed to Render with your .env variables
- Frontend: Deployed to Vercel
- Database: Use MongoDB Atlas for cloud database
  
## ⚠️ Limitations
- No streaming responses (complete messages only)
- Basic markdown support
- In-memory rate limiting
- No user authentication (single-user design)

## 🎯 Notes

### AI Responses
- **Mock fallback** - Works without OpenAI key using realistic mock responses
- **Seamless switching** - Automatic fallback if OpenAI API fails

### Mobile Experience
- **Collapsible sidebar** - Optimized for mobile screens
- **Touch-friendly** - All buttons sized for easy touch interaction
- **Responsive layout** - Works perfectly on all device sizes

### User Features
- **Copy messages** - One-click copy with visual feedback
- **Edit & regenerate** - Edit any message and get new AI response
- **Search chats** - Quick search through conversation history
- **Message actions** - Copy, edit, regenerate buttons on hover

### System Monitoring
- **Health checks** - `/api/health` endpoint monitors backend status
- **Connection status** - Visual indicator shows backend connectivity
- **Error tracking** - Comprehensive error logging

### Performance
- **Optimistic UI** - Immediate feedback while waiting for responses
- **Auto-scroll** - Messages scroll to bottom with manual override
- **Caching** - React Query for efficient data management
- **Rate limiting** - Protection against API abuse

### User Interface
- **Dark theme** - Easy-on-eyes interface
- **Clear messaging** - Distinct user vs AI message styling
- **Loading states** - Smooth animations during operations
- **Helpful prompts** - Guidance for new users

### Development
- **Easy setup** - Simple environment configuration
- **Error handling** - Consistent error responses
- **Input validation** - Client and server validation
- **Clean code** - Well-structured, reusable components
