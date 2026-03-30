import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface AgentToolCall {
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface AgentResult {
  toolCalls: AgentToolCall[];
  textBlocks: string[];
}

export async function callFlowAgent(options: {
  systemPrompt: string;
  userMessage: string;
  tools: Anthropic.Tool[];
  maxTokens?: number;
}): Promise<AgentResult> {
  const { systemPrompt, userMessage, tools, maxTokens = 1024 } = options;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    tools,
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolCalls: AgentToolCall[] = [];
  const textBlocks: string[] = [];

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      toolCalls.push({
        toolName: block.name,
        toolInput: block.input as Record<string, unknown>,
      });
    } else if (block.type === 'text') {
      textBlocks.push(block.text);
    }
  }

  return { toolCalls, textBlocks };
}
