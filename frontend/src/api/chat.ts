import { http } from './http';

export async function sendChatMessage(message: string, conversationId?: string) {
  const { data } = await http.post('/chat', { message, conversationId });
  return data;
}
