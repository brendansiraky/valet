import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { getSession } from '~/services/session.server'
import { db, pipelines, agents, traits } from '~/db'
import { eq, and } from 'drizzle-orm'
import { usePipelineStore } from '~/stores/pipeline-store'
import { PipelineCanvas } from '~/components/pipeline-builder/pipeline-canvas'
import { AgentSidebar } from '~/components/pipeline-builder/agent-sidebar'
import { TraitsContext } from '~/components/pipeline-builder/traits-context'
import { RunProgress } from '~/components/pipeline-runner/run-progress'
import { OutputViewer } from '~/components/output-viewer/output-viewer'
import { getLayoutedElements } from '~/lib/pipeline-layout'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '~/components/ui/dialog'
import { Textarea } from '~/components/ui/textarea'
import {
    LayoutGrid,
    Save,
    Trash2,
    Play,
    Loader2,
    AlertTriangle,
} from 'lucide-react'
import type { Node, Edge } from '@xyflow/react'
import type { AgentNodeData, PipelineNodeData } from '~/stores/pipeline-store'

export async function loader({ request, params }: LoaderFunctionArgs) {
    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')

    if (!userId) {
        return redirect('/login')
    }

    const { id } = params

    // Fetch user's agents for sidebar
    const userAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, userId))

    // Fetch user's traits for sidebar
    const userTraits = await db
        .select()
        .from(traits)
        .where(eq(traits.userId, userId))
        .orderBy(traits.name)

    // For new pipelines, return null pipeline
    if (id === 'new') {
        return { pipeline: null, agents: userAgents, traits: userTraits }
    }

    // Load existing pipeline
    const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(and(eq(pipelines.id, id!), eq(pipelines.userId, userId)))

    if (!pipeline) {
        throw new Response('Pipeline not found', { status: 404 })
    }

    return { pipeline, agents: userAgents, traits: userTraits }
}

