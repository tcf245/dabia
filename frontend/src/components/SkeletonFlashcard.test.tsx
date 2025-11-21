import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SkeletonFlashcard from '../components/SkeletonFlashcard';

describe('SkeletonFlashcard', () => {
    it('renders without crashing', () => {
        const { container } = render(<SkeletonFlashcard />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it('has the correct structure', () => {
        const { container } = render(<SkeletonFlashcard />);
        // Check for the main container with animate-pulse class
        const skeletonContainer = container.querySelector('.animate-pulse');
        expect(skeletonContainer).toBeInTheDocument();

        // Check for some internal skeleton elements (e.g., hint, sentence, feedback)
        const skeletonElements = container.querySelectorAll('.bg-secondary\\/50');
        expect(skeletonElements.length).toBeGreaterThan(0);
    });
});
