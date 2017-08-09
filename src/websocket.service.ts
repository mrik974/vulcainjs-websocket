import {AbstractAdapter, IContainer, IDynamicProperty, Inject, System} from 'vulcain-corejs';
import {Injectable, LifeTime} from 'vulcain-corejs/dist';
//
import {WebSocketComponent} from "./websocket.component";
import {TokenService} from "vulcain-corejs/dist/defaults/services/tokenService";
import {IWs} from "./wsAdapter";
import Socket = SocketIO.Socket;
import {Observable} from "rxjs";

const SocketIo = require('socket.io');

@Injectable(LifeTime.Singleton, 'WebSocketService')
export class WebSocketService {
    private services: IWs[] = [];
    private container: IContainer;

    private io: SocketIO.Server;
    private tokenService: TokenService;
    private acceptUnauthorizedConnections: IDynamicProperty<string>;
    private timeToAuthorizeConnectionInMs: IDynamicProperty<number>;
    private authorizedSockets: any = {};
    private ws: WebSocketComponent;

    /**
     *
     * @param container
     * @param server The instance of express Server to attach socket.io on it
     * @param services This is a list of websocket service who will be listened
     */
    start(container: IContainer, server: AbstractAdapter, services: Array<string>) {
        this.container = container;
        this.io = new SocketIo(server);

        this.tokenService = this.container.get<TokenService>('TokenService');
        this.acceptUnauthorizedConnections = System.createServiceConfigurationProperty("WEBSOCKET_ACCEPT_UNAUTHORIZED_CONNECTIONS", "true");
        this.timeToAuthorizeConnectionInMs = System.createServiceConfigurationProperty("WEBSOCKET_TIME_TO_AUTHORIZE_CONNECTIONS", 1);
        // this.container.injectFrom(pathWs);
        this.ws = new WebSocketComponent(this.container, this.io, this.services);
        this.initializeListener();
    }

    private initializeListener() {

        this.io.on('connection', async (socket) => {
            // 1) Instantiate a listener for token
            socket.on('message', async (message) => {
                if (message.startsWith('Bearer ')) {
                    await this.getUserToken(socket, message.slice(7));
                }
            });
            // 2) start timer
            Observable.timer(this.timeToAuthorizeConnectionInMs.value).subscribe(() => {
                this.checkAndInitializeSocket(socket);
            });
            // 3) and tell socket
            socket.emit(`welcome. your socket id is ${socket.id}`);
            socket.emit(`You have ${this.timeToAuthorizeConnectionInMs.value} ms to send your token`);
            if ((this.acceptUnauthorizedConnections.value === "false")) {
                socket.emit(`socket will close if token not sent or invalid`);
            }
            else {
                socket.emit(`socket will be active in ${this.timeToAuthorizeConnectionInMs.value} ms but your token won't be taken into account`);
            }
        });
    }

    private checkAndInitializeSocket(socket: Socket) {
        if (this.authorizedSockets[socket.id]) {
            this.ws.newSocketHappen(socket, this.authorizedSockets[socket.id]);

        }
        else if (this.acceptUnauthorizedConnections.value === "true") {
            this.ws.newSocketHappen(socket);
        }
        else {
            socket.emit('Time has expired, socket will close.');
            socket.disconnect(true);
        }
        // whatever happens, remove socket id from list, we don't need to keep it for long
        this.authorizedSockets[socket.id] = null;
    }

    private initializeServices(services: string[]) {
        services.forEach((serviceName: string) => {
            let service = this.container.get<IWs>(serviceName);
            service.init(this.io);
            this.services.push(service);
        });
    }

    private async getUserToken(socket: Socket, message: string) {
        // get tokenservice or return null
        if (!this.tokenService) {
            return;
        }
        try {
            // resolve token or return null
            let user: any = await this.tokenService.verifyTokenAsync({token: message, tenant: ""});
            this.authorizedSockets[socket.id] = user;
        }
        catch (error) {
            return;
        }
    }
}
