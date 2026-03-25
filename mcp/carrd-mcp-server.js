/**
 * Carrd MCP Server
 *
 * Exposes Carrd automation as MCP tools that Claude (or any MCP client)
 * can call natively. This bridges the gap between AI agents and
 * Carrd's web interface via Playwright automation.
 *
 * Usage: node mcp/carrd-mcp-server.js
 * Then configure your MCP client to connect to this server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createCarrdSite, updateCarrdSite, inspectSite } from '../src/claude-integration.js';

const server = new Server(
  {
    name: 'carrd-automation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── Tool Definitions ────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_carrd_site',
      description:
        'Create a new website on Carrd.co using native Carrd tools. ' +
        'Provide a site specification with name, sections, styling, and elements. ' +
        'Supports text, images, buttons, forms, videos, galleries, timers, lists, tables, dividers, icons, and embeds.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the new site',
          },
          subdomain: {
            type: 'string',
            description: 'Subdomain for publishing (e.g., "mysite" → mysite.carrd.co)',
          },
          styling: {
            type: 'object',
            description: 'Global site styling',
            properties: {
              backgroundColor: { type: 'string', description: 'Hex color (e.g., "#ffffff")' },
              textColor: { type: 'string', description: 'Hex color for text' },
              accentColor: { type: 'string', description: 'Hex color for accents/links' },
              fontFamily: { type: 'string', description: 'Font name (e.g., "Inter", "Roboto")' },
            },
          },
          sections: {
            type: 'array',
            description: 'Array of sections, each with an elements array',
            items: {
              type: 'object',
              properties: {
                elements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: [
                          'text', 'heading', 'image', 'button', 'form',
                          'divider', 'icon', 'video', 'gallery', 'timer',
                          'list', 'table', 'embed',
                        ],
                      },
                      content: { type: 'string', description: 'Text content' },
                      src: { type: 'string', description: 'Image/video URL or path' },
                      label: { type: 'string', description: 'Button label' },
                      url: { type: 'string', description: 'Button link URL' },
                      formType: { type: 'string', description: 'Form type (contact, signup, etc.)' },
                      code: { type: 'string', description: 'Embed code/HTML' },
                      properties: {
                        type: 'object',
                        description: 'Additional element properties',
                      },
                    },
                    required: ['type'],
                  },
                },
              },
            },
          },
          publish: {
            type: 'boolean',
            description: 'Whether to publish the site after creation',
            default: false,
          },
        },
        required: ['name', 'sections'],
      },
    },
    {
      name: 'update_carrd_site',
      description:
        'Update an existing Carrd.co website. Modify styling, text content, or element properties.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the existing site to update',
          },
          styling: {
            type: 'object',
            description: 'Updated styling options',
            properties: {
              backgroundColor: { type: 'string' },
              textColor: { type: 'string' },
              accentColor: { type: 'string' },
              fontFamily: { type: 'string' },
            },
          },
          updates: {
            type: 'array',
            description: 'Element updates to apply',
            items: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector for the element' },
                text: { type: 'string', description: 'New text content' },
                properties: { type: 'object', description: 'Properties to update' },
              },
            },
          },
          publish: {
            type: 'boolean',
            description: 'Re-publish after updating',
            default: false,
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'inspect_carrd_site',
      description:
        'Take a screenshot and get metadata of an existing Carrd site in the editor. ' +
        'Useful for checking current state before making updates.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the site to inspect',
          },
        },
        required: ['name'],
      },
    },
  ],
}));

// ─── Tool Execution ──────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'create_carrd_site':
        result = await createCarrdSite(args);
        break;

      case 'update_carrd_site':
        result = await updateCarrdSite(args);
        break;

      case 'inspect_carrd_site':
        result = await inspectSite(args.name);
        break;

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start Server ────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Carrd MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
