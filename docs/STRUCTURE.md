# Documentation Structure

This document describes the production-standard organization of the documentation directory.

## Directory Layout

```
docs/
├── README.md                 # Main documentation index
├── STRUCTURE.md              # This file
│
├── getting-started/          # Beginner guides
│   └── GETTING_STARTED.md   # Installation and first steps
│
├── guides/                   # Intermediate guides
│   ├── CORE_CONCEPTS.md     # Core concepts and patterns
│   └── FEATURES.md          # Feature guide
│
├── reference/                # Reference documentation
│   ├── API.md               # Complete API reference
│   ├── ARCHITECTURE.md      # System architecture
│   └── PERFORMANCE.md       # Performance optimization
│
└── utils/                    # Documentation utilities (if needed)
```

## File Organization

### Naming Convention

- **Getting Started**: `GETTING_STARTED.md`
- **Guides**: Descriptive names (`CORE_CONCEPTS.md`, `FEATURES.md`)
- **Reference**: Descriptive names (`API.md`, `ARCHITECTURE.md`, `PERFORMANCE.md`)

### Content Organization

#### Getting Started (`getting-started/`)

**Purpose:** Help users get started quickly

**Content:**
- Installation instructions
- Environment setup
- First agent example
- Basic configuration

**Target Audience:** First-time users

#### Guides (`guides/`)

**Purpose:** Explain concepts and features

**Content:**
- Core concepts
- Feature explanations
- Best practices
- Common patterns

**Target Audience:** Developers building applications

#### Reference (`reference/`)

**Purpose:** Complete technical reference

**Content:**
- API documentation
- System architecture
- Performance optimization
- Internal details

**Target Audience:** Advanced users and contributors

## Documentation Standards

### Structure

All documentation should follow this structure:

```markdown
# Title

Brief description.

## Overview

What this document covers.

## Section 1

Content with examples.

## Section 2

More content.

## Related

- [Link to related doc](./path/to/doc.md)
```

### Code Examples

All code examples should:

1. **Be Runnable** - Can be copied and run
2. **Include Imports** - Show all required imports
3. **Use TypeScript** - Type-safe examples
4. **Follow Best Practices** - Production-ready patterns
5. **Include Error Handling** - Show proper error handling

### Cross-References

Link to related documentation:

```markdown
See [Getting Started](./getting-started/GETTING_STARTED.md) for installation.
See [API Reference](./reference/API.md#agent-class) for complete API.
```

## Best Practices

1. **Clear Headers** - Use hierarchical structure
2. **Code Examples** - Include runnable examples
3. **Type Safety** - Use TypeScript in examples
4. **Cross-Reference** - Link to related docs
5. **Best Practices** - Show production patterns
6. **Keep Updated** - Update when code changes

## Navigation

The main README.md provides:

- Quick navigation by user type
- Learning paths
- Topic-based navigation
- Use case navigation

## Contributing

### Adding New Documentation

1. **Choose Category** - Place in appropriate directory
2. **Follow Structure** - Use existing docs as templates
3. **Add Examples** - Include runnable code
4. **Cross-Reference** - Link to related docs
5. **Update README** - Add to navigation

### Updating Existing Documentation

1. **Check Accuracy** - Verify against source code
2. **Update Examples** - Ensure examples work
3. **Update Links** - Fix broken references
4. **Maintain Structure** - Follow existing format

