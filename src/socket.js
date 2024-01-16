export default function socket(socketIo) {
    socketIo.on('connection', (socket) => {
        console.log(`${socket.id} 님이 대화방에 참여 하였습니다.`);

        socket.on('disconnect', (reason) => {
            console.log(`연결이 해제됐습니다. ${reason}`);
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
    });
}
