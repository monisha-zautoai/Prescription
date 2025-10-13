import { Module } from '@nestjs/common';
import { ProcessedTextController } from './text.controller';
import { ProcessedTextService } from './text.service';
import { CanopusModule } from 'src/canopus/canopus.module';

@Module({
  imports: [CanopusModule],
  controllers: [ProcessedTextController],
  providers: [ProcessedTextService], // ✅ Add service here
})
export class ProcessedTextModule {}
