import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';

@WebSocketGateway({ cors: true })
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly voiceService: VoiceService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    console.log('Socket connected?', client.connected);

    this.voiceService.initCanopusSession(client.id, (event, data) => {
      client.emit(event, data);
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    console.log('Socket connected?', client.connected);
    this.voiceService.closeSession(client.id);
  }

  @SubscribeMessage('audio-chunk')
  async handleAudioChunk(client: Socket, payload: { chunk: string }) {
    await this.voiceService.sendAudioChunk(client.id, payload.chunk);
  }

  @SubscribeMessage('end-audio')
  async handleAudioEnd(client: Socket) {
    await this.voiceService.endSession(client.id);
  }
}
