# RML Editor

A browser-based visual editor for creating [R2RML](https://www.w3.org/TR/r2rml/) mappings from CSV data sources. Built with React, TypeScript, and Material UI.

## Features

- **CSV Import** -- Load a CSV file and preview its contents with adjustable row counts
- **Visual Mapping Editor** -- Define triples maps with subject templates, predicates, and object mappings using intuitive form controls
- **Ontology Support** -- Import OWL/RDFS ontologies to populate class and property dropdowns with human-readable labels
- **RDFS & SKOS Vocabularies** -- Toggle built-in RDFS and SKOS properties; auto-detected when importing existing mappings
- **Namespace Management** -- Use QName prefixes in templates (e.g., `foaf:Person/{id}`) with automatic expansion on export
- **RDF Preview** -- Live Turtle syntax preview that updates as you edit mappings
- **Visual Graph Preview** -- Interactive force-directed diagram (D3) showing IRI nodes, literal nodes, and labeled predicate edges
- **NULL Handling** -- Optionally skip triples where CSV values are empty or whitespace
- **Import/Export** -- Import existing R2RML Turtle files (with QName compression and vocabulary auto-detection) or export your mapping as standard R2RML Turtle

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (included with Node.js)

## Installation & Running

### Mac

```bash
# Clone the repository
git clone <repository-url>
cd rml_editor

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Windows

```powershell
# Clone the repository
git clone <repository-url>
cd rml_editor

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Building for Production

```bash
npm run build
```

The output will be in the `dist/` directory. Serve it with any static file server:

```bash
npm run preview
```

## Tech Stack

- **React 19** + **TypeScript** -- UI framework
- **Material UI 7** -- Component library
- **Zustand** -- State management
- **rdflib.js** -- RDF parsing and serialization
- **D3.js** -- Force-directed graph visualization
- **PapaParse** -- CSV parsing
- **Vite** -- Build tool and dev server
