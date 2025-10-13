import { Module } from '@nestjs/common';
import { CanopusService } from './canopus.service';
import { CanopusController } from './canopus.controller';

@Module({
  controllers: [CanopusController],
  providers: [CanopusService],
  exports: [CanopusService]
})
export class CanopusModule {}
