export const prompts = {
  "MEDICATION_EXTRACTION_PROMPT": `You will receive unstructured text containing medication information. Your task is to extract and structure medication details according to the defined schema. Analyze the text carefully to identify all medications mentioned and their related attributes.
 
Instructions:
1. Data Extraction:
   - Identify all medications mentioned in the text and extract the following attributes for each:
     - name: The name of the medication/tablet. The name can include strength like "mg" or other units (e.g., "Dolo 650 mg", "Amoxicillin").
       - IMPORTANT: Remove any type prefixes or suffixes from the name. If the text says "Tablet Dolo 650" or "Dolo 650 Tablet", the name should be "Dolo 650" (without "Tablet").
       - The type information should be captured separately in the "type" field, not included in the name.
       - Handle potential STT errors where numbers may be misinterpreted as prices (e.g., "$6.50" instead of "650"). Use context clues to correct such errors and identify the correct medication name.
     - type: The type/form of the medication based on the available types mapping.
       - Use the types mapping to determine the correct type code
       - Look for type mentions before or after the medication name (e.g., "Tablet Dolo", "Dolo Tablet", "Capsule Amoxicillin")
       - When a type is identified, remove it from the medication name and map it to the corresponding code
       - Examples: "Tablet Dolo 650" → name: "Dolo 650", type: "Tab"; "Amoxicillin Capsule 500mg" → name: "Amoxicillin 500mg", type: "Tab"
       - If no type is mentioned or unclear, set to null
     - dose: The dosage pattern using the format "M-A-E-N", representing Morning - Afternoon - Evening - Night respectively (e.g., "1-0-1-0" for morning and evening, "1-0-0-1" for morning and night).
       - Frequency-to-Dose Mapping:
         - "four times daily" or "4 times daily" or "QID" or "qid" → "1-1-1-1"
         - "thrice daily" or "three times daily" or "3 times daily" or "TID" or "TD" → "1-1-1-0"
         - "twice daily" or "two times daily" or "2 times daily" or "BID" or "BD" → "1-0-1-0" or "1-0-0-1"
         - "once daily" or "one time daily" or "1 time daily" or "OD" → "1-0-0-0"
         - "HS" (at bedtime) → "0-0-0-1"
         - "PRN" (as needed) → "0-0-0-0"
         - If specific timing is mentioned (e.g., "morning and evening"), map accordingly (e.g., "1-0-1-0")
         - If specific timing is mentioned (e.g., "morning and night"), map accordingly (e.g., "1-0-0-1")
         - If only numbers are given without timing, distribute evenly starting with morning
     - when: When to take relative to food (e.g., "Before meals", "After meals", "With meals", "On empty stomach", "As needed", "SOS").
       - For "PRN" medications, set "when" as "As needed"
       - For "STAT" injections, set "when" as "STAT"
       - For "QID" or "qid" medications, set "when" as "Every 6 hours"
       - Default to "After meals" if not specified.
     - frequency: How often to take (e.g., "Daily", "Weekly", "Monthly", "Every 8 hours").
       - For "STAT" injections, set frequency as "-"
       - Default is "Daily" if not specified.
     - duration: How long to continue the medication (e.g., "7 days", "3 weeks", "4 months").
       - For "STAT" injections, set duration as "-"
       - If the duration is mentioned at the end of the text without specifically linking to any medication, assume it applies to all the previously mentioned medications.
     - notes: Additional clinical instructions or conditional information (e.g., "stop if fever subsides", "discontinue if nausea occurs", "take only when needed for pain").
       - Only include extra clinical guidance, warnings, or conditional instructions.
       - Do NOT include duration information (e.g., "for 3 days"), frequency information (e.g., "qid", "twice daily"), or basic indication (e.g., "for fever").
       - Do not include any guesses, corrections, or uncertainties due to STT in this field.
       - Do not include such as 'Originally name was' or 'No specific medication name found'
     - genericName: Whether the medication name is a generic (chemical/pharmacological) name or not.
       - "yes" if the name is a generic/chemical name (e.g., "Paracetamol", "Amoxicillin", "Diclofenac")
       - "no" if the name is a brand/trade name (e.g., "Dolo", "Tylenol", "Crocin")
       - "unknown" if it's unclear whether it's generic or brand, or if it's not a standard pharmaceutical (e.g., "Rose Water", "Honey")
 
2. Type Mapping:
   - Use the provided types mapping to determine medication types
   - The mapping format is: TypeCode: [list of possible type names]
   - Example mapping reference: Tab: ['Tablet', 'Capsule', 'Pill'], Powder: ['Powder']
   - If the text mentions "Tablet Dolo" or "Dolo Tablet", return "Tab" in the type field
   - If the text mentions "Capsule Amoxicillin", return "Tab" in the type field
   - If the text mentions "Powder medication", return "Powder" in the type field
   - Case-insensitive matching for type identification
 
3. Special Cases:
   - STAT Injections: When "stat" is mentioned for injections, set:
     - "when": "STAT"
     - "duration": "-"  
     - "frequency": "-"
     - "dose": "0-0-0-0"
     - "type": Based on available mapping or null if injection type not in mapping
   - QID Medications: When "qid" or "four times daily" is mentioned, set:
     - "dose": "1-1-1-1"
     - "when": "Every 6 hours"
 
4. Structured Output:
   - Return your results strictly as a JSON array of medication objects. Each object should contain all specified attributes. If an attribute is not found in the text, use default values if no default values then include the key with a null value.
   - Example:
     \`\`\`
     [
       {
         "name": "Dolo 650 mg",
         "type": "Tab",
         "dose": "1-0-1-0",
         "when": "After meals",
         "frequency": "Daily",
         "duration": "5 days",
         "notes": "Stop if fever subsides",
         "genericName": "no"
       },
       {
         "name": "Amoxicillin 500 mg",
         "type": "Tab",
         "dose": "1-1-1-0",
         "when": "Before meals",
         "frequency": "Daily",
         "duration": "7 days",
         "notes": null,
         "genericName": "yes"
       },
       {
         "name": "Paracetamol 500 mg",
         "type": null,
         "dose": "1-1-1-1",
         "when": "Every 6 hours",
         "frequency": "Daily",
         "duration": "3 days",
         "notes": "Discontinue if nausea occurs",
         "genericName": "yes"
       },
       {
         "name": "Injection Diclofenac",
         "type": null,
         "dose": "0-0-0-0",
         "when": "STAT",
         "frequency": "-",
         "duration": "-",
         "notes": null,
         "genericName": "yes"
       },
       {
         "name": "Rose Water",
         "type": "Powder",
         "dose": "1-1-1-0",
         "when": "Before meals",
         "frequency": "Daily",
         "duration": "7 days",
         "notes": null,
         "genericName": "unknown"
       }
     ]
     \`\`\`
   - If no extractable data is found, return an empty array.
 
5. Accuracy:
   - Ensure extracted information accurately reflects what's described in the text.
   - Carefully handle cases where the medication name might be interpreted incorrectly due to numerical errors. For example:
   - If the STT model outputs "$6.50", infer that the intended name might be "Dolo 650" if context suggests so.
   - Pay special attention to frequency indicators and map them correctly to the M-A-E-N dose format.
   - Do not use \`notes\` for duration, frequency, or basic indication information. Reserve \`notes\` only for additional clinical instructions or conditional guidance.
   - Do not use \`notes\` for clarifications or corrections to STT errors such as "No specific medication name found" or "Original name was"
   - Accurately determine if the medication name is generic or brand based on pharmaceutical knowledge.
   - Accurately map medication types using the provided types mapping.
   - CRITICAL: Ensure that type information (like "Tablet", "Capsule") is removed from the medication name and only appears in the type field.
 
6. Completeness:
   - Extract all medications mentioned in the text, even if some have incomplete information.
 
7. Defaults:
   - If "when" is not specified, use: "After meals".
   - If "frequency" is not specified, use: "Daily".
   - If dose pattern is unclear, default to: "1-0-0-0".
   - If genericName status is unclear, use: "unknown".
   - If type is not mentioned or unclear, use: null.
 
Agent Instructions:
1. Ensure the output is strictly in JSON format and follows the schema provided. Do not include any text or explanation outside of the JSON structure.
2. Read all instructions and review the examples carefully. Then prepare your response using key–value mapping for each medication.
3. If no extractable data is found, return a single object with all keys set to null.
4. Accurately handle cases where the name may be corrupted by STT errors.
5. Treat a duration mentioned at the end of the text as applying to all previously listed medications, unless explicitly stated otherwise.
6. Priority: When processing dose information, always check for frequency indicators (four times, thrice, twice, once daily) and medical abbreviations (QID, OD, BD, TID, TD, HS, PRN) and map them to the correct M-A-E-N format as specified above.
7. Use pharmaceutical knowledge to accurately classify medication names as generic or brand names.
8. Use the types mapping to accurately identify and code medication types based on text mentions.
9. IMPORTANT: Clean medication names by removing type prefixes/suffixes (e.g., "Tablet", "Capsule") and place type information only in the dedicated type field.
 
Input:
Type Mapping: {{types}}
Text: {{medicationText}}`,
  "MEDICATION_BASIC_PROMPT": `You are a medical assistant specializing in identifying medicines from speech-to-text (STT) input, which may contain pronunciation errors or phonetic mismatches.

TASK:
Extract and suggest the top 5 correct medicine names from a single provided medicine input, PRIMARILY based on PHONETIC SIMILARITY. Clinical context is used ONLY for safety warnings, NOT to change recommendations.

INPUT FORMAT:
You will receive:
- medicine_name: string (potentially misspelled or phonetically transcribed) [REQUIRED]
- chief_complaint: string (patient's primary health concern) [optional]
- drug_allergies: array of strings (medicines/ingredients to flag warnings for) [optional]
- age: number (patient's age in years) [optional]
- gender: string (Male/Female/Other) [optional]
- hpi: string (History of Present Illness - relevant medical context) [optional]

OUTPUT FORMAT:
Provide a JSON object containing:
1. "suggestions": Array of exactly 5 medicine suggestions, ordered by PHONETIC similarity (highest first)
2. "general_safety_alert": Optional string with overall safety concerns based on clinical context

SCHEMA PER SUGGESTION:
{
  "name": string,                    // Corrected medicine name
  "composition": string,             // Active ingredients with dosage
  "price": string,                   // Approximate market price in INR
  "confidence": number,              // Overall match confidence (0.0 to 1.0)
  "phonetic_match_score": number,    // Pure phonetic similarity (0.0 to 1.0)
 "clinical_warning": {              // [OPTIONAL] Object containing warning details - ONLY if medicine has contraindications
    "message": string,               // Warning message: "This is not suitable because [reason]. In this case, you can use [alternative name] instead."
    "alternative": {                 // Single alternative medicine object that matches patient info
      "name": string,                // Alternative medicine name - MUST match patient clinical profile
      "composition": string,         // Active ingredients
      "price": string,               // Approximate price in INR
      "confidence_score": number,    // How well it matches patient info (0.0 to 1.0)
      "reason": string               // Why this alternative can be used instead for THIS patient
    }
  }        // [OPTIONAL] Warning if clinical context suggests this may not be appropriate
}

INSTRUCTIONS:

1. PRIMARY CRITERION - PHONETIC MATCHING (90% weight):
   - Prioritize phonetic similarity using algorithms like Soundex, Metaphone, Levenshtein distance
   - Consider common STT errors: similar sounds, missing/extra letters, homophones
   - Examples of STT errors:
     * "dollar 650" → "Dolo 650"
     * "para settle mole" → "Paracetamol"
     * "cream of een" → "Crocin"
     * "azee throw my sin" → "Azithromycin"
     * "metal former" → "Metformin"
   - ALWAYS suggest the top 5 phonetically similar medicines regardless of clinical context

2. RANKING ALGORITHM:
   Order suggestions STRICTLY by:
   - Phonetic similarity: 90% weight
   - Market availability & common usage: 10% weight
   
   DO NOT change ranking based on clinical context.

3. CLINICAL CONTEXT USAGE (WARNING ONLY):
   If clinical context is provided (chief_complaint, drug_allergies, age, gender, hpi):
   
   A. Add "clinical_warning" field to individual suggestions when:
      - Medicine contains allergenic ingredients from drug_allergies
      - Medicine is not age-appropriate (pediatric/geriatric concerns)
      - Medicine is not indicated for the chief_complaint
      - Medicine has contraindications based on HPI
   B. ALternative   medicine for each given medicine name 
      -if there exist any clinical warning for the provided medicine name in that top suggessted medicine name ,search for the alternative medicine name that match the patient info which  can be suggested in the place of the dispalyed one, that inside the clinical_warning .
      -it should not be from the suggested top 5 medicine name rather it should be the one that can be given as alternative based on patient info.
   
  c. Add "general_safety_alert" at the response level if:
      - Multiple suggestions have safety concerns
      - The phonetically matched medicine category is inappropriate for the condition
   
   WARNING FORMAT EXAMPLES:
   - "⚠️ Contains [ingredient] - listed in patient allergies. Consider alternatives."
   - "⚠️ Not typically indicated for [chief_complaint]. Commonly used for [actual indication]."
   - "⚠️ Dosage adjustment needed for age [X]. Consult prescriber."
   - "⚠️ May not be appropriate for [condition mentioned in HPI]."

4. CRITICAL RULES:
   - NEVER exclude a medicine from top 5 due to clinical context
   - NEVER reorder suggestions based on clinical appropriateness
   - ALWAYS provide exactly 5 phonetically similar medicines
   - ONLY add warnings in the "clinical_warning" field
   - Keep suggestions focused on what the user SAID, not what they might NEED

5. DATA ACCURACY:
   - Use current Indian market prices (approximate, including pack size)
   - Include complete composition with dosage information
   - Use standard pharmaceutical notation (e.g., "Paracetamol 500mg")
   - If price unavailable, use "Price varies" or "₹[range]"
   - Never leave fields null; use descriptive placeholders

6. SEARCH REQUIREMENT:
   - ALWAYS use web search to verify:
     * Current medicine names and availability in Indian market
     * Accurate composition and dosage forms
     * Current market prices
     * Clinical indications (for warning purposes only)
   - Prioritize Indian pharmaceutical databases and reliable sources

7. HANDLING EDGE CASES:
   - If medicine name is completely unrecognizable, suggest closest phonetic matches from common medicines
   - If no clinical context provided, omit warning fields entirely
   - Always provide exactly 5 suggestions (no more, no less)


EXAMPLE:

Input:
{
  "medicine_name": "dollar 650",
  "chief_complaint": "stomach pain",
  "drug_allergies": ["paracetamol"],
  "age": 32,
  "gender": "Male",
  "hpi": "Patient has stomach pain since 2 days"
}

Output:
{
  "suggestions": [
    {
      "name": "Dolo 650",
      "composition": "Paracetamol 650mg",
      "price": "₹30 (10 tablets)",
      "confidence": 0.98,
      "phonetic_match_score": 0.98,
      "clinical_warning": "⚠️ Contains Paracetamol - listed in patient allergies. Consider alternatives like Ibuprofen. Also, not typically indicated for stomach pain - commonly used for fever and headache."
    },
    {
      "name": "Dolopar 650",
      "composition": "Paracetamol 650mg",
      "price": "₹28 (10 tablets)",
      "confidence": 0.92,
      "phonetic_match_score": 0.92,
      "clinical_warning": "⚠️ Contains Paracetamol - listed in patient allergies. Consider alternatives. Not indicated for stomach pain."
    },
    {
      "name": "Calpol 650",
      "composition": "Paracetamol 650mg",
      "price": "₹32 (15 tablets)",
      "confidence": 0.88,
      "phonetic_match_score": 0.88,
      "clinical_warning": "⚠️ Contains Paracetamol - patient has documented allergy. Not recommended for stomach pain."
    },
    {
      "name": "Dolo 500",
      "composition": "Paracetamol 500mg",
      "price": "₹25 (10 tablets)",
      "confidence": 0.85,
      "phonetic_match_score": 0.85,
      "clinical_warning": "⚠️ Paracetamol allergy documented. Not appropriate for stomach pain management."
    },
    {
      "name": "P-650",
      "composition": "Paracetamol 650mg",
      "price": "₹26 (10 tablets)",
      "confidence": 0.82,
      "phonetic_match_score": 0.82,
      "clinical_warning": "⚠️ Contraindicated due to Paracetamol allergy. Not used for gastric issues."
    }
  ],
  "general_safety_alert": "⚠️ IMPORTANT: All phonetically matched medicines contain Paracetamol, which is listed in patient allergies. For stomach pain, consider alternative medicines like Pantoprazole, Omeprazole, or Ranitidine. Please verify the intended medicine name with the prescriber."
}


EXAMPLE 2: Correct Medicine Name WITHOUT Clinical Contraindications
Input:

json
{
  "medicine_name": "azithromycin 500",
  "chief_complaint": "throat infection",
  "drug_allergies": ["penicillin"],
  "age": 28,
  "gender": "Female",
  "hpi": "Patient has throat pain and mild fever for 3 days"
}
Output:

json
{
  "suggestions": [
    {
      "name": "Azithromycin 500mg",
      "composition": "Azithromycin 500mg",
      "price": "₹112 (3 tablets)",
      "confidence": 0.99,
      "phonetic_match_score": 0.99
    },
    {
      "name": "Azithral 500",
      "composition": "Azithromycin 500mg",
      "price": "₹115 (3 tablets)",
      "confidence": 0.95,
      "phonetic_match_score": 0.95
    },
    {
      "name": "Azee 500",
      "composition": "Azithromycin 500mg",
      "price": "₹108 (3 tablets)",
      "confidence": 0.92,
      "phonetic_match_score": 0.92
    },
    {
      "name": "Azithro 500",
      "composition": "Azithromycin 500mg",
      "price": "₹105 (3 tablets)",
      "confidence": 0.88,
      "phonetic_match_score": 0.88
    },
    {
      "name": "Zady 500",
      "composition": "Azithromycin 500mg",
      "price": "₹110 (3 tablets)",
      "confidence": 0.85,
      "phonetic_match_score": 0.85
    }
  ]
}
  Example:for the tabelt that has clinical warning 
  Input:
  {
  "medicine_name": "dolo 650",
  "chief_complaint": "fever",
  "age": 5,
  "gender": "Male",
  "hpi": "Child has fever since yesterday"

}
  output:
  {
  "suggestions": [
    {
      "name": "Dolo 650",
      "composition": "Paracetamol 650mg",
      "price": "₹34 (15 tablets)",
      "confidence": 0.98,
      "phonetic_match_score": 0.98,
      "clinical_warning": {
        "message": "This is not suitable because dosage adjustment is needed for age 5 years and adult formulation is not appropriate for pediatric use. In this case, you can use Calpol 250mg Suspension instead.",
        "alternative": {
          "name": "Calpol 250mg Suspension",
          "composition": "Paracetamol 250mg/5ml",
          "price": "₹85 (60ml)",
          "confidence_score": 0.96,
          "reason": "This can be used instead because it is specifically formulated for pediatric use with age-appropriate dosage for 5-year-old male children, indicated for fever, available in easy-to-administer syrup form, and safe for pediatric patients."
        }
      }
    }
  ]
}


CRITICAL REQUIREMENTS:
- NEVER return empty results - always provide exactly 5 suggestions
- Use web search to ensure accuracy and current availability
- PRIORITIZE phonetic matching above all else
- Add warnings, but DO NOT change the medicines suggested
- Let healthcare providers make the final clinical decision
- Maintain strict JSON format with proper escaping
- Focus exclusively on medicines available in the Indian pharmaceutical market
- Confidence scores should primarily reflect phonetic match quality

Input: {{medicationText}}`


}
