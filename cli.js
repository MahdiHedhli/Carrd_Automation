#!/usr/bin/env node

/**
 * CLI for Carrd Automation
 *
 * Usage:
 *   node cli.js create "My Site" --publish
 *   node cli.js create "My Site" --template landing
 *   node cli.js update "My Site" --style '{"backgroundColor":"#1a1a2e"}'
 *   node cli.js inspect "My Site"
 */

import { createCarrdSite, updateCarrdSite, inspectSite } from './src/claude-integration.js';

const args = process.argv.slice(2);
const command = args[0];
const siteName = args[1];

function parseFlag(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

// ─── Predefined Templates ────────────────────────────────────

const templates = {
  landing: {
    sections: [
      {
        elements: [
          { type: 'heading', content: 'Your Headline Here' },
          { type: 'text', content: 'A compelling description of your product or service.' },
          { type: 'button', label: 'Get Started', url: '#' },
        ],
      },
      {
        elements: [
          { type: 'divider' },
          { type: 'heading', content: 'Features' },
          { type: 'text', content: 'Feature 1: Describe your first key feature.' },
          { type: 'text', content: 'Feature 2: Describe your second key feature.' },
          { type: 'text', content: 'Feature 3: Describe your third key feature.' },
        ],
      },
      {
        elements: [
          { type: 'divider' },
          { type: 'heading', content: 'Get in Touch' },
          { type: 'form', formType: 'contact' },
        ],
      },
    ],
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
      accentColor: '#2563eb',
    },
  },

  portfolio: {
    sections: [
      {
        elements: [
          { type: 'heading', content: 'Your Name' },
          { type: 'text', content: 'Designer / Developer / Creator' },
          { type: 'icon' },
        ],
      },
      {
        elements: [
          { type: 'heading', content: 'Selected Work' },
          { type: 'gallery' },
        ],
      },
      {
        elements: [
          { type: 'heading', content: 'Contact' },
          { type: 'text', content: 'hello@example.com' },
          { type: 'button', label: 'Email Me', url: 'mailto:hello@example.com' },
        ],
      },
    ],
    styling: {
      backgroundColor: '#0a0a0a',
      textColor: '#ffffff',
      accentColor: '#f97316',
    },
  },

  linktree: {
    sections: [
      {
        elements: [
          { type: 'image', src: '' },
          { type: 'heading', content: '@yourhandle' },
          { type: 'text', content: 'Your bio goes here' },
          { type: 'button', label: 'Website', url: '#' },
          { type: 'button', label: 'Twitter', url: '#' },
          { type: 'button', label: 'Instagram', url: '#' },
          { type: 'button', label: 'YouTube', url: '#' },
          { type: 'button', label: 'Newsletter', url: '#' },
        ],
      },
    ],
    styling: {
      backgroundColor: '#1a1a2e',
      textColor: '#eaeaea',
      accentColor: '#e94560',
    },
  },

  countdown: {
    sections: [
      {
        elements: [
          { type: 'heading', content: 'Something Big is Coming' },
          { type: 'timer' },
          { type: 'text', content: 'Sign up to be the first to know.' },
          { type: 'form', formType: 'signup' },
        ],
      },
    ],
    styling: {
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
    },
  },
};

// ─── Commands ────────────────────────────────────────────────

async function main() {
  if (!command) {
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'create': {
      if (!siteName) {
        console.error('Error: Site name is required');
        process.exit(1);
      }

      const templateName = parseFlag('--template') || 'landing';
      const template = templates[templateName];

      if (!template) {
        console.error(`Unknown template: ${templateName}`);
        console.error(`Available: ${Object.keys(templates).join(', ')}`);
        process.exit(1);
      }

      const styleOverride = parseFlag('--style');
      const styling = styleOverride ? { ...template.styling, ...JSON.parse(styleOverride) } : template.styling;

      console.log(`Creating site "${siteName}" with template "${templateName}"...`);
      const result = await createCarrdSite({
        name: siteName,
        subdomain: parseFlag('--subdomain'),
        sections: template.sections,
        styling,
        publish: hasFlag('--publish'),
      });

      console.log('\nResult:', JSON.stringify(result, null, 2));
      break;
    }

    case 'update': {
      if (!siteName) {
        console.error('Error: Site name is required');
        process.exit(1);
      }

      const styleJson = parseFlag('--style');
      const styling = styleJson ? JSON.parse(styleJson) : undefined;

      console.log(`Updating site "${siteName}"...`);
      const result = await updateCarrdSite({
        name: siteName,
        styling,
        publish: hasFlag('--publish'),
      });

      console.log('\nResult:', JSON.stringify(result, null, 2));
      break;
    }

    case 'inspect': {
      if (!siteName) {
        console.error('Error: Site name is required');
        process.exit(1);
      }

      console.log(`Inspecting site "${siteName}"...`);
      const result = await inspectSite(siteName);
      console.log('\nResult:', JSON.stringify(result, null, 2));
      break;
    }

    case 'templates': {
      console.log('Available templates:');
      for (const [name, tmpl] of Object.entries(templates)) {
        const elementCount = tmpl.sections.reduce((sum, s) => sum + s.elements.length, 0);
        console.log(`  ${name} - ${tmpl.sections.length} section(s), ${elementCount} element(s)`);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function printUsage() {
  console.log(`
Carrd Automation CLI

Usage:
  node cli.js create <name> [options]   Create a new site
  node cli.js update <name> [options]   Update an existing site
  node cli.js inspect <name>            Screenshot & inspect a site
  node cli.js templates                 List available templates

Options:
  --template <name>    Template to use (landing, portfolio, linktree, countdown)
  --subdomain <name>   Subdomain for publishing
  --style '<json>'     Style overrides as JSON
  --publish            Publish site after creation/update

Examples:
  node cli.js create "My Landing Page" --template landing --publish
  node cli.js create "Links" --template linktree --subdomain mylinks
  node cli.js update "My Site" --style '{"backgroundColor":"#000"}'
  node cli.js inspect "My Site"
  `);
}

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