export default function PipelineBuilderPage() {
    const {
        pipeline,
        agents: userAgents,
        traits: userTraits,
    } = useLoaderData<typeof loader>()
    const navigate = useNavigate()
    const [isSaving, setIsSaving] = useState(false)
    const [currentRunId, setCurrentRunId] = useState<string | null>(null)
    const [isStartingRun, setIsStartingRun] = useState(false)
    const [completedOutput, setCompletedOutput] = useState<{
        steps: Array<{ agentName: string; output: string; input: string }>
        finalOutput: string
        usage: { inputTokens: number; outputTokens: number } | null
        model: string | null
    } | null>(null)
    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
    const [runInput, setRunInput] = useState('')

    const {
        nodes,
        edges,
        pipelineId,
        pipelineName,
        setPipelineMetadata,
        addAgentNode,
        addTraitNode,
        setNodes,
        setEdges,
        reset,
    } = usePipelineStore()

    // Initialize store from loaded pipeline or reset for new
    useEffect(() => {
        if (pipeline) {
            setPipelineMetadata(
                pipeline.id,
                pipeline.name,
                pipeline.description || '',
            )
            const flowData = pipeline.flowData as {
                nodes: Node<PipelineNodeData>[]
                edges: Edge[]
            }
            // Enrich agent nodes with isOrphaned status
            const validAgentIds = new Set(userAgents.map((a) => a.id))
            const enrichedNodes = (flowData.nodes || []).map((node) => {
                // Only agent nodes need orphan checking
                if (node.type === 'agent') {
                    const agentData = node.data as AgentNodeData
                    return {
                        ...node,
                        data: {
                            ...agentData,
                            isOrphaned: !validAgentIds.has(agentData.agentId),
                        },
                    }
                }
                return node
            })
            setNodes(enrichedNodes)
            setEdges(flowData.edges || [])
        } else {
            reset()
        }
    }, [pipeline, userAgents, setPipelineMetadata, setNodes, setEdges, reset])

    // Detect if any agents in the pipeline are orphaned (deleted)
    const hasOrphanedAgents = useMemo(() => {
        const validAgentIds = new Set(userAgents.map((a) => a.id))
        return nodes.some((n) => {
            if (n.type !== 'agent') return false
            const agentData = n.data as AgentNodeData
            return agentData.agentId && !validAgentIds.has(agentData.agentId)
        })
    }, [nodes, userAgents])

    // Create traits lookup map for AgentNode to access trait details
    const traitsMap = useMemo(
        () => new Map(userTraits.map((t) => [t.id, t])),
        [userTraits],
    )

    const handleDropAgent = (
        agentId: string,
        agentName: string,
        agentInstructions: string | undefined,
        position: { x: number; y: number },
    ) => {
        addAgentNode(
            { id: agentId, name: agentName, instructions: agentInstructions },
            position,
        )
    }

    const handleDropTrait = (
        traitId: string,
        traitName: string,
        traitColor: string,
        position: { x: number; y: number },
    ) => {
        addTraitNode(
            { id: traitId, name: traitName, color: traitColor },
            position,
        )
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPipelineMetadata(
            pipeline?.id || null,
            e.target.value,
            pipeline?.description || '',
        )
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.set('intent', pipelineId ? 'update' : 'create')
            if (pipelineId) {
                formData.set('id', pipelineId)
            }
            formData.set('name', pipelineName)
            formData.set('description', '')
            formData.set('flowData', JSON.stringify({ nodes, edges }))

            const response = await fetch('/api/pipelines', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()
            if (data.error) {
                throw new Error(data.error)
            }

            // If created new, navigate to the saved pipeline
            if (!pipelineId && data.pipeline) {
                navigate(`/pipelines/${data.pipeline.id}`, { replace: true })
            }
        } catch (error) {
            console.error('Failed to save pipeline:', error)
            // TODO: Show toast error
        } finally {
            setIsSaving(false)
        }
    }

    const handleAutoLayout = () => {
        const { nodes: layoutedNodes, edges: layoutedEdges } =
            getLayoutedElements(nodes, edges)
        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
    }

    const handleDelete = async () => {
        if (!pipelineId || !confirm('Delete this pipeline?')) return

        const formData = new FormData()
        formData.set('intent', 'delete')
        formData.set('id', pipelineId)

        await fetch('/api/pipelines', {
            method: 'POST',
            body: formData,
        })

        navigate('/pipelines')
    }

    // Get steps from store nodes for progress display (agent nodes only)
    const pipelineSteps = useMemo(() => {
        return nodes
            .filter(
                (node): node is Node<AgentNodeData> => node.type === 'agent',
            )
            .map((node) => ({
                agentId: node.data.agentId,
                agentName: node.data.agentName,
            }))
    }, [nodes])

    // Start pipeline execution by calling API and tracking run ID
    const startPipelineRun = async (input: string) => {
        if (!pipelineId) return

        setIsStartingRun(true)
        try {
            const formData = new FormData()
            formData.set('input', input)

            const response = await fetch(`/api/pipeline/${pipelineId}/run`, {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()
            if (data.error) {
                throw new Error(data.error)
            }

            setCurrentRunId(data.runId)
        } catch (error) {
            console.error('Failed to start pipeline:', error)
            // TODO: Show toast error
        } finally {
            setIsStartingRun(false)
        }
    }

    const handleRun = () => {
        setIsRunDialogOpen(true)
    }

    const handleRunSubmit = async () => {
        setIsRunDialogOpen(false)
        await startPipelineRun(runInput)
        setRunInput('') // Reset for next run
    }

    const handleRunComplete = useCallback(
        (
            finalOutput: string,
            stepOutputs: Map<number, string>,
            stepInputs: Map<number, string>,
            usage: { inputTokens: number; outputTokens: number } | null,
            model: string | null,
        ) => {
            // Convert step maps to array with agent names
            // stepInputs contains the full prompt (system + user) as sent to LLM
            const steps = pipelineSteps.map((step, index) => ({
                agentName: step.agentName,
                output: stepOutputs.get(index) || '',
                input: stepInputs.get(index) || '',
            }))

            setCompletedOutput({ steps, finalOutput, usage, model })
            setCurrentRunId(null)
        },
        [pipelineSteps],
    )

    const handleRunError = useCallback((error: string) => {
        console.error('Pipeline failed:', error)
        // Reset run state after a brief delay to show error message
        setTimeout(() => setCurrentRunId(null), 3000)
        // TODO: Show toast error
    }, [])

    return (
        <div className='flex h-full flex-col overflow-hidden'>
            {/* Header */}
            <div className='z-10 border-b bg-background p-4 flex items-center gap-4'>
                <Input
                    value={pipelineName}
                    onChange={handleNameChange}
                    placeholder='Pipeline name'
                    className='max-w-xs font-semibold'
                />
                <div className='flex-1' />
                <Button variant='outline' onClick={handleAutoLayout}>
                    <LayoutGrid className='size-4 mr-2' />
                    Auto Layout
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    <Save className='size-4 mr-2' />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                {pipelineId && (
                    <>
                        <Button
                            onClick={handleRun}
                            disabled={
                                isStartingRun ||
                                !!currentRunId ||
                                hasOrphanedAgents
                            }
                            variant={hasOrphanedAgents ? 'outline' : 'default'}
                        >
                            {isStartingRun ? (
                                <>
                                    <Loader2 className='size-4 mr-2 animate-spin' />
                                    Starting...
                                </>
                            ) : currentRunId ? (
                                <>
                                    <Loader2 className='size-4 mr-2 animate-spin' />
                                    Running...
                                </>
                            ) : hasOrphanedAgents ? (
                                <>
                                    <AlertTriangle className='size-4 mr-2' />
                                    Remove Deleted Agents
                                </>
                            ) : (
                                <>
                                    <Play className='size-4 mr-2' />
                                    Run
                                </>
                            )}
                        </Button>
                        <Button variant='destructive' onClick={handleDelete}>
                            <Trash2 className='size-4 mr-2' />
                            Delete
                        </Button>
                    </>
                )}
            </div>

            {/* Main content */}
            <div className='flex flex-1 min-h-0'>
                {/* <AgentSidebar agents={userAgents} traits={userTraits} /> */}
                <TraitsContext.Provider value={traitsMap}>
                    <div className='flex-1'>
                        <PipelineCanvas
                            onDropAgent={handleDropAgent}
                            onDropTrait={handleDropTrait}
                            isLocked={isStartingRun || !!currentRunId}
                        />
                    </div>
                </TraitsContext.Provider>
            </div>

            {/* Run Progress */}
            {currentRunId && (
                <div className='fixed bottom-4 right-4 w-96 z-50'>
                    <RunProgress
                        runId={currentRunId}
                        steps={pipelineSteps}
                        onComplete={handleRunComplete}
                        onError={handleRunError}
                    />
                </div>
            )}

            {/* Output Viewer Modal */}
            {completedOutput && (
                <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
                    <div className='w-full max-w-4xl mx-4'>
                        <OutputViewer
                            steps={completedOutput.steps}
                            finalOutput={completedOutput.finalOutput}
                            pipelineName={pipelineName}
                            usage={completedOutput.usage}
                            model={completedOutput.model}
                            onClose={() => setCompletedOutput(null)}
                        />
                    </div>
                </div>
            )}

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
                        placeholder='Enter your input here...'
                        value={runInput}
                        onChange={(e) => setRunInput(e.target.value)}
                        rows={6}
                        className='resize-none'
                    />
                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsRunDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleRunSubmit}>
                            <Play className='size-4 mr-2' />
                            Run Pipeline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
