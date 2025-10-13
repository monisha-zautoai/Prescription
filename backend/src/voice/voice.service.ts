import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Canopus } from '@zauto/canopus';

interface SessionData {
  canopus: any; // Canopus instance
  isActive: boolean;
  startTime: number;
  modelId: string;
  clientId: string,
  // Audio accounting for credit calculation
  audioBytesAccumulated?: number; // total raw audio bytes received
  sampleRateHint?: number; // last seen sample_rate
  bytesPerSample?: number; // default 2 (16-bit PCM)
  channels?: number; // default 1
  // Finalization flags
  accounted?: boolean; // whether credits/time have been finalized
  endedAt?: number; // when we marked the session ended
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
    disableFS: true
  }

  initCanopusSession(clientId: string, emit: (event: string, data: any) => void, callbacks: any) {
    const session = this.createSession(clientId, emit);
    this.sessions.set(clientId, session);
    this.startSession(session, emit, callbacks);
  }

  private createSession(clientId: string, emit: (event: string, data: any) => void): SessionData {
    // return {
    //   clientId,
    //   sessionReady: false,
    //   sessionEnded: false,
    //   audioQueue: [],
    //   reconnectAttempts: 0,
    // };
    return {
      canopus: new Canopus({ apiKey: this.apiKey, link: this.link }),
      isActive: false,
      startTime: Date.now(),
      clientId,
      modelId: this.modelId,
      audioBytesAccumulated: 0,
      sampleRateHint: 16000,
      bytesPerSample: 2,
      channels: 1
    };
  }

  private startSession(session: SessionData, emit: (event: string, data: any) => void, callbacks: any) {
    const sessionId = session.clientId
    session.canopus
      .startSttWebSocketSession(
        this.modelId,
        { language: 'en', sample_rate: 16000, encoding: 'audio/wav' },
        {
          ...callbacks,
          onSessionStarted: (sessionData) => {
            session.isActive = true;
            console.log(`STT WebSocket session started for session ${sessionId}`);
            if (callbacks.onSessionStarted) {
              callbacks.onSessionStarted(sessionData);
            }
          },
          onSessionEnded: async (sessionData) => {
            session.isActive = false;
            // await finalizeSession();

            console.log(`STT WebSocket session ended for session ${sessionId}`);
            if (callbacks.onSessionEnded) {
              callbacks.onSessionEnded(sessionData);
            }
          },
          onError: (error) => {
            console.error(`STT WebSocket error for session ${sessionId}:`, error);
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          },
          onDisconnect: async () => {
            // Some gateways surface onDisconnect; ensure we finalize once
            // try { await finalizeSession(); } catch { }
            if (callbacks.onDisconnect) callbacks.onDisconnect();
          }
        }
      )
      .catch((err) => {
        console.error(`❌ Failed to start STT session for ${session.clientId}:`, err);
        emit('stt-error', err);
      });
  }

     async sendAudioChunk(sessionId: string, audioData: any): Promise<void> {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            throw new Error(`STT WebSocket session ${sessionId} not found`);
        }

        if (!session.isActive) {
            throw new Error(`STT WebSocket session ${sessionId} is not active`);
        }

        try {
            let payload: any;
            if (typeof audioData === 'string') {
                payload = audioData;
                // Approximate bytes from base64 length
                const approxBytes = Math.floor((audioData.length * 3) / 4);
                session.audioBytesAccumulated = (session.audioBytesAccumulated || 0) + approxBytes;
            } else {
                const audio = audioData.audio || audioData;
                const encoding = audioData.encoding || 'audio/wav';
                const sample_rate = audioData.sample_rate || 16000;
                payload = { audio, encoding, sample_rate }; 

                session.sampleRateHint = sample_rate;
                // Estimate bytes for raw base64 payload if string
                if (typeof audio === 'string') {
                    const approxBytes = Math.floor((audio.length * 3) / 4);
                    session.audioBytesAccumulated = (session.audioBytesAccumulated || 0) + approxBytes;
                } else if (audio instanceof Buffer) {
                    session.audioBytesAccumulated = (session.audioBytesAccumulated || 0) + audio.byteLength;
                }
            }
            session.canopus.sendSttAudioChunk(payload);
        } catch (err) {
            console.error(`Error sending audio chunk for session ${sessionId}:`, err);
            throw err;
        }
    }


  async endSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session || !session.isActive) return;

    try {
      await session.canopus.endSttWebSocketSession();
      session.isActive = false;
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
