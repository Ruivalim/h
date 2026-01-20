# Changelog

All notable changes to this project will be documented in this file.






## [0.6.3] - 2026-01-20

## 🎉 Highlights

This release introduces the `re-add` command for dotfiles management, making it easier to sync modified local files back to your dotfiles repository. Additionally, all interactive prompts now handle Ctrl+C gracefully, providing a cleaner user experience when cancelling operations.

## ✨ What's New

### Dotfiles Management
- **New `re-add` command**: Quickly sync modified local dotfiles back to your repository with `h dots re-add` (or `h dots readd`). The command scans for locally modified files, lets you select which ones to update, and automatically commits and pushes changes.
- **Improved Ctrl+C handling**: All interactive prompts (confirmations, checkboxes, selects) now exit gracefully when interrupted, instead of throwing unhandled errors.

### Shell Completions
- **Zsh completions for dots commands**: Full autocompletion support for all `h dots` subcommands including the new `re-add` command. File path completion is now available for `dots add` and `dots rm` commands.

## 🔧 Technical Changes

- Added `isExitError()` and `exitGracefully()` helper functions to standardize prompt interruption handling across all interactive operations
- Wrapped all `@inquirer/prompts` calls (`confirm`, `checkbox`, `select`) in try-catch blocks for consistent error handling
- Extended zsh completion script with `dots_subcommands` array and proper case handling for nested commands
## 📝 Full Changelog
See all changes: https://github.com/Ruivalim/h/compare/v0.6.2...v0.6.3

---


## [0.6.2] - 2026-01-20

## 🎉 Highlights

This release significantly improves the dotfiles conflict resolution workflow by introducing configurable diff tool support and an interactive menu system. Users can now choose their preferred diff/merge tool (vimdiff, neovim, meld, VS Code, etc.) and resolve conflicts more efficiently with a streamlined interface.

## ✨ What's New

### Configurable Diff Tool Support
- Added new `diffTool` configuration option accessible via `h config`
- Supports popular diff tools out of the box:
  - vimdiff (vim)
  - nvim -d (neovim)
  - meld
  - opendiff (macOS FileMerge)
  - VS Code (`code --diff --wait`)
  - Custom commands
- Auto-detects a sensible default based on your `$EDITOR` environment variable

### Improved Conflict Resolution Workflow
- New interactive menu when encountering file conflicts during `dots sync`, `dots apply`, and `dots diff`
- Options to view inline diff, open in external diff tool, apply changes, or skip—all from a single menu
- External diff tool integration allows reviewing changes in your preferred editor before deciding
- Menu loops back after viewing diffs, letting you inspect changes multiple times before committing to an action

## 🔧 Technical Changes

- Refactored path resolution in `dots add` and `dots rm` to properly handle relative paths from current directory
- Added validation that paths must be inside home directory
- Extracted diff tool detection and spawning into reusable utility functions (`detectDefaultDiffTool`, `getDiffToolArgs`, `openExternalDiff`)
## 📝 Full Changelog
See all changes: https://github.com/Ruivalim/h/compare/v0.6.1...v0.6.2

---


## [0.6.1] - 2026-01-20

## 🎉 Highlights

This release significantly enhances the dotfiles management experience with new git workflow commands and an improved interactive apply process. Users can now manage their dotfiles repository directly through the CLI with pull, push, and navigation commands.

## ✨ What's New

### New Dotfiles Commands
- **`h dots pull`** - Pull changes from your remote dotfiles repository
- **`h dots push`** - Automatically commit and push local changes to remote (generates descriptive commit messages)
- **`h dots cd`** - Print the dotfiles repo path for easy navigation (use: `cd $(h dots cd)`)

### Improved Apply Workflow
- Added upfront scanning that shows all pending changes before applying
- New interactive file selection with checkboxes - choose exactly which files to apply
- Clear visual indicators for new files (`+ new`) vs modified files (`~ modified`)
- Changed default confirmation to `true` for applying changes (previously `false`)
- Better feedback when all dotfiles are already in sync

