import { forwardRef, Global, Module } from '@nestjs/common';
import { CanopusModule } from 'src/canopus/canopus.module';
import { ConfigurablesController } from './configurables.controller';
import { ConfigurablesService } from './configurables.service';

@Global()
@Module({
  imports: [forwardRef(() => CanopusModule)],
  controllers: [ConfigurablesController],
  providers: [ConfigurablesService],
  exports: [ConfigurablesService]
})
export class ConfigurablesModule {}
