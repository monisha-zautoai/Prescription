import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CanopusService } from './canopus.service';
type CanopusVoice = "meera" | "pavithra" | "maitreyi" | "arvind" | "amol" | "amartya";

@Controller('canopus')
export class CanopusController {
  constructor(private readonly canopusService: CanopusService) {}
  

  // -------------------- Text Generation --------------------
  @Post('text')
  async generateText(@Body() body: { prompt: string; model: string }) {
    const { prompt, model } = body;
    const result = await this.canopusService.callTextModel(prompt, model);
    return { result };
  }

  // -------------------- Text-to-Speech --------------------
  


@Post('tts')
async generateTTS(
  @Body() body: { text: string; model: string; language?: string; voice?: CanopusVoice }
) {
  const { text, model, language, voice } = body;

  if (!text || !model) {
    return { error: 'Text and model are required' };
  }

  // Provide default values for language and voice
  const lang = (language as any) || 'en-IN';
  const speaker: CanopusVoice = voice || 'meera';  

  const audioData = await this.canopusService.callTTS(
    model,
    text,
    lang,
    speaker
  );

  return { audioData };
}


  // -------------------- Speech-to-Text --------------------
  @Post('stt')
  @UseInterceptors(FileInterceptor('file'))
  async generateSTT(@UploadedFile() file: Express.Multer.File, @Body() body: { model: string; prompt?: string }) {
    if (!file || !body.model) {
      return { error: 'Audio file and model are required' };
    }

    // const transcription = await this.canopusService.callSTT(
    //   body.model,
    //   file.buffer,
    //   body.prompt
    // );

    // return { transcription };
  }
}
