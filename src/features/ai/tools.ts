import type Anthropic from '@anthropic-ai/sdk';

export const GLOBAL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'add_node',
    description:
      'Add a new step node to the automation flow after an existing node. ' +
      'You may call this multiple times in a single response to build a complete flow. ' +
      'After adding a node, call set_config_field separately to fill in its config fields.',
    input_schema: {
      type: 'object' as const,
      required: ['type', 'parent_node_id', 'selected_value'],
      properties: {
        type: {
          type: 'string',
          enum: ['trigger', 'condition', 'action', 'ai', 'delay'],
          description: 'The step type to add.',
        },
        parent_node_id: {
          type: 'string',
          description:
            'The id of the existing node this new node connects after. ' +
            'Use the node ids from the current flow context. ' +
            'Pass the string "null" only when adding the very first trigger to an empty flow.',
        },
        selected_value: {
          type: 'string',
          description:
            'The exact label of the library item to select for this node. ' +
            'Must match one of the available labels for the given type.',
        },
        branch: {
          type: 'string',
          enum: ['yes', 'no'],
          description: 'For condition nodes only — which branch this node hangs on.',
        },
      },
    },
  },
  {
    name: 'update_node',
    description:
      'Change the selected library item of an existing node. ' +
      'Use this to swap a trigger, condition, or action, or to configure an unconfigured node.',
    input_schema: {
      type: 'object' as const,
      required: ['node_id', 'selected_value'],
      properties: {
        node_id: {
          type: 'string',
          description: 'The id of the node to update.',
        },
        selected_value: {
          type: 'string',
          description: 'The exact label of the library item to set.',
        },
      },
    },
  },
  {
    name: 'set_config_field',
    description:
      'Set one configuration field value on an existing node. ' +
      'Call once per field. Field keys and valid option values are in the node config schema.',
    input_schema: {
      type: 'object' as const,
      required: ['node_id', 'field_key', 'value'],
      properties: {
        node_id: {
          type: 'string',
          description: 'The id of the node whose config field to update.',
        },
        field_key: {
          type: 'string',
          description: "The key of the config field (e.g. 'entity', 'send_to_type', 'message').",
        },
        value: {
          type: 'string',
          description: 'The value to set. For select fields, must be one of the listed options.',
        },
      },
    },
  },
  {
    name: 'delete_node',
    description: 'Remove a node from the flow. Use only when the user explicitly asks to remove a step.',
    input_schema: {
      type: 'object' as const,
      required: ['node_id'],
      properties: {
        node_id: {
          type: 'string',
          description: 'The id of the node to delete.',
        },
      },
    },
  },
];

export const STEP_TOOLS: Anthropic.Tool[] = [
  {
    name: 'select_step_value',
    description:
      'Select which library item this step represents. ' +
      'Use this to choose or change the trigger/condition/action/AI item for this specific step.',
    input_schema: {
      type: 'object' as const,
      required: ['value'],
      properties: {
        value: {
          type: 'string',
          description:
            'The exact label of the library item to select. ' +
            'Must match one of the available options for this step type.',
        },
      },
    },
  },
  {
    name: 'set_condition_config',
    description:
      'Set the operator and comparison values for a condition step. ' +
      'Only valid when the step type is "condition" and a condition item has been selected.',
    input_schema: {
      type: 'object' as const,
      required: ['operator', 'values'],
      properties: {
        operator: {
          type: 'string',
          description: 'The comparison operator. Must be one of the valid operators for this condition.',
        },
        values: {
          type: 'array',
          items: { type: 'string' },
          description: 'The comparison values. Use an empty array for operators that take no value.',
        },
      },
    },
  },
  {
    name: 'set_step_config_field',
    description:
      'Set a single configuration field on this step. ' +
      'Call once per field. Field keys and valid values are listed in the system prompt.',
    input_schema: {
      type: 'object' as const,
      required: ['field_key', 'value'],
      properties: {
        field_key: {
          type: 'string',
          description: "The key of the config field (e.g. 'subject', 'message', 'entity').",
        },
        value: {
          type: 'string',
          description: 'The value to set.',
        },
      },
    },
  },
];
