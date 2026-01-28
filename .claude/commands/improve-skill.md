---
description: Review a skill and implement improvements automatically
argument-hint: <skill-path> [additional-prompt]
---

Review the skill at "$1" and implement all suggested improvements without asking for confirmation.

## Additional Instructions

$2

**Priority**: If the additional instructions above conflict with the default process below, follow the additional instructions instead.

## Process

1. **Load Skill** - MANDATORY FIRST STEP: Use the Skill tool to load `skill-development`. DO NOT SKIP THIS STEP. DO NOT PROCEED WITHOUT LOADING THE SKILL FIRST.
2. **Review** - Follow the loaded skill's instructions to analyze the skill at the given path
3. **Implement** - Apply all recommended improvements directly:
   - Update description with better trigger phrases
   - Remove redundant sections
   - DO NOT FIX code examples to match actual codebase patterns.
   - Consolidate duplicate content
   - Add missing documentation
   - Rename files to follow conventions
   - Update file references
3. **Verify** - Confirm all changes were applied

## Usage Examples

```
/improve-skill .claude/skills/writing-dialogs/
/improve-skill .claude/skills/writing-emails/ rename it to email
/improve-skill /path/to/skill/ focus only on the description
```

## Important

- **CRITICAL: You MUST call the Skill tool with `skill-development` as your FIRST action. This is non-negotiable.**
- Do NOT ask for confirmation before implementing changes
- Implement ALL suggested improvements in one pass
- Read actual codebase files to verify patterns if the reviewer mentions code is out of sync
