# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/JavaScript package that validates email addresses through multiple checks:
- Format validation using regex
- MX record validation via DNS lookups  
- Blacklist checking against disposable email domains

The project is built as a Node.js library that can be consumed by other applications.

## Development Commands

### Build and Development
```bash
# Build the library
yarn build

# Build with watch mode for development
yarn dev

# Format code
yarn format

# Run linter
yarn lint

# Publish (builds first)
yarn publish
```

### Testing
```bash
# Run tests using Jest
npx jest

# Run specific test file
npx jest src/__test__/index.test.js
```

Note: The project uses Jest for testing but doesn't have a test script in package.json - run directly with `npx jest`.

## Architecture

### Core Structure
- **Entry Point**: `index.js` → `lib/index.js` (compiled output)
- **Source**: `src/index.ts` - Main validation logic
- **Blacklist**: `src/blacklist.js` - Large object containing disposable email domains
- **Tests**: `src/__test__/index.test.js` - Jest test suite
- **Build**: Rollup with TypeScript compilation to CommonJS format

### Key Functions

#### `checkEmail(email: string)` 
Main validation function that orchestrates all checks:
1. Format validation
2. Blacklist check  
3. MX record validation
Returns: `{ isValid: boolean, message?: string, mxRecords?: array }`

#### `isEmailFormatValid(email: string)`
Validates email format using complex regex pattern.
Returns: `boolean`

#### `isMXRecordValid(email: string)`
Performs DNS MX record lookup to verify domain can receive email.
Uses Node.js `dns.resolveMx()` with Promise wrapper.
Returns: `{ isValid: boolean, mxRecords?: array, message?: string }`

#### `isBlacklisted(email: string)`
Checks domain and all parent domains against disposable email blacklist.
Uses `domainSuffixes()` helper to generate domain hierarchy.
Returns: `boolean`

### Build System
- **Rollup** with TypeScript plugin compiles `src/index.ts` → `lib/index.js`
- **Two separate bundles**: Main code and blacklist (for modularity)
- **CommonJS output** with source maps
- **Declaration files** generated in `lib/` directory

### Dependencies
- **Runtime**: `node-range` - for generating domain suffix arrays
- **DevDependencies**: TypeScript, Rollup, Jest, ESLint, Prettier

## File Structure Notes

- Root `index.js` is a simple proxy to the compiled version in `lib/`
- `blacklist.js` is a large object (788KB+) containing disposable domains
- TypeScript config targets ES5 for broad compatibility
- Package distributed as CommonJS with type declarations

## Error Handling Patterns

DNS lookups are wrapped in try-catch with specific error code handling:
- `ENOTFOUND`, `ENODATA`, `SERVFAIL` → "not-found" message
- Other errors → "error" message with details

All functions are designed to degrade gracefully rather than throw exceptions.