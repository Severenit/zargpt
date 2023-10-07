import OpenAIApi from "openai";
import config from 'config';
import { createReadStream } from 'fs';
class OpenAI {
  roles = {
    ASSISTANT: 'assistant',
    USER: 'user',
    SYSTEM: 'system',
    FUNCTION: 'function'
  }
  constructor() {
    this.openai = new OpenAIApi({
      apiKey: config.get('OPENAI_API_KEY'),
    });
  }

  async chat(messages) {
    try {
      const response = await this.openai.chat.completions.create({
        messages,
        model: "gpt-3.5-turbo",
      });
      console.log('####: re', response);
      return response.choices[0].message;
    } catch (e) {
      console.log('Error while gpt chat ', e.message);
    }
  }

  async transcription(filepath) {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: createReadStream(filepath),
        model: 'whisper-1'
      });

      return response.text;
    } catch (e) {
      console.log('Error while transcription ', e.message);
    }
  }

}

export const openai = new OpenAI();
