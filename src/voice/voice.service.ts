import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Canopus } from '@zauto/canopus';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { CanopusService } from 'src/canopus/canopus.service';
import { ConfigurablesService } from 'src/configurables/configurables.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly canopus: CanopusService,
    private readonly configurablesService: ConfigurablesService
  ) {
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
      const modelId = this.configurablesService.getconfigurable('MODEL_ID') || ''
      const response = await this.canopus.callSTT(modelId, wavPath)
      const text = response?.data?.transcription || '';
      this.logger.log('Transcribed Text: ' + text);
      return text;
    } catch (err: any) {
      this.logger.error('STT Error:', err);
      throw new Error('Failed to transcribe audio. Please check the model ID and Canopus service.');
    }
  }
  // ----- Placeholder methods for multi-model logging -----


}
