const express = require("express");
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST']
    }
})

app.get('/', (req, res)=>{
    res.send('server is running');
});


// Setup Socket Connection
// Done with the server
io.on('connection', socket=>{
    socket.on('join-room', ({roomId, userId, metadata})=>{
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { userId, metadata});



        socket.on('disconnect', ()=> {
            socket.to(roomId).emit('user-disconnected', userId);
        });

    });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=> console.log(`Server running on  port ${PORT}`));