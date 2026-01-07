# h

CLI helper tools for development workflows.

## Installation

The `h` CLI is automatically installed/updated via zsh function when you first run it:

```bash
h --help
```

## Development

Install dependencies:

```bash
bun install
```

Run in dev mode:

```bash
bun run dev
```

Build binary:

```bash
bun run build
```

## Release

This project uses its own `release` command for releasing new versions:

```bash
bun run release
# or
h release
```

The release process:
1. Increments version (patch/minor/major)
2. Runs format → lint → build
3. Commits and tags with new version
4. Pushes to GitHub
5. GitHub Actions automatically builds binaries and creates release

See [RELEASE_GUIDE.md](RELEASE_GUIDE.md) for detailed documentation.

## Configuration

The `.hrc` file contains release configuration:

```json
{
  "release": {
    "versionFile": "package.json",
    "preRelease": ["bun run format", "bun run lint", "bun run build"],
    "postRelease": []
  }
}
```

## Commands

Run `h --help` to see all available commands:

- `h k` - Kubectl helpers
- `h azs` - Azure subscription switcher
- `h commit` - AI-powered commit message generator
- `h branch-diff` - AI branch diff reports
- `h z` - Zsh config manager
- `h release` - Automated release workflow
- And more...

## Built with

- [Bun](https://bun.com) - Fast JavaScript runtime
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
