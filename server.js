const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files
app.use(express.static('public'));

// Store connected users
const users = {};

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Register user
    socket.on('register', (userId) => {
        console.log('📝 User registered:', userId);
        users[userId] = socket.id;
        socket.userId = userId;
        socket.emit('registered', { success: true, userId: userId });
        
        console.log('👥 Connected users:', Object.keys(users));
    });

    // Handle call offers
    socket.on('offer', (data) => {
        console.log('📞 Offer from:', socket.userId, 'to:', data.target);
        
        const targetSocketId = users[data.target];
        if (targetSocketId) {
            console.log('✅ Forwarding offer to:', data.target);
            io.to(targetSocketId).emit('offer', {
                offer: data.offer,
                from: socket.userId
            });
        } else {
            console.log('❌ User not found:', data.target);
            socket.emit('user-not-found', { target: data.target });
        }
    });

    // Handle call answers
    socket.on('answer', (data) => {
        console.log('✅ Answer from:', socket.userId, 'to:', data.target);
        
        const targetSocketId = users[data.target];
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer', {
                answer: data.answer,
                from: socket.userId
            });
        }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const targetSocketId = users[data.target];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.userId
            });
        }
    });

    // Handle hangup
    socket.on('hangup', (data) => {
        const targetSocketId = users[data.target];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended');
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        if (socket.userId && users[socket.userId]) {
            delete users[socket.userId];
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});