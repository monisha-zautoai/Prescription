import { forwardRef, Module } from '@nestjs/common';
import { CanopusService } from './canopus.service';
import { CanopusController } from './canopus.controller';
import { ConfigurablesModule } from 'src/configurables/configurables.module';

@Module({
  imports: [forwardRef(() => ConfigurablesModule)],
  controllers: [CanopusController],
  providers: [CanopusService],
  exports: [CanopusService]
})
export class CanopusModule {}
