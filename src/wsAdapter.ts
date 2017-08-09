export interface IWs {

    init(io: SocketIO.Server): void;

    newSocket(socket: SocketIO.Socket, tokenResolved?: any): void;

    /**
     *
     * @return {string} the name of room
     */
    onSetRoomName(): string;

    onSetEventName(): string;

    onCall(msg: any): void;
}
