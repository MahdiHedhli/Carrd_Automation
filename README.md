# Carrd Automation

Playwright-based automation for creating websites on [Carrd.co](https://carrd.co) via AI agents (Claude, OpenAI Codex, Google Antigravity, etc.).

Since Carrd has no public API, this project uses browser automation to control Carrd's native editor — no custom embed boxes, just real Carrd elements and controls.

## Architecture

```
AI Agent (Claude/Codex/etc.)
    ↓ generates site spec
MCP Server or CLI
    ↓ translates to commands
Playwright Automation
    ↓ controls browser
Carrd.co Editor
    → creates/edits/publishes site
```

### Components

| File | Purpose |
|------|---------|
| `src/carrd-automation.js` | Core Playwright class — login, create sites, add elements, style, publish |
| `src/claude-integration.js` | High-level spec-to-automation translation for AI agents |
| `mcp/carrd-mcp-server.js` | MCP server wrapping automation as Claude-callable tools |
| `cli.js` | CLI with predefined templates and style overrides |

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your Carrd credentials
```

## Usage

### CLI

```bash
# Create a landing page
node cli.js create "My Site" --template landing --publish

# Create a link-in-bio page
node cli.js create "Links" --template linktree --subdomain mylinks

# Update styling
node cli.js update "My Site" --style '{"backgroundColor":"#000"}'

# Inspect a site (takes screenshot)
node cli.js inspect "My Site"

# List templates
node cli.js templates
```

### Available Templates

- **landing** — Hero section, features, contact form
- **portfolio** — Name/title, gallery, contact
- **linktree** — Profile image, bio, link buttons
- **countdown** — Coming soon with timer and signup

### MCP Server (for Claude)

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "carrd": {
      "command": "node",
      "args": ["mcp/carrd-mcp-server.js"],
      "cwd": "/path/to/Carrd_Automation"
    }
  }
}
```

Then Claude can use these tools:
- `create_carrd_site` — Build a new site from a spec
- `update_carrd_site` — Modify an existing site
- `inspect_carrd_site` — Screenshot current editor state

### Programmatic

```javascript
import { createCarrdSite } from './src/claude-integration.js';

const result = await createCarrdSite({
  name: 'My Portfolio',
  styling: {
    backgroundColor: '#0a0a0a',
    textColor: '#ffffff',
    accentColor: '#f97316',
  },
  sections: [
    {
      elements: [
        { type: 'heading', content: 'Jane Doe' },
        { type: 'text', content: 'Product Designer' },
        { type: 'button', label: 'View Work', url: '#work' },
      ],
    },
  ],
  publish: true,
  subdomain: 'janedoe',
});
```

## Supported Carrd Elements

| Element | Type Key | Notes |
|---------|----------|-------|
| Text | `text`, `heading` | Any text content |
| Image | `image` | URL or local file upload |
| Button | `button` | Label + link URL |
| Form | `form` | Contact, signup, etc. (Pro) |
| Icon | `icon` | Icon library |
| Video | `video` | Embed by URL |
| Gallery | `gallery` | Image grid |
| Timer | `timer` | Countdown |
| List | `list` | Bullet/numbered |
| Table | `table` | Data table |
| Divider | `divider` | Visual separator |
| Embed | `embed` | Custom HTML/code (Pro) |

## Important Notes

- **Selectors are fragile**: Carrd may update their UI at any time. If automation breaks, inspect the Carrd editor and update CSS selectors in `src/carrd-automation.js`.
- **Screenshots**: Every action saves a screenshot to `./screenshots/` for debugging.
- **Headless mode**: Set `HEADLESS=false` in `.env` to watch the browser as it works.
- **Rate limiting**: The `SLOW_MO` setting adds delay between actions (default 50ms).

## Testing

```bash
npm test
```
