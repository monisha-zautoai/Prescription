import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Canopus } from '@zauto/canopus';

interface SessionData {
  canopus: Canopus;
  clientId: string;
  sessionReady: boolean;
  sessionEnded: boolean;
  audioQueue: string[];
}

@Injectable()
export class VoiceService {
  private sessions = new Map<string, SessionData>();
  private apiKey: string;
  private link: string;
  private modelId: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('CANOPUS_API_KEY');
    const link = this.configService.get<string>('CANOPUS_API_URL');
    const modelId = this.configService.get<string>('MODEL_ID');

    if (!apiKey) throw new Error('CANOPUS_API_KEY is missing in .env');
    if (!link) throw new Error('CANOPUS_API_URL is missing in .env');
    if (!modelId) throw new Error('MODEL_ID is missing in .env');

    this.apiKey = apiKey;
    this.link = link;
    this.modelId = modelId;
  }

  initCanopusSession(clientId: string, emit: (event: string, data: any) => void) {
    const canopus = new Canopus({ apiKey: this.apiKey, link: this.link });

    const session: SessionData = {
      canopus,
      clientId,
      sessionReady: false,
      sessionEnded: false,
      audioQueue: [],
    };

    canopus.startSttWebSocketSession(
      this.modelId,
      { language: 'en', sample_rate: 16000, encoding: 'audio/wav' },
      {
        onSessionStarted: () => {
          console.log(`✅ STT session started for ${clientId}`);
          
          session.sessionReady = true;

          // Send any queued audio chunks
          session.audioQueue.forEach((chunk) =>
            canopus.sendSttAudioChunk({ audio: chunk, encoding: 'audio/wav', sample_rate: 16000 }),
          );
          session.audioQueue = [];

          emit('stt-ready', { message: 'STT session ready' });
        },
        onTranscription: (data) => {
          const text = data.data?.transcript;
          if (text) emit('transcription', text);
        },
        onError: (error) => emit('stt-error', error),
        onSessionEnded: () => {
          console.log(`🛑 STT session ended for ${clientId}`);
          session.sessionEnded = true;
        },
        onDisconnect: () => {
          console.log(`🔌 STT disconnected for ${clientId}`);
          this.closeSession(clientId);
        },
      },
    ).catch((err) => {
      console.error(`❌ Failed to start STT session for ${clientId}:`, err);
      emit('stt-error', err);
    });

    this.sessions.set(clientId, session);
  }

  async sendAudioChunk(clientId: string, base64Chunk: string) {
    const session = this.sessions.get(clientId);
    if (!session) {
      console.warn(`⚠️ No session found for ${clientId}`);
      return;
    }

    if (!session.sessionReady) {
      // Queue chunks if session not ready yet
      session.audioQueue.push(base64Chunk);
      return;
    }

    if (session.sessionEnded) {
      console.warn(`⚠️ Session already ended for ${clientId}`);
      return;
    }

    try {
      await session.canopus.sendSttAudioChunk({
        audio: base64Chunk,
        encoding: 'audio/wav',
        sample_rate: 16000,
      });
    } catch (error) {
      console.error(`❌ Error sending audio chunk for ${clientId}:`, error);
    }
  }

  async endSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session || session.sessionEnded) return;

    try {
      await session.canopus.endSttWebSocketSession();
      session.sessionEnded = true;
      console.log(`🛑 Session ended manually for ${clientId}`);
    } catch (error) {
      console.error(`❌ Error ending session for ${clientId}:`, error);
    }
  }

  async closeSession(clientId: string) {
    await this.endSession(clientId);
    this.sessions.delete(clientId);
    console.log(`🗑️ Session closed for client: ${clientId}`);
  }
}
