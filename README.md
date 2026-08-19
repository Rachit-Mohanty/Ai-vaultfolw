# VaultFlow

**VaultFlow** is an AI-powered personal knowledge vault that helps users store, organize, manage, and interact with their knowledge using **locally running AI models through Ollama**.

The goal of VaultFlow is to provide an intelligent knowledge system while keeping AI processing local through Ollama.

## ✨ Features

- 🔐 User authentication
- 📄 Document management
- 📝 Notes management
- 🤖 Local AI integration with Ollama
- 🔎 Knowledge and document search
- 📚 Personal knowledge organization
- 🛡️ Authentication middleware
- 🗄️ MongoDB database integration
- 🧠 AI-powered knowledge processing

## 🧠 AI with Ollama

VaultFlow uses **Ollama** to run AI models locally.

This allows VaultFlow to communicate with locally hosted language models instead of requiring every AI request to be sent to a cloud AI provider.

### Ollama

Install Ollama from the official website:

[Ollama](https://ollama.com/?utm_source=chatgpt.com)

After installing Ollama, download the model you want to use.

For example:

```bash
ollama pull llama3.2
```

Start Ollama:

```bash
ollama serve
```

The Ollama API is normally available locally at:

```text
http://localhost:11434
```

> The exact model used by VaultFlow depends on your local configuration.

## 🏗️ Project Structure

```text
Ai-vaultfolw/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   │
│   │   ├── models/
│   │   │   ├── Document.js
│   │   │   ├── Note.js
│   │   │   └── User.js
│   │   │
│   │   ├── routes/
│   │   │   ├── aiRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── documentRoutes.js
│   │   │   ├── noteRoutes.js
│   │   │   └── userRoutes.js
│   │   │
│   │   ├── services/
│   │   │   └── documentText.js
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   └── signup.html
│
└── .gitignore
```

## 🛠️ Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Ollama

### Frontend

- HTML
- CSS
- JavaScript

### AI

- Ollama
- Locally hosted LLMs

## 🚀 Getting Started

### Prerequisites

Before running VaultFlow, make sure you have:

- Node.js installed
- MongoDB available locally or remotely
- Ollama installed
- An Ollama model downloaded

### 1. Clone the repository

```bash
git clone https://github.com/Rachit-Mohanty/Ai-vaultfolw.git
cd Ai-vaultfolw
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install and configure Ollama

Install Ollama from:

[Ollama official website](https://ollama.com/?utm_source=chatgpt.com)

Then download a model, for example:

```bash
ollama pull llama3.2
```

Start the Ollama server:

```bash
ollama serve
```

### 4. Configure environment variables

Create a `.env` file inside the `backend` directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Use the variable names expected by the actual VaultFlow backend configuration.

**Never commit your `.env` file to GitHub.**

### 5. Start the backend

From the `backend` directory:

```bash
npm start
```

Or, if the project includes a development script:

```bash
npm run dev
```

### 6. Start the frontend

Open the frontend using your preferred local development server.

The frontend communicates with the VaultFlow backend API.

## 🔐 Security

VaultFlow is designed to keep sensitive configuration outside the source code.

Never commit:

- `.env`
- Database credentials
- JWT secrets
- API keys
- Passwords
- Private credentials

These values should be stored in environment variables.

## 🧠 Local AI Architecture

The basic AI flow is:

```text
User
  │
  ▼
VaultFlow Frontend
  │
  ▼
VaultFlow Backend
  │
  ▼
AI Routes / Services
  │
  ▼
Ollama
  │
  ▼
Local LLM
  │
  ▼
AI Response
```

Because Ollama runs locally, the AI model can run on the user's own machine rather than requiring a cloud AI API.

## 📌 Backend Routes

VaultFlow currently contains backend routes for:

| Route | Purpose |
|---|---|
| Authentication | Registration and login |
| Users | User-related operations |
| Documents | Document management |
| Notes | Note management |
| AI | AI-powered functionality |

## 🧪 Development

After making changes:

```bash
git add .
git commit -m "Describe your changes"
git push
```

Example:

```bash
git add .
git commit -m "Improve Ollama integration"
git push
```

## 🔮 Future Improvements

Possible future improvements include:

- Semantic/vector search
- Document embeddings
- AI-powered document summaries
- Retrieval-Augmented Generation (RAG)
- Multiple Ollama model support
- PDF and document ingestion
- Knowledge graph integration
- Improved dashboard
- Advanced search and filtering
- Conversation history
- Cloud deployment options

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Commit your changes.
5. Push your branch.
6. Open a pull request.

## 📄 License

This project currently does not specify a license.

---

**VaultFlow — Your knowledge, organized and powered by local AI.**
