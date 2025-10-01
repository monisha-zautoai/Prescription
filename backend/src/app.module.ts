import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true ,
      envFilePath: '.env',
      // load .env from src folder
    }),
    VoiceModule,
  ],
})
export class AppModule {}
