# Development Standards & Contribution Guidelines

This document outlines the coding standards and contribution guidelines for the Dabia project.

## Commit Message Convention

We follow the **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** specification. This helps in creating a clear and structured git history.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Guidelines

- **Conciseness**: Keep the description (first line) concise. One sentence is usually enough.
- **Language**: All commit messages must be in **English**.
- **No Chinese Characters**: Do not use Chinese characters in the commit history.
- **Lowercase**: The `<type>` and `<description>` should be in lowercase.
- **Imperative**: Use the imperative mood in the description (e.g., "add feature" instead of "added feature").

## Coding Standards

- **Language**: All code and comments must be in **English**.
- **Linting**: Ensure code passes linting checks before committing.
- **Testing**: Run all relevant tests before pushing changes. New features should include corresponding tests.

## Database Migrations

- Use **Alembic** for all database schema (DDL) and seed data updates.
- Do not modify existing migration files; always create a new migration.
- Use placeholder or anonymous data for seed data to protect privacy.
