# Amatl GitHub Action

![CI](https://github.com/Bornholm/amatl-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/Bornholm/amatl-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/Bornholm/amatl-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/Bornholm/amatl-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Bornholm/amatl-action/actions/workflows/codeql-analysis.yml)

A GitHub Action that converts Markdown files to PDF or HTML using the
[amatl](https://bornholm.github.io/amatl/) tool. This action automatically finds
markdown files matching a pattern and generates beautiful PDF or HTML documents
with customizable layouts and styling.

## Features

- 🔍 **Pattern Matching**: Find markdown files using glob patterns
- 📄 **Multiple Formats**: Generate HTML, PDF, or both formats
- 🎨 **Custom Layouts**: Use built-in layouts or provide your own
- 📊 **Template Variables**: Inject dynamic data using JSON variables
- 🚀 **Easy Setup**: Automatically installs and caches the amatl tool
- 🔧 **Flexible Configuration**: Extensive customization options

## Quick start

```yaml
name: Generate Documentation
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Convert Markdown to PDF
        uses: actions/amatl-action@v1
        with:
          pattern: 'docs/**/*.md'
          output-dir: 'generated-docs'
          format: 'pdf'
          layout: 'amatl://document.html'

      - name: Upload Generated Documents
        uses: actions/upload-artifact@v4
        with:
          name: documentation
          path: generated-docs/
```

## Inputs

| Input           | Description                                                         | Required | Default                 |
| --------------- | ------------------------------------------------------------------- | -------- | ----------------------- |
| `pattern`       | Glob pattern to match markdown files (e.g., `**/*.md`, `docs/*.md`) | ✅       | `**/*.md`               |
| `output-dir`    | Output directory for generated files                                | ✅       | `output`                |
| `format`        | Output format: `html`, `pdf`, `markdown`                            | ❌       | `html`                  |
| `layout`        | Layout to use (see [Layouts](#layouts) section)                     | ❌       | `amatl://document.html` |
| `vars`          | URL to JSON file containing template variables                      | ❌       | -                       |
| `amatl-version` | Version of amatl to use                                             | ❌       | `latest`                |
| `config`        | An amatl config file URL                                            | ❌       | -                       |

## Outputs

| Output            | Description                               |
| ----------------- | ----------------------------------------- |
| `files-processed` | Number of markdown files processed        |
| `output-files`    | JSON array of generated output file paths |

## Layouts

Amatl provides several built-in layouts:

### `amatl://document.html`

A clean, print-friendly layout designed for general documents (reports, papers),
formatted in A4 by default.

### `amatl://presentation.html`

A layout for creating slide-style presentations from your Markdown content.

### `amatl://website.html`

A simple, responsive layout suitable for rendering Markdown as a web page.

### Custom layouts

You can also provide a URL to your own custom HTML layout:

```yaml
- name: Convert with Custom Layout
  uses: actions/amatl-action@v1
  with:
    pattern: '*.md'
    output-dir: 'output'
    format: 'html'
    layout: 'https://raw.githubusercontent.com/user/repo/main/custom-layout.html'
```

## Usage examples

### Basic HTML generation

```yaml
- name: Generate HTML Documentation
  uses: actions/amatl-action@v1
  with:
    pattern: 'docs/**/*.md'
    output-dir: 'html-docs'
    format: 'html'
```

### Generate both HTML and PDF

```yaml
- name: Generate HTML and PDF
  uses: actions/amatl-action@v1
  with:
    pattern: 'README.md'
    output-dir: 'output'
    format: 'html,pdf'
    layout: 'amatl://document.html'
```

### Using template variables

First, create a variables file (`variables.json`):

```json
{
  "title": "My Project Documentation",
  "version": "1.0.0",
  "author": "John Doe",
  "date": "2024-01-15"
}
```

Then use it in your workflow:

```yaml
- name: Generate Documentation with Variables
  uses: actions/amatl-action@v1
  with:
    pattern: 'docs/*.md'
    output-dir: 'output'
    format: 'pdf'
    vars: 'file://variables.json'
```

In your Markdown files, you can use these variables:

```markdown
---
title: '{{ .Vars.title }}'
author: '{{ .Vars.author }}'
---

# {{ .Vars.title }}

Version: {{ .Vars.version }} Author: {{ .Vars.author }} Date: {{ .Vars.date }}
```

### Presentation Mode

```yaml
- name: Generate Presentation
  uses: actions/amatl-action@v1
  with:
    pattern: 'presentation.md'
    output-dir: 'slides'
    format: 'pdf'
    layout: 'amatl://presentation.html'
```

### Specific amatl version

```yaml
- name: Generate with specific version
  uses: actions/amatl-action@v1
  with:
    pattern: '**/*.md'
    output-dir: 'output'
    format: 'html'
    amatl-version: 'v0.25.1'
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major
changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## About amatl

[amatl](https://bornholm.github.io/amatl/) is a powerful command-line utility
for transforming CommonMark (Markdown) files into full-fledged HTML/PDF
documents. It supports:

- URL resolving for local and remote resources
- MermaidJS diagrams and syntax highlighting
- Custom directives for including documents and generating tables of content
- Go templating for dynamic data injection
- Pre-defined and custom layouts
- Relative link rewriting and resource embedding

Visit the [official amatl documentation](https://bornholm.github.io/amatl/) for
more information about the underlying tool.
