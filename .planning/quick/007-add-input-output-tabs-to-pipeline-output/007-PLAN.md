---
phase: quick-007
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/components/output-viewer/output-viewer.tsx
  - app/components/output-viewer/download-buttons.tsx
  - app/routes/pipelines.$id.tsx
  - app/components/pipeline-runner/use-run-stream.ts
autonomous: true

must_haves:
  truths:
    - "Each step tab shows Input and Output sub-tabs"
    - "Download buttons reflect currently selected content (input or output)"
    - "With 3 agents, user can download 6 distinct items (3 inputs + 3 outputs)"
  artifacts:
    - path: "app/components/output-viewer/output-viewer.tsx"
      provides: "Input/Output sub-tabs for each step"
    - path: "app/components/output-viewer/download-buttons.tsx"
      provides: "Context-aware download with step name and type suffix"
  key_links:
    - from: "output-viewer.tsx"
      to: "download-buttons.tsx"
      via: "passes content and label for download filename"
---

<objective>
Add input/output sub-tabs to each step in the Pipeline Output modal, allowing users to see both what each agent received (input) and what it produced (output). Update download buttons to download the currently viewed content with appropriate filenames.

Purpose: Users need visibility into the data flow between agents to debug and understand pipeline behavior.
Output: Enhanced OutputViewer with input/output tabs per step and context-aware downloads.
</objective>

<context>
@app/components/output-viewer/output-viewer.tsx
@app/components/output-viewer/download-buttons.tsx
@app/routes/pipelines.$id.tsx
@app/components/pipeline-runner/use-run-stream.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Track step inputs through the run stream</name>
  <files>
    app/components/pipeline-runner/use-run-stream.ts
    app/routes/pipelines.$id.tsx
  </files>
  <action>
    1. In use-run-stream.ts:
       - Add `stepInputs: Map<number, string>` to RunStreamState interface and initialState
       - In step_start event handler, capture input if available (will come from handleRunComplete)

    2. In pipelines.$id.tsx:
       - Update completedOutput state type to include `input` in each step: `{ agentName: string; output: string; input: string }`
       - In handleRunComplete callback, compute each step's input:
         - Step 0 input = the original runInput captured before run started
         - Step N input = step N-1's output (from stepOutputs map)
       - Store runInput in a ref so it's available in handleRunComplete callback

    Note: The pipeline passes output of step N as input to step N+1. The initial input comes from the run dialog.
  </action>
  <verify>TypeScript compiles without errors: `npx tsc --noEmit`</verify>
  <done>Step data includes both input and output for each agent</done>
</task>

<task type="auto">
  <name>Task 2: Add input/output sub-tabs to OutputViewer</name>
  <files>
    app/components/output-viewer/output-viewer.tsx
  </files>
  <action>
    1. Update StepOutput interface to include `input: string`

    2. For each step tab content, add nested Tabs component with "Input" and "Output" sub-tabs:
       ```tsx
       <TabsContent key={index} value={`step-${index}`}>
         <Tabs defaultValue="output">
           <div className="flex items-center justify-between mb-4">
             <TabsList>
               <TabsTrigger value="input">Input</TabsTrigger>
               <TabsTrigger value="output">Output</TabsTrigger>
             </TabsList>
             <DownloadButtons
               content={/* current tab's content */}
               pipelineName={pipelineName}
               stepName={step.agentName}
               contentType={/* "input" or "output" */}
             />
           </div>
           <TabsContent value="input">
             <ScrollArea className="h-[400px] rounded-md border p-4">
               <MarkdownViewer content={step.input || "No input"} />
             </ScrollArea>
           </TabsContent>
           <TabsContent value="output">
             <ScrollArea className="h-[400px] rounded-md border p-4">
               <MarkdownViewer content={step.output || "No output"} />
             </ScrollArea>
           </TabsContent>
         </Tabs>
       </TabsContent>
       ```

    3. Use useState to track which sub-tab is selected for each step so downloads work correctly.
       Create state: `const [stepViews, setStepViews] = useState<Record<number, 'input' | 'output'>>({})`
       Default to 'output' for each step.

    4. Move DownloadButtons from header to inside each step's sub-tabs area, passing the currently viewed content.

    5. For Final Output tab, keep it simple (no sub-tabs) but move its download buttons into that tab content.
  </action>
  <verify>Run app, execute a 2+ agent pipeline, verify each step shows Input/Output tabs</verify>
  <done>Each step has sub-tabs for Input and Output with appropriate content</done>
</task>

<task type="auto">
  <name>Task 3: Update download buttons for context-aware filenames</name>
  <files>
    app/components/output-viewer/download-buttons.tsx
  </files>
  <action>
    1. Update DownloadButtonsProps interface:
       ```tsx
       interface DownloadButtonsProps {
         content: string;
         pipelineName: string;
         stepName?: string;       // Optional: agent name for step downloads
         contentType?: 'input' | 'output' | 'final';  // Optional: type of content
       }
       ```

    2. Update filename generation:
       - For step input: `{pipelineName}-{stepName}-input.txt` / `.md`
       - For step output: `{pipelineName}-{stepName}-output.txt` / `.md`
       - For final output (no stepName): `{pipelineName}-final.txt` / `.md`

       Example with 3 agents (Researcher, Writer, Editor):
       - my-pipeline-Researcher-input.txt
       - my-pipeline-Researcher-output.txt
       - my-pipeline-Writer-input.txt
       - my-pipeline-Writer-output.txt
       - my-pipeline-Editor-input.txt
       - my-pipeline-Editor-output.txt

    3. Use sanitizeFilename on the combined name to handle special characters.
  </action>
  <verify>Download a step's input and output, verify filenames include agent name and type</verify>
  <done>Downloads have descriptive filenames like "pipeline-AgentName-input.txt"</done>
</task>

</tasks>

<verification>
1. Run a pipeline with 3 agents
2. Open the output modal
3. Click on first agent's tab - verify Input/Output sub-tabs exist
4. Input tab shows the original pipeline input text
5. Output tab shows that agent's response
6. Click second agent's tab - Input should equal first agent's output
7. Download from each view - verify 6 distinct downloadable files possible
8. Final Output tab still works with its own download
</verification>

<success_criteria>
- Each step tab has Input and Output sub-tabs
- Input content flows correctly (step N input = step N-1 output, step 0 input = run input)
- Download buttons download the currently visible content
- Filenames are descriptive: {pipeline}-{agent}-{input|output}.{ext}
- Final Output tab unchanged in function
</success_criteria>

<output>
After completion, update `.planning/STATE.md` with quick task 007 entry.
</output>
