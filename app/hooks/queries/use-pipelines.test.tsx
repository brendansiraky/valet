import { describe, test, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '~/mocks/server'
import { createWrapper, createTestQueryClient } from '~/test-utils'
import { mockPipelinesData, mockPipelineData } from '~/mocks/handlers'
import {
    usePipelines,
    usePipeline,
    useRunPipeline,
    useSavePipeline,
    useDeletePipeline,
} from './use-pipelines'

describe('usePipelines', () => {
    test('fetches and returns pipeline list', async () => {
        const { result } = renderHook(() => usePipelines(), {
            wrapper: createWrapper(),
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockPipelinesData.pipelines)
    })

    test('initially shows loading state', () => {
        const { result } = renderHook(() => usePipelines(), {
            wrapper: createWrapper(),
        })

        expect(result.current.isLoading).toBe(true)
        expect(result.current.data).toBeUndefined()
    })

    test('handles fetch error', async () => {
        server.use(
            http.get('/api/pipelines', () => {
                return HttpResponse.json(
                    { message: 'Internal server error' },
                    { status: 500 },
                )
            }),
        )

        const { result } = renderHook(() => usePipelines(), {
            wrapper: createWrapper(),
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error).toBeDefined()
    })

    test('returns empty array when no pipelines exist', async () => {
        server.use(
            http.get('/api/pipelines', () => {
                return HttpResponse.json({ pipelines: [] })
            }),
        )

        const { result } = renderHook(() => usePipelines(), {
            wrapper: createWrapper(),
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual([])
    })
})

describe('usePipeline', () => {
    test('fetches single pipeline by id', async () => {
        const { result } = renderHook(() => usePipeline('pipeline-1'), {
            wrapper: createWrapper(),
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockPipelineData.pipeline)
        expect(result.current.data?.id).toBe('pipeline-1')
        expect(result.current.data?.name).toBe('Test Pipeline')
        expect(result.current.data?.flowData).toEqual({ nodes: [], edges: [] })
    })

    test('returns loading state while fetching', () => {
        const { result } = renderHook(() => usePipeline('pipeline-1'), {
            wrapper: createWrapper(),
        })

        expect(result.current.isLoading).toBe(true)
        expect(result.current.data).toBeUndefined()
    })

    test('handles fetch error for single pipeline', async () => {
        server.use(
            http.get('/api/pipelines/:id', () => {
                return HttpResponse.json(
                    { message: 'Pipeline not found' },
                    { status: 500 },
                )
            }),
        )

        const { result } = renderHook(() => usePipeline('pipeline-1'), {
            wrapper: createWrapper(),
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error).toBeDefined()
    })

    test('is disabled when id is undefined', () => {
        const { result } = renderHook(() => usePipeline(undefined), {
            wrapper: createWrapper(),
        })

        // Query should not run - not loading, no data, no error
        expect(result.current.isLoading).toBe(false)
        expect(result.current.data).toBeUndefined()
        expect(result.current.fetchStatus).toBe('idle')
    })

    test("is disabled when id is 'home'", () => {
        const { result } = renderHook(() => usePipeline('home'), {
            wrapper: createWrapper(),
        })

        // Query should not run - not loading, no data, no error
        expect(result.current.isLoading).toBe(false)
        expect(result.current.data).toBeUndefined()
        expect(result.current.fetchStatus).toBe('idle')
    })

    test("is disabled when id is 'new'", () => {
        const { result } = renderHook(() => usePipeline('new'), {
            wrapper: createWrapper(),
        })

        // Query should not run - not loading, no data, no error
        expect(result.current.isLoading).toBe(false)
        expect(result.current.data).toBeUndefined()
        expect(result.current.fetchStatus).toBe('idle')
    })
})

describe('useRunPipeline', () => {
    test('runs pipeline and returns runId', async () => {
        const { result } = renderHook(() => useRunPipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({ pipelineId: 'pipeline-1', input: 'test input' })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual({ runId: 'run-123' })
    })

    test('handles run error', async () => {
        server.use(
            http.post('/api/pipeline/:pipelineId/run', () => {
                return HttpResponse.json(
                    { error: 'Pipeline not found' },
                    { status: 404 },
                )
            }),
        )

        const { result } = renderHook(() => useRunPipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({ pipelineId: 'invalid-id', input: 'test' })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.message).toBe('Pipeline not found')
    })

    test('sends input as FormData', async () => {
        let capturedInput: string | null = null

        server.use(
            http.post('/api/pipeline/:pipelineId/run', async ({ request }) => {
                const formData = await request.formData()
                capturedInput = formData.get('input') as string
                return HttpResponse.json({ runId: 'run-456' })
            }),
        )

        const { result } = renderHook(() => useRunPipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({
            pipelineId: 'pipeline-1',
            input: 'my test input data',
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(capturedInput).toBe('my test input data')
    })
})

describe('useSavePipeline', () => {
    test('creates new pipeline when isNew is true', async () => {
        const { result } = renderHook(() => useSavePipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({
            id: 'temp-id',
            name: 'New Pipeline',
            nodes: [{ id: 'node-1' }],
            edges: [],
            isNew: true,
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toMatchObject({
            id: 'new-pipeline-id',
            name: 'New Pipeline',
        })
    })

    test('updates existing pipeline when isNew is false', async () => {
        const { result } = renderHook(() => useSavePipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({
            id: 'pipeline-1',
            name: 'Updated Pipeline',
            nodes: [],
            edges: [],
            isNew: false,
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toMatchObject({
            id: 'pipeline-1',
            name: 'Updated Pipeline',
        })
    })

    test('handles save error', async () => {
        server.use(
            http.post('/api/pipelines', () => {
                return HttpResponse.json(
                    { error: 'Validation failed' },
                    { status: 400 },
                )
            }),
        )

        const { result } = renderHook(() => useSavePipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({
            id: 'pipeline-1',
            name: '',
            nodes: [],
            edges: [],
            isNew: false,
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.message).toBe('Validation failed')
    })

    test('does not invalidate pipelines cache on success', async () => {
        const queryClient = createTestQueryClient()

        // Pre-seed the cache
        queryClient.setQueryData(['pipelines'], mockPipelinesData.pipelines)

        const { result } = renderHook(() => useSavePipeline(), {
            wrapper: ({ children }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        })

        result.current.mutate({
            id: 'pipeline-1',
            name: 'Updated',
            nodes: [],
            edges: [],
            isNew: false,
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        // Cache should not be invalidated (isInvalidated would be true if invalidated)
        const queryState = queryClient.getQueryState(['pipelines'])
        expect(queryState?.isInvalidated).toBe(false)
    })
})

describe('useDeletePipeline', () => {
    test('deletes pipeline by id', async () => {
        let capturedIntent: string | null = null
        let capturedId: string | null = null

        server.use(
            http.post('/api/pipelines', async ({ request }) => {
                const formData = await request.formData()
                capturedIntent = formData.get('intent') as string
                capturedId = formData.get('id') as string
                return HttpResponse.json({ success: true })
            }),
        )

        const { result } = renderHook(() => useDeletePipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({ id: 'pipeline-1' })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(capturedIntent).toBe('delete')
        expect(capturedId).toBe('pipeline-1')
    })

    test('invalidates pipelines cache on success', async () => {
        const queryClient = createTestQueryClient()

        // Pre-seed the cache with pipelines
        queryClient.setQueryData(['pipelines'], mockPipelinesData.pipelines)

        const { result } = renderHook(() => useDeletePipeline(), {
            wrapper: ({ children }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        })

        result.current.mutate({ id: 'pipeline-1' })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        // Cache should be invalidated after delete
        const queryState = queryClient.getQueryState(['pipelines'])
        expect(queryState?.isInvalidated).toBe(true)
    })

    test('handles delete error', async () => {
        server.use(
            http.post('/api/pipelines', () => {
                return HttpResponse.json(
                    { error: 'Pipeline not found' },
                    { status: 404 },
                )
            }),
        )

        const { result } = renderHook(() => useDeletePipeline(), {
            wrapper: createWrapper(),
        })

        result.current.mutate({ id: 'nonexistent-id' })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.message).toBe('Pipeline not found')
    })
})
