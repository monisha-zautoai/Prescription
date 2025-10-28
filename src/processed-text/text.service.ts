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


/**
 * Extract medicine names from speech-to-text sentence and return suggestions for each.
 */
import { Injectable } from '@nestjs/common';
import { CanopusService } from 'src/canopus/canopus.service';
import { prompts } from 'src/prompts/medicationExtraction';
import axios from 'axios';
import { extractJsonFromMarkdown } from 'src/utils/json-helper';
import { ConfigurablesService } from 'src/configurables/configurables.service';


export interface MedicineSuggestion {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
  dose?: string | null;
  when?: string | null;
  frequency?: string | null;
  duration?: string | null;
  notes?: string | null;
}

export interface EnhancedMedication {
  original: any;
  suggestions: MedicineSuggestion[];
}

/**
 * Helper to safely extract the medicine name from JSON string prompt
 */
function medNameOnlyFromText(prompt: string): string {
  const match = prompt.match(/"medicine_name":"([^"]+)"/);
  return match ? match[1] : 'Unknown Medicine';
}

@Injectable()
export class ProcessedTextService {
  constructor(
    private readonly canopus: CanopusService,
    private readonly configurablesService: ConfigurablesService
  ) { }

  /**
   * Extract medicine names from speech-to-text sentence and return suggestions for each.
   */
  async extractMedicationDetails(text: string): Promise<EnhancedMedication[]> {
    try {
      const model = this.configurablesService.getconfigurable('EXTRACTION_MODEL');

      // 🔹 Step 1: Extract medicine names and details from the full text
      const firstPrompt = prompts.MEDICATION_EXTRACTION_PROMPT.replaceAll(
        '{{medicationText}}',
        text
      ).replaceAll('{{types}}', '');

      const firstResponse = await this.canopus.callTextModel(firstPrompt, model);

      // Parse JSON from markdown safely
      let extractedMeds = extractJsonFromMarkdown(firstResponse.content) || [];
      console.log('🧩 Extracted Medicines:', extractedMeds);

      // Filter invalid or empty names
      extractedMeds = extractedMeds.filter(
        (med) => med?.name && med.name.trim().length > 0
      );

      if (!extractedMeds.length) return [];

      const results: EnhancedMedication[] = [];

      // 🔹 Step 2: For each extracted medicine, fetch correction/suggestions
      for (const med of extractedMeds) {
        const medName = med.name;

        const secondPrompt = prompts.MEDICATION_BASIC_PROMPT1.replace(
          '{{medicationText}}',
          JSON.stringify({ medicine_name: medName })
        );

        let suggestions: MedicineSuggestion[] = await this.callMedicineEnhancer(secondPrompt);

        // Merge original dosage/details into suggestions
        suggestions = suggestions.map((s) => ({
          ...s,
          dose: med.dose ?? null,
          when: med.when ?? null,
          frequency: med.frequency ?? null,
          duration: med.duration ?? null,
          notes: med.notes ?? null
        }));

        // Sort suggestions by confidence (highest first)
        suggestions.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

        results.push({
          original: med,
          suggestions: suggestions.length
            ? suggestions
            : [{ name: medName, composition: 'N/A', price: 'N/A', confidence: 0, dose: med.dose }]
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Error extracting medication details:', error);
      return [];
    }
  }
  async getSimilarMedicineSuggestions(name: string): Promise<MedicineSuggestion[]> {
    const prompt = prompts.MEDICATION_BASIC_PROMPT2.replace(
      '{{medicationText}}',
      JSON.stringify({ medicine_name: name })
    );

    let suggestions = await this.callMedicineEnhancer(prompt);
    suggestions.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    return suggestions.slice(0, 10); // top 10
  }

  /**
   * Call Perplexity API to get top medicine suggestions for each name
   */
  async callMedicineEnhancer(promptText: string): Promise<MedicineSuggestion[]> {
    try {
      const apiKey = this.configurablesService.getconfigurable('PERPLEXITY_KEY');
      const model = this.configurablesService.getconfigurable('MEDICAL_ENCHANCER_MODEL') || '';
      if (apiKey?.trim()) {
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
                    confidence: { type: 'number' }
                  },
                  required: ['name', 'confidence'],
                  additionalProperties: false
                },
                minItems: 10,
                maxItems: 10
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

        const parsed: MedicineSuggestion[] = extractJsonFromMarkdown(raw) || [];

        // ✅ Return top 5 valid medicine suggestions
        if (parsed.length && parsed.every((s) => s.name)) {
          parsed.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
          return parsed.slice(0, 10);
        }

        // ✅ Fallback: return at least one entry
        const medName = medNameOnlyFromText(promptText);
        return [{ name: medName, composition: 'N/A', price: 'N/A', confidence: 0 }];
      } else {
        const response = await this.canopus.callTextModel(promptText, model);
        const parsed = extractJsonFromMarkdown(response.content) || [];
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error calling Medicine Enhancer:', error);
      const medName = medNameOnlyFromText(promptText);
      return [{ name: medName, composition: 'N/A', price: 'N/A', confidence: 0 }];
    }
  }
}
