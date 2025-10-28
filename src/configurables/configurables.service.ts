import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CanopusService } from 'src/canopus/canopus.service';

@Injectable()
export class ConfigurablesService {

    constructor(
        @Inject(forwardRef(() => CanopusService))
        private readonly canopusService: CanopusService
    ) { }

    private env = { CANOPUS_LINK: '', CANOPUS_API_KEY: '', MODEL_ID: 'Azure GPT-4o Transcribe', EXTRACTION_MODEL: 'Azure Monesh GPT 4o', PERPLEXITY_KEY: '', MEDICAL_ENCHANCER_MODEL: 'sonar' }


    getConfigurables(){
        return this.env;
    }

    getconfigurable(key: string): string {
        return this.env[key];
    }

    setconfigurable(key: string, value: string): void {
        this.env[key] = value;
        if (key === 'CANOPUS_LINK' || key === 'CANOPUS_API_KEY') {
            try {
                this.canopusService.resetClient()
            } catch (error) {
                
            }
        }
    }

}
