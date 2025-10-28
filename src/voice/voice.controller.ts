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
  

  
}
