import {IContainer} from 'vulcain-corejs';
import {IWs} from './wsAdapter';

export class WebSocketComponent {


    /**
     *
     * @param container
     * @param io
     * @param services This is a list of websocket service who will be listened
     */
    constructor(private container: IContainer, private io: SocketIO.Server, private services: Array<IWs>) {
        this.initialize();
    }

    /**
     *
     * @param socket
     */
    newSocketHappen(socket: SocketIO.Socket, tokenResolved: any) {
        // Loop on all service to attach the new socket
        this.services.forEach((service: IWs) => {
            service.newSocket(socket, tokenResolved);
            socket.on(service.onSetEventName(), (msg) => {
                service.onCall(msg);
            });
        });
    }

    private initialize() {

    }


    private initAllRooms() {

    }
}
