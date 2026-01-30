import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ThemeProvider } from "~/components/theme-provider";

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
}

/**
 * Renders a component wrapped in QueryClientProvider.
 * Returns the render result plus the queryClient for cache manipulation.
 * @param options.withTheme - If true, wraps in ThemeProvider (for components using useTheme)
 * @param options.withRouter - If true, wraps in RouterProvider (for components using react-router hooks)
 */
export function renderWithClient(
  ui: ReactElement,
  options?: RenderWithClientOptions
): RenderWithClientResult {
  const { withTheme = false, withRouter = false, ...renderOptions } = options ?? {};
  const queryClient = createTestQueryClient();

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
          {withTheme ? (
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          ) : (
            <RouterProvider router={router} />
          )}
        </QueryClientProvider>,
        renderOptions
      ),
      queryClient,
    };
  }

  return {
    ...render(ui, {
      wrapper: ({ children }: WrapperProps) => {
        const content = (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
        return withTheme ? <ThemeProvider>{content}</ThemeProvider> : content;
      },
      ...renderOptions,
    }),
    queryClient,
  };
}
