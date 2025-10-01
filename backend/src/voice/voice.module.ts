import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { VoiceService } from './voice.service';

@Module({
  providers: [VoiceGateway, VoiceService],
})
export class VoiceModule {}
