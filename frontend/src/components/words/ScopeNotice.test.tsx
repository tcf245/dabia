import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScopeNotice from './ScopeNotice';
import { setFallbackLanguage } from '../../i18n/context';

describe('ScopeNotice', () => {
  it('renders single deck scope with polite aria-live', () => {
    render(
      <ScopeNotice
        deckName="eggrolls-JLPT10k-v3::1-N4+N5"
        activeDeckCount={1}
        status="learning"
        count={292}
      />,
    );

    const notice = screen.getByText('JLPT N5–N4 · Learning · 292 words');
    expect(notice.closest('p')).toHaveAttribute('aria-live', 'polite');
  });

  it('formats grammar deck names, all active decks, level filters, and search query', () => {
    const { rerender } = render(
      <ScopeNotice
        deckName="dabia-jlpt::N2 Grammar"
        activeDeckCount={2}
        status="learning"
        count={12}
        levels={[3, 1]}
        query="taberu"
      />,
    );

    expect(
      screen.getByText('JLPT N2 Grammar · Learning · 12 words · Levels 1, 3 · Search "taberu"'),
    ).toBeInTheDocument();

    rerender(
      <ScopeNotice
        deckName={null}
        activeDeckCount={3}
        status="mastered"
        count={1}
        levels={[1]}
      />,
    );

    expect(
      screen.getByText('All active decks (3) · Mastered · 1 word'),
    ).toBeInTheDocument();
  });

  it('formats Chinese scope copy matching the spec', () => {
    setFallbackLanguage('zh');
    render(
      <ScopeNotice
        deckName="eggrolls-JLPT10k-v3::1-N4+N5"
        activeDeckCount={1}
        status="learning"
        count={292}
        levels={[1, 2]}
        query="何"
      />,
    );

    expect(
      screen.getByText('当前词库「JLPT N5–N4」 · 学习中 · 292 个单词 · 等级 1、2 · 搜索“何”'),
    ).toBeInTheDocument();
  });
});
