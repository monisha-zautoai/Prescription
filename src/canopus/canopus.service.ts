import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Canopus } from '@zauto/canopus';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigurablesService } from 'src/configurables/configurables.service';

type CanopusLanguage =
  | "en-IN" | "hi-IN" | "bn-IN" | "kn-IN" | "ml-IN" | "mr-IN"
  | "od-IN" | "pa-IN" | "ta-IN" | "te-IN" | "gu-IN" | "ta" | "en" | "unknown";
type CanopusVoice = "meera" | "pavithra" | "maitreyi" | "arvind" | "amol" | "amartya";

@Injectable()
export class CanopusService {
  private canopusClient: Canopus;

  constructor(
    @Inject(forwardRef(() => ConfigurablesService))
    private readonly configurablesService: ConfigurablesService
  ) {
  }

  // -------------------- Verify Client --------------------
  private async verifyClient(){
    if (!this.canopusClient) {
      const apiKey = this.configurablesService.getconfigurable('CANOPUS_API_KEY');
      const link = this.configurablesService.getconfigurable('CANOPUS_LINK');
      console.log('API key:', apiKey);
      console.log('Link:', link);
      if (!apiKey || !link) {
        console.log('API key or link not provided');
        return null
      }
      this.canopusClient = new Canopus({
        apiKey,
        link,
      });
    }
    return this.canopusClient;
  }

  async resetClient() {
    const apiKey = this.configurablesService.getconfigurable('CANOPUS_API_KEY');
    const link = this.configurablesService.getconfigurable('CANOPUS_LINK');
    console.log('Resetting client');
    console.log('API key:', apiKey);
    console.log('Link:', link);
    if (!apiKey || !link) {
      console.error('API key or link not provided');
      return 
    }
    this.canopusClient = new Canopus({
      apiKey,
      link,
    });
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
  async callSTT(model: string, audioPath: string, prompt?: string) {
    const client = await this.verifyClient();
    if (client) {
      const response = await client.callSttModel(model, audioPath, prompt);
      return response?.data;
    }
    return null;
  }
}
