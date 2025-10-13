/*import { Injectable } from '@nestjs/common';
import { CanopusService } from 'src/canopus/canopus.service';
import { prompts } from 'src/prompts/medicationExtraction';
import axios from 'axios';
import { extractJsonFromMarkdown } from 'src/utils/json-helper';

export interface MedicineSuggestion {
  name: string;
  composition: string;
  price: string;
  confidence?: number | null;
  phonetic_match_score: number;     // Required
  clinical_warning?: string;
}

export interface EnhancedMedication {
  original: any;
  suggestions: MedicineSuggestion[];
}

@Injectable()
export class ProcessedTextService {
  constructor(private readonly canopus: CanopusService) { }

  async extractMedicationDetails(text: string, patientInfo: any): Promise<EnhancedMedication[]> {
    try {
      const model = 'Azure Monesh GPT 4o';

      const firstPrompt = prompts.MEDICATION_EXTRACTION_PROMPT
        .replaceAll("{{medicationText}}", text)
        .replaceAll("{{types}}", '');
      const firstResponse = await this.canopus.callTextModel(firstPrompt, model);

      const extractedMeds = extractJsonFromMarkdown(firstResponse.content);
      if (!extractedMeds?.length) return [];

      // const medNames = extractedMeds.map(m => m.name).join(', ')
      // console.log(medNames)

      const results: EnhancedMedication[] = [];/*

      // Process each medicine individually
      /*for (const med of extractedMeds) {
        const medName = med.name;
        console.log('Processing medicine:', medName);

        let input = {
          medicine_name: medName,
          ...patientInfo
        }

        const secondPrompt = prompts.MEDICATION_BASIC_PROMPT.replace("{{medicationText}}", JSON.stringify(input));

        const enhancedData: MedicineSuggestion[] = await this.callMedicineEnchancer(secondPrompt);

        results.push({
          original: med,
          suggestions: enhancedData?.length
            ? enhancedData
            : [{ name: medName, composition: 'N/A', price: 'N/A', confidence: null }]
        });
      }

      return results;*/

/*
const secondPrompt = prompts.MEDICATION_BASIC_PROMPT
  .replace("{{medicationText}}", medNames)

const enhancedData = await this.callMedicineEnchancer(secondPrompt);

const suggestionResponse = await this.canopus.callTextModel(secondPrompt, model)
const parsedResponse = extractJsonFromMarkdown(suggestionResponse.content)
console.log(parsedResponse)
return parsedResponse;
*/
/*
    } catch (error) {
      console.error('Error extracting medication details:', error);
      return [];
    }
  }*/

/*async callMedicineEnchancer(promptText: string): Promise<MedicineSuggestion[]> {
  try {
    console.log(promptText);
    const apiKey = process.env.PERPLEXITY_KEY;
    const model = process.env.MEDICAL_ENCHANCER_MODEL;

    const body = {
      model,
      messages: [{ role: 'user', content: promptText }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          schema: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  composition: { type: 'string' },
                  price: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            }
          }
        }
      }
    };

    const { data } = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      body,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    let raw = data?.choices?.[0]?.message?.content ?? '';
    raw = raw.replace(/<\/?think>/g, '').trim();

    console.log(raw);
    const parsed = extractJsonFromMarkdown(raw);

    console.log(parsed);

    return parsed;

  } catch (error) {
    console.error('Error in Medicine Enhancer', error);
    return [{ name: promptText, composition: 'N/A', price: 'N/A', confidence: null }];
  }
}
}
*/
/*async callMedicineEnchancer(promptText: string): Promise<MedicineSuggestion[]> {
  try {
    console.log('Prompt sent to Perplexity:', promptText);

    const apiKey = process.env.PERPLEXITY_KEY;
    const model = process.env.MEDICAL_ENCHANCER_MODEL;

    const body = {
      model,
      messages: [{ role: 'user', content: promptText }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                composition: { type: 'string' },
                price: { type: 'string' },
                confidence: { type: 'number' },
               phonetic_match_score: { type: 'number' },
                clinical_warning: { type: 'string' }
              },
              required: ['name', 'composition', 'price', 'confidence', 'phonetic_match_score'],
              additionalProperties: false
            },
            minItems: 5,
            maxItems: 5
          },
          general_safety_alert: { type: 'string' }
        },
        required: ['suggestions'],
        additionalProperties: false
      }
    }
  }
};

const { data } = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    body,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

let raw = data?.choices?.[0]?.message?.content ?? '';
raw = raw.replace(/<\/?think>/g, '').trim();

console.log('Raw response:', raw);

// Parse JSON safely
let parsed = extractJsonFromMarkdown(raw);

// Ensure always an array of suggestions
if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
parsed = [{
  name: promptText,
  composition: 'Composition not available',
  price: 'Price varies',
  confidence: 0.5
}];
}

// Ensure maximum 5 suggestions
if (parsed.length > 5) parsed = parsed.slice(0, 5);

console.log('Parsed suggestions:', parsed);

return parsed;

} catch (error) {
console.error('Error in Medicine Enhancer', error);
return [{
  name: promptText,
  composition: 'Composition not available',
  price: 'Price varies',
  confidence: 0.5
}];
}
}
}
*/
import { Injectable } from '@nestjs/common';
import { CanopusService } from 'src/canopus/canopus.service';
import { prompts } from 'src/prompts/medicationExtraction';
import axios from 'axios';
import { extractJsonFromMarkdown } from 'src/utils/json-helper';

