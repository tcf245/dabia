import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DeckManagement from './DeckManagement';
import * as api from '../services/api';

// Mock the api service
vi.mock('../services/api', () => ({
    getDecks: vi.fn(),
    getDeckSettings: vi.fn(),
    updateDeckSettings: vi.fn(),
}));

const mockDecks: api.Deck[] = [
    {
        id: '1',
        name: 'Basic Japanese',
        description: 'Common phrases',
        count: 100,
        difficulty: 'Beginner',
        tags: ['JLPT N5']
    },
    {
        id: '2',
        name: 'Intermediate Kanji',
        description: 'Advanced characters',
        count: 50,
        difficulty: 'Advanced',
        tags: ['JLPT N2']
    },
    {
        id: '3',
        name: 'Unknown Deck',
        description: 'Test unknown difficulty',
        count: 10,
        difficulty: 'Unknown',
        tags: []
    }
];

const mockSettings: api.DeckSettings = {
    active_deck_ids: ['1', '2']
};

describe('DeckManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.getDecks as any).mockResolvedValue(mockDecks);
        (api.getDeckSettings as any).mockResolvedValue(mockSettings);
        (api.updateDeckSettings as any).mockResolvedValue({ active_deck_ids: ['1', '2'] });
    });

    it('renders loading state initially', async () => {
        render(<DeckManagement />);
        expect(screen.getByText(/Loading library.../i)).toBeInTheDocument();
        // Wait for it to finish loading to avoid act warnings from the background fetches
        await waitFor(() => expect(screen.queryByText(/Loading library.../i)).not.toBeInTheDocument());
    });

    it('renders deck list after loading', async () => {
        render(<DeckManagement />);

        await waitFor(() => expect(screen.queryByText(/Loading library.../i)).not.toBeInTheDocument());

        expect(screen.getByText('Basic Japanese')).toBeInTheDocument();
        expect(screen.getByText('Intermediate Kanji')).toBeInTheDocument();
        expect(screen.getByText('100 CARDS')).toBeInTheDocument();
        expect(screen.getByText('50 CARDS')).toBeInTheDocument();
    });

    it('renders the JLPT N2 grammar deck as a dedicated resource', async () => {
        (api.getDecks as any).mockResolvedValueOnce([
            {
                id: 'n2-grammar',
                name: 'dabia-jlpt::N2 Grammar',
                description: 'JLPT N2 grammar patterns from the local Japanese N2 Grammar wiki note.',
                count: 160,
                difficulty: 'Advanced',
                tags: ['JLPT N2', 'Grammar']
            }
        ]);
        (api.getDeckSettings as any).mockResolvedValueOnce({ active_deck_ids: [] });

        render(<DeckManagement />);

        await waitFor(() => expect(screen.getByText('dabia-jlpt::N2 Grammar')).toBeInTheDocument());

        expect(screen.getByText('JLPT N2 grammar patterns from the local Japanese N2 Grammar wiki note.')).toBeInTheDocument();
        expect(screen.getByText('160 CARDS')).toBeInTheDocument();
        expect(screen.getByText('JLPT N2')).toBeInTheDocument();
        expect(screen.getByText('Grammar')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('toggles deck selection (unselect)', async () => {
        render(<DeckManagement />);

        await waitFor(() => expect(screen.getByText('Basic Japanese')).toBeInTheDocument());

        const intermediateDeck = screen.getByText('Intermediate Kanji');

        // Initially deck 2 is selected (mockSettings has '1', '2')
        fireEvent.click(intermediateDeck);

        // Should trigger updateDeckSettings with only '1'
        expect(api.updateDeckSettings).toHaveBeenCalledWith({ active_deck_ids: ['1'] });
        expect(screen.getByText(/Saving changes.../i)).toBeInTheDocument();

        await waitFor(() => expect(screen.queryByText(/Saving changes.../i)).not.toBeInTheDocument());
    });

    it('toggles deck selection (select)', async () => {
        (api.getDeckSettings as any).mockResolvedValueOnce({ active_deck_ids: ['1'] });
        render(<DeckManagement />);

        await waitFor(() => expect(screen.getByText('Basic Japanese')).toBeInTheDocument());

        const intermediateDeck = screen.getByText('Intermediate Kanji');

        // Initially deck 2 is not selected
        fireEvent.click(intermediateDeck);

        // Should trigger updateDeckSettings with both
        await waitFor(() => {
            expect(api.updateDeckSettings).toHaveBeenCalledWith({ active_deck_ids: ['1', '2'] });
        });

        // Wait for saving to finish
        await waitFor(() => expect(screen.queryByText(/Saving changes.../i)).not.toBeInTheDocument());
    });

    it('handles toggle error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (api.updateDeckSettings as any).mockRejectedValueOnce(new Error('Update failed'));

        render(<DeckManagement />);
        await waitFor(() => expect(screen.getByText('Basic Japanese')).toBeInTheDocument());

        const intermediateDeck = screen.getByText('Intermediate Kanji');
        fireEvent.click(intermediateDeck);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to save deck settings:", expect.any(Error));
        });

        // Also wait for Saving changes to disappear
        await waitFor(() => expect(screen.queryByText(/Saving changes.../i)).not.toBeInTheDocument());

        consoleSpy.mockRestore();
    });

    it('handles initial load error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (api.getDecks as any).mockRejectedValueOnce(new Error('Load failed'));

        render(<DeckManagement />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Failed to load deck data:", expect.any(Error));
        });

        consoleSpy.mockRestore();
    });
});
