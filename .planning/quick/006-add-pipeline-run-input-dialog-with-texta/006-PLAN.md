---
phase: quick-006
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/routes/pipelines.$id.tsx
autonomous: true

must_haves:
  truths:
    - "Clicking Run opens a dialog prompting for input"
    - "User can type multi-line text in a textarea"
    - "Cancel closes dialog without starting pipeline"
    - "Start button submits input and begins pipeline execution"
  artifacts:
    - path: "app/routes/pipelines.$id.tsx"
      provides: "Pipeline run input dialog"
      contains: "Dialog"
  key_links:
    - from: "Dialog submit"
      to: "startPipelineRun"
      via: "passes input text from textarea state"
      pattern: "startPipelineRun\\(.*input"
---

<objective>
Add a dialog that prompts users for input text before running a pipeline.

Purpose: Currently pipelines run with hardcoded empty input. Users need to provide context/prompts for the pipeline to process.

Output: Modified `pipelines.$id.tsx` with Dialog component and textarea for pipeline input.
</objective>

<execution_context>
@/Users/brendan/.claude/get-shit-done/workflows/execute-plan.md
@/Users/brendan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/routes/pipelines.$id.tsx
@app/components/ui/dialog.tsx
@app/components/ui/textarea.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pipeline run input dialog</name>
  <files>app/routes/pipelines.$id.tsx</files>
  <action>
1. Add imports at top of file:
   - `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter` from `~/components/ui/dialog`
   - `Textarea` from `~/components/ui/textarea`

2. Add state for dialog control (after existing state declarations around line 70):
   - `const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);`
   - `const [runInput, setRunInput] = useState("");`

3. Modify `startPipelineRun` function (line ~241) to accept input parameter:
   - Change signature to `const startPipelineRun = async (input: string) => {`
   - Change line 247 from `formData.set("input", "");` to `formData.set("input", input);`

4. Modify `handleRun` function (line ~268) to open dialog instead of directly running:
   - Replace function body with just `setIsRunDialogOpen(true);`

5. Add new handler for dialog submission (after handleRun):
   ```typescript
   const handleRunSubmit = async () => {
     setIsRunDialogOpen(false);
     await startPipelineRun(runInput);
     setRunInput(""); // Reset for next run
   };
   ```

6. Add Dialog component in JSX (before the closing `</div>` of the main container, around line 388):
   ```tsx
   {/* Run Input Dialog */}
   <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Run Pipeline</DialogTitle>
         <DialogDescription>
           Enter the input text for this pipeline run.
         </DialogDescription>
       </DialogHeader>
       <Textarea
         placeholder="Enter your input here..."
         value={runInput}
         onChange={(e) => setRunInput(e.target.value)}
         rows={6}
         className="resize-none"
       />
       <DialogFooter>
         <Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>
           Cancel
         </Button>
         <Button onClick={handleRunSubmit}>
           <Play className="w-4 h-4 mr-2" />
           Run Pipeline
         </Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>
   ```
  </action>
  <verify>
1. `npm run typecheck` passes with no errors
2. Navigate to an existing pipeline in browser
3. Click Run button - dialog should appear with textarea
4. Type text, click Cancel - dialog closes, pipeline does not run
5. Click Run again, type text, click "Run Pipeline" - dialog closes, pipeline executes with input
  </verify>
  <done>
- Run button opens dialog with textarea instead of immediately starting pipeline
- Cancel button closes dialog without side effects
- Run Pipeline button submits the textarea content to pipeline execution
- Input is passed to the API (visible in network tab: formData contains "input" field)
  </done>
</task>

</tasks>

<verification>
1. `npm run typecheck` - no type errors
2. Manual test: Open pipeline -> Click Run -> Dialog appears
3. Manual test: Type input -> Cancel -> Dialog closes, no run started
4. Manual test: Type input -> Run Pipeline -> Pipeline executes with that input
</verification>

<success_criteria>
- Dialog appears when clicking Run on a saved pipeline
- Textarea allows multi-line input
- Cancel closes dialog without triggering run
- Run Pipeline submits input and starts execution
- Input text is passed to the API (not hardcoded empty string)
</success_criteria>

<output>
After completion, create `.planning/quick/006-add-pipeline-run-input-dialog-with-texta/006-SUMMARY.md`
</output>
