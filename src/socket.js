export default function socket(socketIo) {
    socketIo.on('connection', (socket) => {
        console.log(`${socket.id} 님이 대화방에 참여 하였습니다.`);

        socket.on('disconnect', (reason) => {
            console.log(`${socket.id}님의 연결이 해제됐습니다. ${reason}`);
        });

        // Message 추가
        socket.on('messageS', (message) => {
            console.log('message가 도착했습니다.');
            console.log(message);

            if (message.recepient === 'ALL') {
                socketIo.sockets.emit('messageC', message);
            }
        });

        socket.on('move', (positions) => {
            console.log(positions);
            socketIo.sockets.emit('moveC', positions);
        });

        socket.on('join', (roomId) => {
            let rooms = socketIo.sockets.adapter.rooms;
            console.log(rooms);

            let room = rooms.get(roomId);
            console.log(room);
            if (room === undefined) {
                socket.join(roomId);
                socket.emit('Room created');
            } else if (room.size == 1) {
                socket.join(roomId);
                socket.emit('Room joined');
            } else {
                socket.emit('Room full');
            }
            console.log(rooms);
        });

        socket.on('ready', (roomId) => {
            console.log('Ready');
            socket.broadcast.to(roomId).emit('ready');
        });

        socket.on('candidate', (candidate, roomId) => {
            console.log('Candidate');
            console.log(candidate);
            socket.broadcast.to(roomId).emit('candidate', candidate);
        });

        socket.on('offer', (offer, roomId) => {
            console.log('Offer');
            console.log(offer);
            socket.broadcast.to(roomId).emit('offer', offer);
        });

        socket.on('answer', (answer, roomId) => {
            console.log('Answer');
            socket.broadcast.to(roomId).emit('answer', answer);
        });
    });
}
