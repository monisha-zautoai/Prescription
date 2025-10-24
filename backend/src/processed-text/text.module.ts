// processed-text.module.ts
import { Module } from '@nestjs/common';
import { ProcessedTextService } from 'src/processed-text/text.service';
import { CanopusModule } from '../canopus/canopus.module';

@Module({
  imports: [CanopusModule],
  providers: [ProcessedTextService],
  exports: [ProcessedTextService], 
})
export class ProcessedTextModule {}
