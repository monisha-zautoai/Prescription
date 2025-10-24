import { Controller, Post,Get,Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { ProcessedTextService } from 'src/processed-text/text.service';
import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';


@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly processedTextService: ProcessedTextService
  ) {}
@Get('medicine/suggestions')
async getMedicineSuggestions(@Query('name') name: string) {
  return this.processedTextService.getSimilarMedicineSuggestions(name);
}

  @Post('upload')
  @UseInterceptors(FileInterceptor('audioFile'))
  async uploadAudio(@UploadedFile() audioFile: Express.Multer.File) {
    if (!audioFile) {
      throw new BadRequestException('No audio file provided.');
    }

    console.log('Received audio file:', audioFile.originalname);

    try {
      
      const transcription = await this.voiceService.transcribeAudio(audioFile.path);
      console.log('🎤 Raw Transcription:', transcription);  // Only the spoken text

      if (!transcription.trim()) {
        throw new BadRequestException('No speech detected in the audio.');
      }

   
      const structuredData = await this.processedTextService.extractMedicationDetails(transcription);
      console.log('💊 Structured Data:', structuredData);  // Clean structured JSON

      return { text: transcription, result: structuredData };
    } catch (err) {
      console.error('Error in uploadAudio:', err);
      throw new BadRequestException('Failed to process audio file.');
    }
  }
  @Post('upload-log-all-models')
@UseInterceptors(FileInterceptor('audioFile', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
}))
async uploadAndLogAllModels(@UploadedFile() audioFile: Express.Multer.File) {
  if (!audioFile) {
    console.error('❌ No file received in backend');
    throw new BadRequestException('No audio file provided.');
  }

  console.log('✅ Received audio file:', audioFile.filename);
  const filePath = path.resolve(audioFile.path);

  try {
    // ✅ Ensure the uploaded file exists
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Uploaded file not found on disk.');
    }

    const sttModels = [
      'Saarika Socket V2.5'
    ];

    const modelOutputs: Record<string, string> = {};

    for (const model of sttModels) {
      try {
        switch (model) {
      case 'Saarika Socket V2.5':
        
        modelOutputs[model] = await this.voiceService.transcribeAudio(filePath);
        break;

      
    
      default:
        modelOutputs[model] = `[No method defined for model "${model}"]`;
        break;
        }
      } catch (modelErr) {
        console.warn(`⚠️ ${model} failed:`, modelErr.message);
        modelOutputs[model] = '[Error transcribing with this model]';
      }
    }

    // ✅ Save all transcriptions to JSON log
    const logFile = path.join(process.cwd(), 'audio_logs.json');
    let existingLogs: any[] = [];

    if (fs.existsSync(logFile)) {
      existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }

    const logEntry = {
      audioFile: audioFile.filename,
      timestamp: new Date().toISOString(),
      modelOutputs,
    };

    existingLogs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));

    console.log('✅ Audio logged in JSON for all models:', audioFile.filename);

    // ✅ Pick one model for structured data extraction
    const primaryTranscription = modelOutputs['GPT-4o Mini Transcribe'] || '';
    const structuredData = primaryTranscription
      ? await this.processedTextService.extractMedicationDetails(primaryTranscription)
      : [];

    return { text: primaryTranscription, result: structuredData, modelOutputs };
  } catch (err) {
    console.error('❌ Error in uploadAndLogAllModels:', err);
    throw new BadRequestException('Failed to process audio file for all models.');
  }
}

  
}
