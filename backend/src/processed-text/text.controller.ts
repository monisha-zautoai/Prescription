import { Controller, Post, Body } from '@nestjs/common';
import { ProcessedTextService } from './text.service';

@Controller('processed-text')
export class ProcessedTextController {
  constructor(private readonly processedTextService: ProcessedTextService) {}

  @Post()
  async handleText(@Body() body: { text: string, patientInfo: any }) {
    const rawText = body.text;
    const patientInfo = body.patientInfo
    console.log('📥 Received text via REST API:', rawText);

    // Call updated service to extract medication details (name, composition, price, suggestions)
    const structuredData = await this.processedTextService.extractMedicationDetails(rawText,patientInfo);

    console.log('✅ Structured medication details:');
    console.dir(structuredData, {depth: null})
    return { result: structuredData };
  }
}
