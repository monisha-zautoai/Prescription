import { Controller, Post,Get,Query, Body } from '@nestjs/common';
import { ProcessedTextService } from './text.service';

@Controller('processed-text')
export class ProcessedTextController {
  constructor(private readonly processedTextService: ProcessedTextService) {}
  
@Get('medicine/suggestions')
async getMedicineSuggestions(@Query('name') name: string) {
  return this.processedTextService.getSimilarMedicineSuggestions(name);
}


  @Post()
  async handleText(@Body() body: { text: string }) {
    const rawText = body.text;
   
    console.log('📥 Received text via REST API:', rawText);

    // Call updated service to extract medication details (name, composition, price, suggestions)
    const structuredData = await this.processedTextService.extractMedicationDetails(rawText);

    console.log('✅ Structured medication details:');
    console.dir(structuredData, {depth: null})
    return { result: structuredData };
  }
}
