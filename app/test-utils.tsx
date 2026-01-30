import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ThemeProvider } from "~/components/theme-provider";
import { UserProvider, type AuthUser } from "~/contexts/user-context";

/**
 * Creates a fresh QueryClient configured for testing.
 * - Disables retries to prevent test timeouts
 * - Each test gets an isolated client to prevent state leakage
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

/**
 * Creates a wrapper component with a fresh QueryClient.
 * Use with renderHook for testing query hooks.
 */
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

interface RenderWithClientResult extends ReturnType<typeof render> {
  queryClient: QueryClient;
}

interface RenderWithClientOptions extends Omit<RenderOptions, "wrapper"> {
  withTheme?: boolean;
  withRouter?: boolean;
  withUser?: AuthUser | boolean;
}

const DEFAULT_TEST_USER: AuthUser = {
  id: "test-user-123",
  email: "test@example.com",
};

/**
 * Renders a component wrapped in QueryClientProvider.
 * Returns the render result plus the queryClient for cache manipulation.
 * @param options.withTheme - If true, wraps in ThemeProvider (for components using useTheme)
 * @param options.withRouter - If true, wraps in RouterProvider (for components using react-router hooks)
 * @param options.withUser - If true, wraps in UserProvider with default test user. If AuthUser object, uses that user.
 */
export function renderWithClient(
  ui: ReactElement,
  options?: RenderWithClientOptions
): RenderWithClientResult {
  const { withTheme = false, withRouter = false, withUser = false, ...renderOptions } = options ?? {};
  const queryClient = createTestQueryClient();

  // Determine the user to provide (if any)
  const user = withUser === true ? DEFAULT_TEST_USER : withUser || null;

  // Helper to wrap content with optional providers
  const wrapWithProviders = (content: ReactNode): ReactNode => {
    let wrapped = content;
    if (user) {
      wrapped = <UserProvider user={user}>{wrapped}</UserProvider>;
    }
    if (withTheme) {
      wrapped = <ThemeProvider>{wrapped}</ThemeProvider>;
    }
    return wrapped;
  };

  // If withRouter is true, we need to render the component inside a router
  if (withRouter) {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: ui,
        },
      ],
      { initialEntries: ["/"] }
    );

    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          {wrapWithProviders(<RouterProvider router={router} />)}
        </QueryClientProvider>,
        renderOptions
      ),
      queryClient,
    };
  }

  return {
    ...render(ui, {
      wrapper: ({ children }: WrapperProps) => {
        return (
          <QueryClientProvider client={queryClient}>
            {wrapWithProviders(children)}
          </QueryClientProvider>
        );
      },
      ...renderOptions,
    }),
    queryClient,
  };
}
