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
    const callbacks = {onTranscription: (result) => {
            if (result?.data?.transcript) {
              client.emit('transcription', result.data.transcript);
            } else {
              console.dir(result, { depth: null })
            }
          },
          onSessionStarted: (sessionData) => {
            console.log(`STT session started for client ${client.id}:`, sessionData);
            client.emit('sttSessionStarted', sessionData);
          },
          onSessionEnded: (sessionData) => {
            console.log(`STT session ended for client ${client.id}:`, sessionData);
            client.emit('sttSessionEnded', sessionData);
          },
          onAudioReceived: (audioData) => {
            // Optional: Acknowledge audio chunk received
            client.emit('audioAck', audioData);
          },
          onError: (error) => {
            console.error(`STT Error for client ${client.id}:`, error);
            
            // Handle InsufficientCreditsError specifically
            if (error.constructor?.name === 'InsufficientCreditsError' || 
                error.message?.includes('Insufficient credits') ||
                error.type === 'INSUFFICIENT_CREDITS') {
              client.emit('sttError', {
                message: 'Service unavailable - Insufficient credits. Please contact hospital team.',
                details: 'Insufficient credits',
                type: 'INSUFFICIENT_CREDITS'
              });
            } else {
              client.emit('sttError', error);
            }
          },
          onConnect: () => {
            console.log(`Canopus WebSocket connected for client: ${client.id}`);
            client.emit('canopusConnected');
          },
          onDisconnect: () => {
            console.log(`Canopus WebSocket disconnected for client: ${client.id}`);
            client.emit('canopusDisconnected');
          }}

    this.voiceService.initCanopusSession(client.id, (event, data) => {
      client.emit(event, data);
    },callbacks);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Only close session if it hasn’t ended
    this.voiceService.closeSession(client.id);
  }

  @SubscribeMessage('audio-chunk')
  async handleAudioChunk(client: Socket, payload: any) {
    await this.voiceService.sendAudioChunk(client.id, payload);
  }

  @SubscribeMessage('end-audio')
  async handleAudioEnd(client: Socket) {
    await this.voiceService.endSession(client.id);
  }
}
