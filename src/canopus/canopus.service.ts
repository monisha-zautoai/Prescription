import { Injectable } from '@nestjs/common';
import { Canopus } from '@zauto/canopus';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

type CanopusLanguage =
  | "en-IN" | "hi-IN" | "bn-IN" | "kn-IN" | "ml-IN" | "mr-IN"
  | "od-IN" | "pa-IN" | "ta-IN" | "te-IN" | "gu-IN" | "ta" | "en" | "unknown";
  type CanopusVoice = "meera" | "pavithra" | "maitreyi" | "arvind" | "amol" | "amartya";

@Injectable()
export class CanopusService {
  private apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZCI6ImIwZmIyOGRiLTI3MzAtNDJjOC1iOGE3LTllMTM2NTc0MmRkMiIsImlhdCI6MTc1MzY5MzEwNSwiZXhwIjo0OTA5NDUzMTA1fQ.ZUbLuwJ5IDpRG7rWtrGjC9lBYc3mEncZ5WIm7tBz3tA';
  private link = 'https://canopus-dev.zautoai.com';
  private canopusClient: Canopus;

  constructor() {
    this.canopusClient = new Canopus({
      apiKey: this.apiKey,
      link: this.link,
    });
  }

  // -------------------- Verify Client --------------------
  private async verifyClient(): Promise<Canopus> {
    if (!this.canopusClient) {
      this.canopusClient = new Canopus({
        apiKey: this.apiKey,
        link: this.link,
      });
    }
    return this.canopusClient;
  }

  // -------------------- Text Generation --------------------
  async callTextModel(prompt: string, model: string) {
    const client = await this.verifyClient();
    if (client) {
      const response = await client.callTextModels(model, prompt);
      return response?.data;
    }
    return null;
  }

  // -------------------- Text-to-Speech --------------------
  async callTTS(
    model: string,
    text: string,
    language: CanopusLanguage = 'en-IN',
    voice: CanopusVoice = 'meera'
  ) {
  const client = await this.verifyClient();
  if (client) {
    const response = await client.callTtsModel(model, text, language, voice);
    return response?.data;
  }
    return null;
  }

  // -------------------- Speech-to-Text --------------------
  async callSTT(model: string, audio: Buffer, prompt?: string) {
    const client = await this.verifyClient();
    if (client) {
      // Save buffer to temporary file
      const tempFilePath = join(tmpdir(), `audio-${Date.now()}.wav`);
      await writeFile(tempFilePath, audio);

      // Call STT
      const response = await client.callSttModel(model, tempFilePath, prompt);
      return response?.data;
    }
    return null;
  }
}
