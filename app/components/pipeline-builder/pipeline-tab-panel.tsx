import { useMemo, useCallback, useRef, useEffect } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import debounce from 'lodash-es/debounce'
import { useUpdateTabName, useTabsQuery } from '~/hooks/queries/use-tabs'
import { usePipelineFlow } from '~/hooks/queries/use-pipeline-flow'
import { useDeletePipeline, useUpdatePipelineName } from '~/hooks/queries/use-pipelines'
import { PipelineCanvas } from './pipeline-canvas'
import { PipelineContext } from './pipeline-context'
import { TraitsContext, type TraitContextValue } from './traits-context'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { LayoutGrid, Trash2, Play, Loader2, AlertTriangle } from 'lucide-react'
import { getLayoutedElements } from '~/lib/pipeline-layout'
import type {
    AgentNodeData,
    PipelineNodeData,
} from '~/hooks/queries/use-pipelines'

interface PipelineTabPanelProps {
    pipelineId: string
    initialData: {
        id: string
        name: string
        flowData: unknown // Comes from DB as JSON, cast internally
    } | null // null for new pipeline
    agents: Array<{ id: string; name: string; instructions: string | null }>
    traits: Array<{ id: string; name: string; color: string }>
    traitsMap: Map<string, TraitContextValue>
    runState: { runId: string | null; isStarting: boolean }
    onOpenRunDialog: () => void
    onDelete: () => void
}

export function PipelineTabPanel({
    pipelineId,
    agents,
    traitsMap,
    runState,
    onOpenRunDialog,
    onDelete,
}: PipelineTabPanelProps) {
    const deletePipelineMutation = useDeletePipeline()
    const updateTabNameMutation = useUpdateTabName()
    const updatePipelineNameMutation = useUpdatePipelineName()
    const { data: tabsData } = useTabsQuery()

    const {
        nodes,
        edges,
        isLoading,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addAgentNode,
        addTraitNode,
        setNodesAndEdges,
    } = usePipelineFlow(pipelineId)

    // Get tab name as source of truth for display
    const tabName = tabsData?.tabs.find((t) => t.pipelineId === pipelineId)?.name ?? ''

    // Stable debounced save function using ref
    type DebouncedFn = ReturnType<typeof debounce<(id: string, name: string) => void>>
    const debouncedSaveRef = useRef<DebouncedFn | null>(null)
    if (!debouncedSaveRef.current) {
        debouncedSaveRef.current = debounce((id: string, name: string) => {
            updatePipelineNameMutation.mutate({ id, name })
        }, 500)
    }

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => debouncedSaveRef.current?.cancel()
    }, [])

    // Compute enriched nodes with orphan status during render (NO useEffect)
    const enrichedNodes = useMemo(() => {
        const validAgentIds = new Set(agents.map((a) => a.id))
        return nodes.map((node) => {
            if (node.type === 'agent') {
                const agentData = node.data as AgentNodeData
                const isOrphaned = !validAgentIds.has(agentData.agentId)
                if (agentData.isOrphaned !== isOrphaned) {
                    return {
                        ...node,
                        data: { ...agentData, isOrphaned },
                    }
                }
            }
            return node
        })
    }, [nodes, agents])

    // Detect orphaned agents
    const hasOrphanedAgents = useMemo(() => {
        const validAgentIds = new Set(agents.map((a) => a.id))
        return nodes.some((n) => {
            if (n.type !== 'agent') return false
            const agentData = n.data as AgentNodeData
            return agentData.agentId && !validAgentIds.has(agentData.agentId)
        })
    }, [nodes, agents])

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value
            // Optimistic update to tab (immediate UI feedback)
            updateTabNameMutation.mutate({ pipelineId, name: newName })
            // Debounced update to pipeline (persist to DB)
            debouncedSaveRef.current?.(pipelineId, newName)
        },
        [pipelineId, updateTabNameMutation],
    )

    const handleDropAgent = useCallback(
        (
            agentId: string,
            agentName: string,
            instructions: string | undefined,
            position: { x: number; y: number },
        ) => {
            addAgentNode(
                { id: agentId, name: agentName, instructions },
                position,
            )
        },
        [addAgentNode],
    )

    const handleDropTrait = useCallback(
        (
            traitId: string,
            traitName: string,
            traitColor: string,
            position: { x: number; y: number },
        ) => {
            addTraitNode(
                { id: traitId, name: traitName, color: traitColor },
                position,
            )
        },
        [addTraitNode],
    )

    const handleAutoLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } =
            getLayoutedElements(enrichedNodes, edges)
        setNodesAndEdges(layoutedNodes, layoutedEdges)
    }, [enrichedNodes, edges, setNodesAndEdges])

    const handleDelete = () => {
        if (!confirm('Delete this pipeline?')) return

        deletePipelineMutation.mutate(
            { id: pipelineId },
            {
                onSuccess: () => {
                    onDelete()
                },
                onError: (error) => {
                    console.error('Failed to delete pipeline:', error)
                },
            },
        )
    }

    if (isLoading) {
        return (
            <div className='flex-1 flex items-center justify-center'>
                Loading...
            </div>
        )
    }

    const isLocked = runState.isStarting || !!runState.runId

    return (
        <div className='flex flex-col h-full'>
            {/* Header */}
            <div className='h-[78px] z-10 border-b bg-background p-4 flex items-center gap-4'>
                <Input
                    value={tabName}
                    onChange={handleNameChange}
                    placeholder='Pipeline name'
                    className='max-w-xs font-semibold'
                />
                <div className='flex-1' />
                <Button variant='outline' onClick={handleAutoLayout}>
                    <LayoutGrid className='size-4 mr-2' />
                    Auto Layout
                </Button>
                <Button
                    onClick={onOpenRunDialog}
                    disabled={isLocked || hasOrphanedAgents}
                    variant={hasOrphanedAgents ? 'outline' : 'default'}
                >
                    {runState.isStarting ? (
                        <>
                            <Loader2 className='size-4 mr-2 animate-spin' />
                            Starting...
                        </>
                    ) : runState.runId ? (
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
            </div>

            {/* Canvas with isolated ReactFlowProvider */}
            <div className='flex-1 min-h-0'>
                <TraitsContext.Provider value={traitsMap}>
                    <PipelineContext.Provider value={{ pipelineId }}>
                        <ReactFlowProvider>
                            <PipelineCanvas
                                nodes={enrichedNodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onDropAgent={handleDropAgent}
                                onDropTrait={handleDropTrait}
                                isLocked={isLocked}
                            />
                        </ReactFlowProvider>
                    </PipelineContext.Provider>
                </TraitsContext.Provider>
            </div>
        </div>
    )
}
