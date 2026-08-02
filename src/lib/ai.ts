import { GoogleGenAI } from '@google/genai';
import type { Trade } from '../types/database';

// Initialize the Gemini client
// Note: In a production app, it's safer to call the API from a backend to hide the API key.
// Since this is a personal app, we can use the environment variable directly.
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

export const analyzeTrade = async (trade: Trade): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables.');
  }

  const prompt = `
You are an expert trading coach and analyst. Please analyze the following trade and provide constructive feedback. 
Focus on identifying potential reasons for the result, highlighting mistakes, and giving actionable advice for future trades.
Keep your response concise, professional, and formatted in markdown.

Trade Details:
- Pair: ${trade.pair}
- Market: ${trade.market}
- Direction: ${trade.direction}
- Timeframe: ${trade.timeframe}
- Entry Price: ${trade.entry_price}
- Stop Loss: ${trade.stop_loss}
- Take Profit: ${trade.take_profit}
- Exit Price: ${trade.exit_price || 'N/A'}
- Result: ${trade.result}
- PnL: $${trade.pnl_nominal}
- Setup Tags: ${trade.setup_tags?.join(', ') || 'None'}
- Mistakes: ${trade.mistakes?.join(', ') || 'None'}
- Emotion: ${trade.emotion || 'N/A'}
- Notes: ${trade.notes || 'None'}

Please provide:
1. Analysis of the trade outcome.
2. Feedback on the mistakes and emotion recorded.
3. Actionable advice for the next trade.
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
    });
    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    throw new Error('Failed to generate AI analysis. Please check your API key and try again.');
  }
};