## 🔧 Technical Changes

- Refactored `dotsApply()` to collect all changes first before prompting
- Added file metadata tracking (source path, target path, new/modified status)
- Improved diff display flow - now shows diffs only for selected modified files
## 📝 Full Changelog
See all changes: https://github.com/Ruivalim/h/compare/v0.6.0...v0.6.1

---


## [0.6.0] - 2026-01-19

Now I have a complete picture. Let me generate the release notes.

# Release v0.6.0

## 🎉 Highlights

This release introduces a comprehensive **Dotfiles Manager** (`h dots`) - a chezmoi-compatible system for managing your dotfiles across machines. It also includes an **Interactive Configuration Editor** and complete project documentation.

## ✨ What's New

### Dotfiles Manager (`h dots`)
- **`h dots add <path>`** - Add files or directories to your dotfiles repo with interactive selection
- **`h dots apply`** - Apply dotfiles from repo to home directory with diff preview
- **`h dots sync`** - Bidirectional sync with conflict resolution (home ↔ repo)
- **`h dots status`** - View modified, missing, and in-sync files at a glance
- **`h dots diff [file]`** - Show differences between repo and home
- **`h dots list`** - List all managed dotfiles with status indicators
- **`h dots rm <path>`** - Remove files from dotfiles management

**Key Features:**
- Chezmoi-compatible naming conventions (`dot_`, `private_`, `executable_` prefixes)
- Auto-commit and push support for seamless backups
- Periodic sync checks on CLI startup (configurable interval)
- Automatic permission handling (private files get 600, executables get 755)
- Configurable ignore patterns for common files (.DS_Store, *.swp, etc.)

### Interactive Configuration Editor (`h config edit`)
- New menu-driven configuration interface
- Configure AI provider, update settings, and dotfiles options in one place
- Easily manage ignored patterns for dotfiles

### Documentation
- Added comprehensive documentation in `docs/`:
  - Installation guide with all methods and requirements
  - Complete commands reference
  - Architecture overview
  - Roadmap and planned features
  - Known issues and improvements

## 🔧 Technical Changes

- Extended `HConfig` type with dotfiles configuration schema
- Added `updateConfig()` utility for partial config updates
- Integrated dotfiles startup check into main CLI flow
- Improved README with quick start guide and feature overview
## 📝 Full Changelog
See all changes: https://github.com/Ruivalim/h/compare/push...v0.6.0

---


## [0.5.0] - 2026-01-13

## 🎉 Highlights
- **Enhanced Configuration Management:** Added new commands to manage CLI configuration, including setting up AI providers and configuring update checks.
- **AI-Powered Commit Messages:** Integrated AI-driven commit message generation to simplify and streamline the release process.

## ✨ What's New
### Features
- **Configuration Commands:** Introduced `config` subcommands to manage and edit CLI settings such as AI provider configuration and update notifications.
- **AI-Derived Commit Messages:** Added support for generating AI-powered commit messages, enhancing code commit clarity with a single command.

### Improvements
- **Interactive Editing:** The `edit` config command now opens the current configuration in your default editor, making updates straightforward.
- **Enhanced Release Notes Generation:** Integrated AI to create detailed release notes automatically during the release process, including updates to CHANGELOG.md and creating GitHub releases (if available).

## 🐛 Bug Fixes
- Fixed an issue where the `commit` command was failing when no staged changes were found.
- Addressed a bug in the `branch-diff` command that could cause issues with diff generation.

## 🔧 Technical Changes
- Updated project dependencies to ensure compatibility and performance improvements.
- Refactored code for better maintainability and scalability, including modularizing AI-related utilities into separate files.

## 📝 Full Changelog
[Link to compare view would go here]

For more detailed information on these changes and the full list of updates, please refer to the [full changelog](https://github.com/your-repo/releases/tag/v0.5.0).

---

