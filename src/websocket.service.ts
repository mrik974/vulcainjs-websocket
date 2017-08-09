import {AbstractAdapter, IContainer, IDynamicProperty, Inject, System} from 'vulcain-corejs';
import {Injectable, LifeTime} from 'vulcain-corejs/dist';
//
import {WebSocketComponent} from "./websocket.component";
import {TokenService} from "vulcain-corejs/dist/defaults/services/tokenService";
import {IWs} from "./wsAdapter";
import Socket = SocketIO.Socket;

const SocketIo = require('socket.io');

@Injectable(LifeTime.Singleton, 'WebSocketService')
export class WebSocketService {
    private services: IWs[] = [];
    private container: IContainer;

    private io: SocketIO.Server;
    private tokenService: TokenService;
    private acceptUnauthorizedConnexions: IDynamicProperty<boolean>;

    /**
     *
     * @param container
     * @param server The instance of express Server to attach socket.io on it
     * @param services This is a list of websocket service who will be listened
     */
    start(container: IContainer, server: AbstractAdapter, services: Array<string>, tokenService?: TokenService) {
        this.container = container;
        this.io = new SocketIo(server);

        this.tokenService = tokenService;
        this.acceptUnauthorizedConnexions = System.createServiceConfigurationProperty("WEBSOCKET_ACCEPT_UNAUTHORIZED_CONNECTIONS", true);
        // this.container.injectFrom(pathWs);

        this.initializeListener();
    }

    private initializeListener() {
        let ws = new WebSocketComponent(this.container, this.io, this.services);
        this.io.on('connection', async (socket) => {
            // console.log('User connected');
            let tokenResolved: any = await this.getUserToken(socket);
            if (!tokenResolved && !(this.acceptUnauthorizedConnexions.value)) {
                // reject socket
                socket.emit("You are not authorized to connect to this socket");
                socket.disconnect(true);
            }
            ws.newSocketHappen(socket, tokenResolved);
        });
    }

    private initializeServices(services: string[]) {
        services.forEach((serviceName: string) => {
            let service = this.container.get<IWs>(serviceName);
            service.init(this.io);
            this.services.push(service);
        });
    }

    private async getUserToken(socket: Socket): Promise<any> {
        // get tokenservice or return null
        if (!this.tokenService) {
            return null;
        }
        try {
            // get authorization header or return null
            const authorizationHeader = socket.handshake.headers['Authorization'];
            if (!authorizationHeader && (!authorizationHeader.startsWith("Bearer "))) {
                return null;
            }
            let token: string = authorizationHeader.slice(7); // Removing "Bearer "
            // resolve token or return null
            return await this.tokenService.verifyTokenAsync({token: token, tenant: ""});
        }
        catch (error) {
            return null;
        }

    }
}
