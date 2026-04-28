import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {
    // Register self with service after construction
  }

  afterInit() {
    this.notificationsService.setGateway(this);
  }

  handleConnection(client: Socket) {
    try {
      // Try JWT cookie from handshake headers
      const cookieHeader = client.handshake.headers.cookie ?? '';
      const match = cookieHeader.match(/access_token=([^;]+)/);
      const token = match?.[1] ?? (client.handshake.query['token'] as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<IJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const staffId = payload.staffId;
      void client.join(staffId);
      this.logger.log(`Client connected: staffId=${staffId}`);
    } catch {
      client.disconnect();
    }
  }

  sendToStaff(staffId: string, notification: unknown) {
    this.server.to(staffId).emit('notification', notification);
  }
}
