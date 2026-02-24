import { EmailConfig, GeneratedEmail } from '../types';

export const generateEmailTemplate = async (config: EmailConfig): Promise<GeneratedEmail> => {
  try {
    const res = await fetch('/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Send cookies (auth token)
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || 'Generation failed');
    }

    const result = await res.json();
    return result as GeneratedEmail;
  } catch (error: any) {
    console.error('Generation Error:', error);
    throw new Error(error.message || 'AI generation failed.');
  }
};
