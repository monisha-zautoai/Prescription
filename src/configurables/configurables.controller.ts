import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigurablesService } from './configurables.service';

@Controller('configurables')
export class ConfigurablesController {
  constructor(private readonly configurablesService: ConfigurablesService) {}

  @Get()
  getConfigurables(): any {
    return this.configurablesService.getConfigurables();
  }

  @Put()
  setConfigurables(@Body() data: any): any {
    const { key, value } = data;
    return this.configurablesService.setconfigurable(key, value);
  }
}
