import { useState } from 'react'
import { X, Plus, Home, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
    useTabsQuery,
    useFocusOrOpenTab,
    useSetActiveTab,
    useOpenTab,
    canOpenNewTab,
    HOME_TAB_ID,
} from '~/hooks/queries/use-tabs'
import { usePipelines, useCreatePipeline } from '~/hooks/queries/use-pipelines'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '~/components/ui/alert-dialog'

interface PipelineTabsProps {
    runStates: Map<string, { runId: string | null; isStarting: boolean }>
    onCloseTab: (pipelineId: string) => void
}

export function PipelineTabs({ runStates, onCloseTab }: PipelineTabsProps) {
    const { data: tabState } = useTabsQuery()
    const focusOrOpenTabMutation = useFocusOrOpenTab()
    const setActiveTabMutation = useSetActiveTab()
    const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null)
    const { data: pipelines = [] } = usePipelines()

    const tabs = tabState?.tabs ?? []
    const activeTabId = tabState?.activeTabId ?? null

    const handleTabClick = (pipelineId: string) => {
        // Tab switches instantly via optimistic update - no navigation needed
        setActiveTabMutation.mutate(pipelineId)
    }

    const handleClose = (e: React.MouseEvent, pipelineId: string) => {
        e.stopPropagation()

        // Home tab cannot be closed
        if (pipelineId === HOME_TAB_ID) return

        // Check if pipeline is running
        const runState = runStates.get(pipelineId)
        const isRunning = runState?.runId || runState?.isStarting

        if (isRunning) {
            setConfirmCloseId(pipelineId)
            return
        }

        performClose(pipelineId)
    }

    const performClose = (pipelineId: string) => {
        // Parent handles closeTab, cache cleanup, and navigation
        onCloseTab(pipelineId)
        setConfirmCloseId(null)
    }

    const createPipeline = useCreatePipeline()
    const openTabMutation = useOpenTab()

    const handleNewTab = () => {
        if (!canOpenNewTab(tabs)) {
            toast.error('Maximum 8 tabs allowed')
            return
        }

        createPipeline.mutate(
            { name: 'Untitled Pipeline', flowData: { nodes: [], edges: [] } },
            {
                onSuccess: (pipeline) => {
                    // Open a tab for the new pipeline - no navigation needed
                    openTabMutation.mutate({
                        pipelineId: pipeline.id,
                        name: pipeline.name,
                    })
                },
                onError: () => {
                    toast.error('Failed to create pipeline')
                },
            },
        )
    }

    const handleSelectPipeline = (pipelineId: string, name: string) => {
        // Tab opens/focuses instantly via optimistic update - no navigation needed
        focusOrOpenTabMutation.mutate({ pipelineId, name })
    }

    // Filter out pipelines already open in tabs for dropdown
    const openTabIds = new Set(tabs.map((t) => t.pipelineId))
    const availablePipelines = pipelines.filter((p) => !openTabIds.has(p.id))

    // Separate regular tabs from home tab
    const regularTabs = tabs.filter((t) => t.pipelineId !== HOME_TAB_ID)

    return (
        <>
            <div className='flex items-center border-b bg-muted/30 px-2 h-10'>
                {/* Pinned home tab - fixed width */}
                <button
                    onClick={() => handleTabClick(HOME_TAB_ID)}
                    className={cn(
                        'flex-shrink-0 flex items-center justify-center size-8 rounded-t-md border-b-2 transition-colors',
                        'hover:bg-background/50',
                        activeTabId === HOME_TAB_ID
                            ? 'border-primary bg-background'
                            : 'border-transparent',
                    )}
                    title='Home'
                >
                    <Home className='size-4' />
                </button>

                {/* Regular tabs - flex container that allows shrinking */}
                <div className='flex min-w-0 items-center'>
                    {regularTabs.map((tab) => (
                        <div
                            key={tab.pipelineId}
                            onClick={() => handleTabClick(tab.pipelineId)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleTabClick(tab.pipelineId)
                                }
                            }}
                            className={cn(
                                'group flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors cursor-pointer',
                                'hover:bg-background/50 min-w-0 max-w-44 flex-shrink',
                                activeTabId === tab.pipelineId
                                    ? 'border-primary bg-background'
                                    : 'border-transparent',
                            )}
                        >
                            <span className='truncate'>{tab.name}</span>
                            <button
                                onClick={(e) => handleClose(e, tab.pipelineId)}
                                className='flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 -mr-1'
                            >
                                <X className='size-3' />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Dropdown for adding tabs - hidden when at limit */}
                {canOpenNewTab(tabs) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='flex-shrink-0 size-8 ml-1'
                            >
                                <Plus className='size-4' />
                                <ChevronDown className='size-3 -ml-1' />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='start' className='w-56'>
                            <DropdownMenuItem
                                onClick={handleNewTab}
                                className='font-medium'
                            >
                                <Plus className='size-4 mr-2' />
                                New Pipeline
                            </DropdownMenuItem>
                            {availablePipelines.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    {availablePipelines.map((pipeline) => (
                                        <DropdownMenuItem
                                            key={pipeline.id}
                                            onClick={() =>
                                                handleSelectPipeline(
                                                    pipeline.id,
                                                    pipeline.name,
                                                )
                                            }
                                        >
                                            <span className='truncate'>
                                                {pipeline.name}
                                            </span>
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <AlertDialog
                open={!!confirmCloseId}
                onOpenChange={(open) => !open && setConfirmCloseId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Close running pipeline?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This pipeline is currently running. Closing it will
                            stop the run and you may lose progress.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={() =>
                                confirmCloseId && performClose(confirmCloseId)
                            }
                        >
                            Close Anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
