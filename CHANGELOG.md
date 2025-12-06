# Change Log

All notable changes to the "copy-code-as-snippet" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 1.2.0

- Added AI-friendly Markdown mode with header metadata (file/language/range) as an opt-in setting
- Added Markdown fence strategy options (default, autoUpgrade, tilde) to avoid broken fences when content includes \`\`\`
- Added large-file prompt to choose full copy or head/tail sampling based on line threshold
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
