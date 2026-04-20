export interface PromptNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai' | 'delay';
  selectedValue?: string;
  conditionOperator?: string;
  conditionValues?: string[];
  configValues?: Record<string, string>;
  configured: boolean;
}

export interface PromptEdge {
  from: string;
  to: string;
  branch?: string;
}

export interface PromptLibraryItem {
  id: string;
  label: string;
  type: string;
  category: string;
}

export interface PromptConfigField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

// ─── Global prompt (bottom composer) ─────────────────────────────────────────

export function buildGlobalSystemPrompt(options: {
  nodes: PromptNode[];
  edges: PromptEdge[];
  editingNodeIds: Set<string>;
  libraryItems: PromptLibraryItem[];
  nodeConfig: Record<string, PromptConfigField[]>;
}): string {
  const { nodes, edges, editingNodeIds, libraryItems, nodeConfig } = options;

  const parts: string[] = [];

  // 1. Role
  parts.push(
    `You are an automation flow builder assistant for Teambridge, a workforce management platform.
Your job is to interpret the user's natural-language request and call the appropriate tools to create or modify a visual automation workflow.
You may call multiple tools in a single response — do so whenever the request requires multiple steps.
Always prefer making tool calls over giving explanations. If the request is ambiguous, make your best determination and proceed.
After making changes, provide a brief one-sentence summary of what you did.`,
  );

  // 2. Current flow state
  if (nodes.length === 0) {
    parts.push(`\nCURRENT FLOW: empty (no nodes yet)`);
  } else {
    const nodeLines = nodes.map(n => {
      const cfg = n.configValues && Object.keys(n.configValues).length > 0
        ? ` config=${JSON.stringify(n.configValues)}`
        : '';
      const cond = n.conditionOperator
        ? ` operator="${n.conditionOperator}" values=${JSON.stringify(n.conditionValues ?? [])}`
        : '';
      return `  node id="${n.id}" type="${n.type}" selected="${n.selectedValue ?? 'unconfigured'}"${cfg}${cond}`;
    });
    const edgeLines = edges.map(e =>
      `  ${e.from} → ${e.to}${e.branch ? ` (${e.branch} branch)` : ''}`,
    );
    parts.push(`\nCURRENT FLOW:\n${nodeLines.join('\n')}\nEdges:\n${edgeLines.join('\n')}`);
  }

  // 3. Editing hint
  if (editingNodeIds.size > 0) {
    parts.push(
      `\nUSER-SELECTED NODES FOR EDITING: ${[...editingNodeIds].join(', ')}\n` +
      `Prioritize modifying these nodes unless the request clearly creates entirely new steps.`,
    );
  }

  // 4. Available library items grouped by type
  const byType: Record<string, string[]> = { trigger: [], condition: [], action: [], ai: [], delay: [] };
  for (const item of libraryItems) {
    byType[item.type]?.push(item.label);
  }
  parts.push(
    `\nAVAILABLE LIBRARY ITEMS:\n` +
    `TRIGGERS (use type="trigger"):\n  ${byType.trigger.join(', ')}\n\n` +
    `CONDITIONS (use type="condition"):\n  ${byType.condition.join(', ')}\n\n` +
    `ACTIONS (use type="action"):\n  ${byType.action.join(', ')}\n\n` +
    `AI (use type="ai"):\n  ${byType.ai.join(', ')}`,
  );

  // 5. Node config schemas
  const configEntries = Object.entries(nodeConfig).filter(([, fields]) => fields.length > 0);
  if (configEntries.length > 0) {
    const schemaLines: string[] = ['\nNODE CONFIGURATION SCHEMAS:'];
    // Find label for each id
    const idToLabel = Object.fromEntries(libraryItems.map(i => [i.id, i.label]));
    for (const [id, fields] of configEntries) {
      const label = idToLabel[id] ?? id;
      schemaLines.push(`\n${label} (id: ${id}):`);
      for (const f of fields) {
        const req = f.required ? 'required' : 'optional';
        const opts = f.options && f.options.length > 0 ? ` | options: ${f.options.slice(0, 20).join(' | ')}` : '';
        schemaLines.push(`  ${f.key} (${f.type}, ${req})${opts}`);
      }
    }
    parts.push(schemaLines.join('\n'));
  }

  // 6. Rules
  parts.push(`
RULES:
- A flow must start with a trigger node.
- Conditions come after triggers. Actions and AI steps come after conditions or triggers.
- Actions and AI steps cannot connect into conditions.
- You may add multiple nodes in one response by calling add_node repeatedly.
- For parent_node_id: use an existing node id. The first node is typically the trigger.
- For select fields, always use a value from the listed options.
- Never invent node ids — only use ids shown in the current flow.
- When adding a new node, you can immediately follow with set_config_field calls for that node's parent id won't work for the new node since you don't know its id yet. Instead: add_node sets the selected_value directly, and you configure existing nodes with set_config_field using their known ids.`);

  return parts.join('\n');
}

// ─── Step prompt (popover composer) ──────────────────────────────────────────

export function buildStepSystemPrompt(options: {
  step: PromptNode;
  libraryItemsForType: PromptLibraryItem[];
  configFields: PromptConfigField[];
  conditionOperators?: string[];
  conditionValueOptions?: string[];
}): string {
  const { step, libraryItemsForType, configFields, conditionOperators, conditionValueOptions } = options;

  const parts: string[] = [];

  // 1. Role
  parts.push(
    `You are a step configuration assistant for a Teambridge automation workflow.
You are working on a single step of type "${step.type}".
Call the appropriate tools to configure this step based on the user's request.
Make tool calls — do not just explain what to do. Provide a brief confirmation after.`,
  );

  // 2. Current step state
  const cfg = step.configValues && Object.keys(step.configValues).length > 0
    ? `\n  config: ${JSON.stringify(step.configValues)}`
    : '';
  const cond = step.conditionOperator
    ? `\n  operator: "${step.conditionOperator}", values: ${JSON.stringify(step.conditionValues ?? [])}`
    : '';
  parts.push(
    `\nCURRENT STEP:\n  id: ${step.id}\n  type: ${step.type}\n  selected: "${step.selectedValue ?? 'not selected yet'}"${cfg}${cond}`,
  );

  // 3. Available items for this step type
  const labels = libraryItemsForType.map(i => i.label).join(', ');
  parts.push(`\nAVAILABLE ${step.type.toUpperCase()} ITEMS (pass exact label to select_step_value):\n  ${labels}`);

  // 4. Config schema (if step is configured and has fields)
  if (configFields.length > 0) {
    const fieldLines = configFields.map(f => {
      const req = f.required ? 'required' : 'optional';
      const opts = f.options && f.options.length > 0 ? ` | options: ${f.options.slice(0, 20).join(' | ')}` : '';
      return `  ${f.key} (${f.type}, ${req})${opts}`;
    });
    parts.push(`\nCONFIGURATION FIELDS FOR "${step.selectedValue}":\n${fieldLines.join('\n')}`);
  }

  // 5. Condition operators
  if (conditionOperators && conditionOperators.length > 0) {
    parts.push(`\nVALID OPERATORS FOR THIS CONDITION:\n  ${conditionOperators.join(', ')}`);
    if (conditionValueOptions && conditionValueOptions.length > 0) {
      parts.push(`VALID VALUES:\n  ${conditionValueOptions.join(', ')}`);
    }
  }

  return parts.join('\n');
}
