# Change Log

All notable changes to the "copy-code-as-snippet" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## Unreleased

### Changed

- Simplified the AI mode header to a single Markdown heading with file, language, and range folded in.
- The old three-line header failed markdownlint's MD041 and was inconsistent with the single-heading `header` path placement.

## 1.3.0

### Added

- Added opt-in standard Markdown path headers and outside-workspace basename paths.
- Added an editor context-menu command and default keyboard shortcut.
- Added deterministic minimum/latest VS Code testing and repository-managed VSIX packaging.

### Changed

- Reduced full-document reads for selections, canceled prompts, and head/tail samples.

### Fixed

- Fixed HTML snippets adding formatting whitespace around copied code.
- Fixed automatic Markdown fences for content containing four or more consecutive backticks.
- Fixed AI selection metadata for selections ending at the start of a later line.
- Fixed invalid configuration values not falling back to compatibility defaults.

## 1.2.0

- Added AI-friendly Markdown mode with header metadata (file/language/range) as an opt-in setting
- Added Markdown fence strategy options (default, autoUpgrade, tilde) to avoid broken fences when content includes \`\`\`
- Added large-file prompt to choose full copy or head/tail sampling based on line threshold, with presets and custom head/tail counts
- Defaults keep existing 1.1.x behavior unchanged

## 1.1.0

- Added support for:
  - Snippet format options: `markdown`, `html`, and `plain text`
  - Selecting code instead of copying the full file
  - Customizable settings for file path inclusion and output format
- Improved workspace-relative path detection in multi-root environments
- Improved HTML escaping for enhanced security

## 1.0.0

- Support for copying entire file content as a Markdown code snippet with language and file path information
