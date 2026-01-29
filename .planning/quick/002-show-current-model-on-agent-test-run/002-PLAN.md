# Quick Task 002: Show Current Model on Agent Test Run

## Task Description
Display the model being used when running a test in the Agent test dialog.

## Analysis
- Agent runs already determine which model to use in `api.agent.$agentId.run.ts`
- The `AgentRunResult` type is returned to the client but doesn't include model info
- The `agent-test-dialog.tsx` displays result info (content, citations, tokens)
- Need to pass model through the result chain

## Tasks

### Task 1: Add model to AgentRunResult and return it
**Files:**
- `app/services/agent-runner.server.ts` - Add `model` field to `AgentRunResult`, return it from `runAgent()`

### Task 2: Display model in test dialog
**File:** `app/components/agent-test-dialog.tsx`
- Import `AVAILABLE_MODELS` for human-readable name lookup
- Show model name in results section alongside token usage

## Verification
- TypeScript compiles without errors
- Agent test dialog shows model name (e.g., "Model: Claude Sonnet 4.5")
