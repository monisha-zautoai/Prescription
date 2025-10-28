import { Injectable, Logger } from '@nestjs/common';  
import { ConfigService } from '@nestjs/config';
import { Canopus } from '@zauto/canopus';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly canopus: Canopus;
  private readonly modelId: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('CANOPUS_API_KEY');
    if (!apiKey) throw new Error('CANOPUS_API_KEY is missing in .env');

    const apiLink = this.configService.get<string>('CANOPUS_API_URL');
    if (!apiLink) throw new Error('CANOPUS_API_URL is missing in .env');

    const modelId = this.configService.get<string>('MODEL_ID');
    if (!modelId) throw new Error('MODEL_ID is missing in .env');

    this.modelId = modelId;

    this.canopus = new Canopus({
      apiKey,
      link: apiLink,
    });
  }

  // Check if file is already WAV
  async isWavFile(filePath: string): Promise<boolean> {
    return path.extname(filePath).toLowerCase() === '.wav';
  }

  // Convert any audio file to WAV using ffmpeg
  async convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -ac 1 -ar 16000 -sample_fmt s16 "${outputPath}"`;
    child_process.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        this.logger.error('Error converting to WAV:', err.message);
        return reject(err);
      }
      this.logger.log('Conversion to WAV completed: ' + outputPath);
      resolve();
    });
  });
}


  // Transcribe audio (convert to WAV if needed)
  async transcribeAudio(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) throw new Error('Audio file not found');

    let wavPath = filePath;
    if (!filePath.toLowerCase().endsWith('.wav')) {
      this.logger.log('File is not WAV. Converting...');
      wavPath = filePath + '.wav';
      await this.convertToWav(filePath, wavPath);
      fs.unlinkSync(filePath); // delete original non-WAV file
      this.logger.log('Conversion done. Using WAV file: ' + wavPath);
    } else {
      this.logger.log('File is already WAV. No conversion needed.');
    }
    // return 'Joo'
    // Call Canopus STT
    try {
      
      const response = await this.canopus.callSttModel(this.modelId, wavPath);
      const text = response?.data?.transcription || '';
      this.logger.log('Transcribed Text: ' + text);
      return text;
    } catch (err: any) {
      this.logger.error('STT Error:', err?.message || err);
      throw new Error('Failed to transcribe audio. Please check the model ID and Canopus service.');
    }
  }
  // ----- Placeholder methods for multi-model logging -----


}
