import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

type GuardState = {
  active: boolean;
  prompt: string;
};

const recommendationQuestionPatterns = [
  /뭐가\s*좋을까/i,
  /뭐가\s*나을까/i,
  /어떤\s*(게|것이)?\s*좋/i,
  /어떻게\s*할까/i,
  /추천(?:해|해줘|해줄래|을|은|좀)?/i,
  /이름.*바꾸.*(?:좋|나을|추천|어떨)/i,
  /네\s*생각/i,
  /what\s+do\s+you\s+think/i,
  /what\s+would\s+you\s+recommend/i,
  /recommend(?:ation|ed)?/i,
  /which\s+(?:one\s+)?(?:is\s+)?better/i,
  /what\s+should\s+(?:i|we)\s+(?:use|choose|do|name)/i,
  /suggest(?:ion|ed)?/i,
];

const explicitApprovalPatterns = [
  /\bok(?:ay)?\b.*(?:진행|적용|해줘|go|proceed|apply)/i,
  /\b(?:apply|proceed|continue|do it|use it|use that|go ahead)\b/i,
  /(?:진행|적용|반영)해(?:줘|주세요)?/i,
  /그걸로\s*(?:해|적용|진행)/i,
  /이걸로\s*(?:해|적용|진행)/i,
  /\d+번(?:으로)?\s*(?:해|적용|진행)/i,
  /option\s*\d+.*(?:apply|use|proceed)/i,
];

const mutatingBashPatterns = [
  /(^|[;&|]\s*)rm\s+/,
  /(^|[;&|]\s*)mv\s+/,
  /(^|[;&|]\s*)cp\s+/,
  /(^|[;&|]\s*)mkdir\s+/,
  /(^|[;&|]\s*)touch\s+/,
  /(^|[;&|]\s*)chmod\s+/,
  /(^|[;&|]\s*)chown\s+/,
  /(^|[;&|]\s*)ln\s+/,
  /(^|[;&|]\s*)install\s+/,
  /(^|[;&|]\s*)(npm|pnpm|yarn|bun)\s+(install|add|remove|rm|update|upgrade)\b/,
  /(^|[;&|]\s*)git\s+(add|commit|push|reset|checkout|switch|branch|merge|rebase|cherry-pick|stash|clean|mv|rm)\b/,
  />\s*[^\s]/,
  />>\s*[^\s]/,
  /\bpython3?\s+-c\s+['"].*(write_text|open\([^)]*['"]w|unlink\(|rename\(|mkdir\()/,
  /\bnode\s+-e\s+['"].*(writeFile|rmSync|renameSync|mkdirSync|appendFile)/,
];

function isRecommendationQuestion(text: string): boolean {
  return recommendationQuestionPatterns.some((pattern) => pattern.test(text));
}

function hasExplicitApproval(text: string): boolean {
  return explicitApprovalPatterns.some((pattern) => pattern.test(text));
}

function isMutatingTool(toolName: string, input: unknown): boolean {
  if (toolName === 'write' || toolName === 'edit') return true;

  if (toolName !== 'bash') return false;
  if (!input || typeof input !== 'object' || !('command' in input)) return false;

  const command = (input as { command?: unknown }).command;
  if (typeof command !== 'string') return false;

  return mutatingBashPatterns.some((pattern) => pattern.test(command));
}

function buildReason(state: GuardState, toolName: string): string {
  return [
    `Blocked ${toolName} because the current user prompt looks like a recommendation/question request, not implementation approval.`,
    'Answer the question, provide options/recommendation, and ask for explicit confirmation before modifying files.',
    '',
    `Prompt: ${state.prompt}`,
  ].join('\n');
}

export default function (pi: ExtensionAPI) {
  let state: GuardState = { active: false, prompt: '' };

  pi.on('before_agent_start', async (event) => {
    const prompt = event.prompt ?? '';
    state = {
      active: isRecommendationQuestion(prompt) && !hasExplicitApproval(prompt),
      prompt,
    };

    if (!state.active) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\nQuestion-before-action guard is active for this turn: the user appears to be asking for a recommendation or naming choice, not approving implementation. Do not modify files or run mutating commands. Answer the question first and ask for explicit confirmation before applying changes.`,
    };
  });

  pi.on('agent_end', async () => {
    state = { active: false, prompt: '' };
  });

  pi.on('tool_call', async (event, ctx) => {
    if (!state.active) return;
    if (!isMutatingTool(event.toolName, event.input)) return;

    const reason = buildReason(state, event.toolName);
    if (ctx.hasUI) ctx.ui.notify(reason, 'warning');

    return {
      block: true,
      reason,
    };
  });
}