export interface AlternativeMedicine {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
  phonetic_match_score?: number;
  reason: string; // Why this alternative is safe and chosen
}


export interface MedicineSuggestion {
  name: string;
  composition: string;
  price: string;
  confidence?: number | null;
  phonetic_match_score: number;
  clinical_warning?: {
    allergy?: string;
    age?: string;
    indication?: string;
    hpi?: string;
    alternative_suggestion: AlternativeMedicine; // mandatory if warning exists
  };
}


export interface EnhancedMedication {
  original: any;
  suggestions: MedicineSuggestion[];
}

@Injectable()
export class ProcessedTextService {
  constructor(private readonly canopus: CanopusService) {}

  async extractMedicationDetails(
    text: string,
    patientInfo: any
  ): Promise<EnhancedMedication[]> {
    try {
      const model = 'Azure Monesh GPT 4o';

      const firstPrompt = prompts.MEDICATION_EXTRACTION_PROMPT
        .replaceAll('{{medicationText}}', text)
        .replaceAll('{{types}}', '');
      const firstResponse = await this.canopus.callTextModel(firstPrompt, model);

      const extractedMeds = extractJsonFromMarkdown(firstResponse.content);
      if (!extractedMeds?.length) return [];
      console.log(extractedMeds);

      const results: EnhancedMedication[] = [];

      for (const med of extractedMeds) {
        const medName = med.name;
        console.log('Processing medicine:', medName);

        const input = {
          medicine_name: medName,
          ...patientInfo,
        };

        const secondPrompt = prompts.MEDICATION_BASIC_PROMPT.replace(
          '{{medicationText}}',
          JSON.stringify(input),
        );

        const enhancedData: MedicineSuggestion[] = await this.callMedicineEnchancer(secondPrompt);

        results.push({
          original: med,
          suggestions:
            enhancedData?.length > 0
              ? enhancedData
              : [
                  {
                    name: medName,
                    composition: 'N/A',
                    price: 'N/A',
                    confidence: null,
                    phonetic_match_score: 0,
                  },
                ],
        });
      }

      return results;
    } catch (error) {
      console.error('Error extracting medication details:', error);
      return [];
    }
  }

  async callMedicineEnchancer(promptText: string): Promise<MedicineSuggestion[]> {
    try {
      console.log('Prompt sent to Perplexity:', promptText);

      const apiKey = process.env.PERPLEXITY_KEY;
      const model = process.env.MEDICAL_ENCHANCER_MODEL;

      const body = { 
  model,
  messages: [{ role: 'user', content: promptText }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            composition: { type: 'string' },
            price: { type: 'string' },
            confidence: { type: 'number' },
            phonetic_match_score: { type: 'number' },
            clinical_warning: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                alternative_suggestion: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    composition: { type: 'string' },
                    price: { type: 'string' },
                    confidence: { type: 'number' },
                    reason: { type: 'string' }
                  },
                  required: ['name', 'reason'],
                  additionalProperties: false
                }
              },
              required: ['message','alternative_suggestion'], // mandatory if warning exists
              additionalProperties: false
            }
          },
          required: ['name', 'composition', 'price', 'confidence', 'phonetic_match_score'],
          additionalProperties: false
        },
        minItems: 5,
        maxItems: 5
      }
    }
  }
};


      const { data } = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        body,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      let raw = data?.choices?.[0]?.message?.content ?? '';
      raw = raw.replace(/<\/?think>/g, '').trim();

      console.log('Raw response:', raw);

      let parsed: MedicineSuggestion[] = extractJsonFromMarkdown(raw) || [];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = [
          {
            name: promptText,
            composition: 'Composition not available',
            price: 'Price varies',
            confidence: 0.5,
            phonetic_match_score: 0,
          },
        ];
      }

      if (parsed.length > 5) parsed = parsed.slice(0, 5);

      console.log('Parsed suggestions:', parsed);

      return parsed;
    } catch (error) {
      console.error('Error in Medicine Enhancer', error);
      return [
        {
          name: promptText,
          composition: 'Composition not available',
          price: 'Price varies',
          confidence: 0.5,
          phonetic_match_score: 0,
        },
      ];
    }
  }
}
