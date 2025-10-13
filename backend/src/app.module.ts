import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './voice/voice.module';
import { ProcessedTextModule } from './processed-text/text.module'; 
import { CanopusModule } from './canopus/canopus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true ,
      envFilePath: '.env',
      // load .env from src folder
    }),
    VoiceModule,
    ProcessedTextModule,
    CanopusModule, 
  ],
})
export class AppModule {}
