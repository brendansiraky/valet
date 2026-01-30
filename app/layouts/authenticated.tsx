import type {
    LoaderFunctionArgs,
    ShouldRevalidateFunctionArgs,
} from 'react-router'
import { Outlet, useLoaderData } from 'react-router'
import { SidebarProvider, SidebarInset } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-sidebar'
import { UserProvider } from '~/contexts/user-context'
import { isAuthenticated } from '~/services/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
    // Single auth check - redirects to login if not authenticated
    // User object is stored in session, no DB query needed
    const user = await isAuthenticated(request, {
        failureRedirect: '/login',
    })

    return { user: user! }
}

export default function AuthenticatedLayout() {
    const { user } = useLoaderData<typeof loader>()

    return (
        <UserProvider user={user}>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </UserProvider>
    )
}
