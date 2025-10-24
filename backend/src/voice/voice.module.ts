import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { ProcessedTextModule } from 'src/processed-text/text.module';
import { CanopusModule } from 'src/canopus/canopus.module';

@Module({
  imports: [
    ProcessedTextModule,
    MulterModule.register({
      dest: './uploads', // folder to store uploaded audio files
    }),
    CanopusModule
  ],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
