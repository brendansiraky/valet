import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card'

interface SidebarAgent {
    id: string
    name: string
    instructions: string | null
}

interface SidebarTrait {
    id: string
    name: string
    color: string
}

interface AgentSidebarProps {
    agents: SidebarAgent[]
    traits: SidebarTrait[]
}

export function AgentSidebar({ agents, traits }: AgentSidebarProps) {
    const onAgentDragStart = (event: React.DragEvent, agent: SidebarAgent) => {
        event.dataTransfer.setData('application/agent-id', agent.id)
        event.dataTransfer.setData('application/agent-name', agent.name)
        event.dataTransfer.setData(
            'application/agent-instructions',
            agent.instructions || '',
        )
        event.dataTransfer.effectAllowed = 'move'
    }

    const onTraitDragStart = (event: React.DragEvent, trait: SidebarTrait) => {
        event.dataTransfer.setData('application/trait-id', trait.id)
        event.dataTransfer.setData('application/trait-name', trait.name)
        event.dataTransfer.setData('application/trait-color', trait.color)
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <div className='w-64 h-[calc(100vh-78px)] border-r bg-background p-4 overflow-y-auto'>
            <h2 className='font-semibold mb-4'>Your Agents</h2>
            {agents.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                    No agents yet. Create agents first.
                </p>
            ) : (
                <div className='space-y-2'>
                    {agents.map((agent) => (
                        <Card
                            key={agent.id}
                            draggable
                            onDragStart={(e) => onAgentDragStart(e, agent)}
                            className='cursor-grab active:cursor-grabbing hover:border-primary transition-colors py-0'
                        >
                            <CardHeader className='py-2 px-3'>
                                <CardTitle className='text-sm'>
                                    {agent.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='py-1 px-3 pb-2'>
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                    {agent.instructions}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <h2 className='font-semibold mb-4 mt-6'>Traits</h2>
            {traits.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                    No traits yet. Create traits first.
                </p>
            ) : (
                <div className='space-y-2'>
                    {traits.map((trait) => (
                        <Card
                            key={trait.id}
                            draggable
                            onDragStart={(e) => onTraitDragStart(e, trait)}
                            className='cursor-grab active:cursor-grabbing hover:border-primary transition-colors py-0'
                            style={{
                                borderLeftWidth: '4px',
                                borderLeftColor: trait.color,
                            }}
                        >
                            <CardHeader className='py-2 px-3'>
                                <CardTitle className='text-sm'>
                                    {trait.name}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
