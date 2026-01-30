import { Form } from 'react-router'
import { LogOut } from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
} from '~/components/ui/sidebar'
import { NavMain } from '~/components/nav-main'

export function AppSidebar() {
    return (
        <Sidebar variant='inset' collapsible='icon'>
            <SidebarHeader>
                <div className='flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center'>
                    <span className='text-lg font-semibold group-data-[collapsible=icon]:hidden'>
                        Valet
                    </span>
                    <SidebarTrigger />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain />
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Form method='post' action='/logout'>
                            <SidebarMenuButton type='submit' tooltip='Sign out'>
                                <LogOut />
                                <span>Sign out</span>
                            </SidebarMenuButton>
                        </Form>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
