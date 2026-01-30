import { describe, test, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '~/mocks/server'
import { renderWithClient } from '~/test-utils'
import Settings from './settings'

// Mock session server before importing Settings component
vi.mock('~/services/session.server', () => ({
    getSession: vi.fn(),
}))

describe('Settings', () => {
    test('shows loading skeleton while fetching settings', () => {
        // Delay the response to observe loading state
        server.use(
            http.get('/api/settings', async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                return HttpResponse.json({
                    hasApiKey: false,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // PageLayout title should be visible in skeleton
        expect(
            screen.getByRole('heading', { name: 'Settings' }),
        ).toBeInTheDocument()
    })

    test('shows error state on fetch failure', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json(
                    { message: 'Internal server error' },
                    { status: 500 },
                )
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for error state
        await waitFor(() => {
            expect(
                screen.getByText(/Failed to load settings/),
            ).toBeInTheDocument()
        })
    })

    test('shows profile email from loader data', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: false,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText('test@example.com')).toBeInTheDocument()
        })

        // Profile section header should be visible
        expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    test('shows API key saved status when keys configured', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: true,
                    hasOpenAIKey: true,
                    modelPreference: 'claude-sonnet-4-20250514',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load and show confirmation messages
        await waitFor(() => {
            expect(
                screen.getByText('API key saved and validated'),
            ).toBeInTheDocument()
        })

        expect(
            screen.getByText('OpenAI API key saved and validated'),
        ).toBeInTheDocument()
    })

    test('shows update button text when API key exists', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: true,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Update API Key' }),
            ).toBeInTheDocument()
        })

        // OpenAI key doesn't exist, so should show "Save"
        expect(
            screen.getByRole('button', { name: 'Save OpenAI Key' }),
        ).toBeInTheDocument()
    })

    test('shows default model selector when API keys exist', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: true,
                    hasOpenAIKey: false,
                    modelPreference: 'claude-sonnet-4-20250514',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText('Default Model')).toBeInTheDocument()
        })

        // Model selector should exist (multiple comboboxes on page, just verify at least one)
        expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1)
    })

    test('hides default model selector when no API keys exist', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: false,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText('Profile')).toBeInTheDocument()
        })

        // Default Model section should not exist
        expect(screen.queryByText('Default Model')).not.toBeInTheDocument()
    })

    test('shows appearance section with theme options', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: false,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText('Appearance')).toBeInTheDocument()
        })

        // Color Theme label should be visible
        expect(screen.getByText('Color Theme')).toBeInTheDocument()
    })

    test('shows sign out button in account section', async () => {
        server.use(
            http.get('/api/settings', () => {
                return HttpResponse.json({
                    hasApiKey: false,
                    hasOpenAIKey: false,
                    modelPreference: '',
                })
            }),
        )

        renderWithClient(<Settings />, { withTheme: true, withRouter: true, withUser: true })

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByText('Account')).toBeInTheDocument()
        })

        // Sign out button
        expect(
            screen.getByRole('button', { name: 'Sign out' }),
        ).toBeInTheDocument()
    })
})
