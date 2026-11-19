import React, { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  exportWords,
  type WordsExportQuery,
  type WordsStatusFilter,
} from '../../services/api';
import { useI18n } from '../../i18n/LanguageProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import Toast from '../Toast';

export interface ExportButtonProps {
  currentQuery: WordsExportQuery;
  deckLabel: string;
  status: WordsStatusFilter;
  currentListCount: number;
  currentDeckCount: number;
  allDecksCount: number;
}

type ExportScope = 'list' | 'deck' | 'all';

interface ExportOption {
  key: ExportScope;
  label: string;
  description: string;
  count: number;
  query: WordsExportQuery;
}

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

const hasAuthToken = (): boolean => {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
};

/** Outlined CSV export trigger with a three-scope popover and signed-out sign-in prompt. */
export const ExportButton: React.FC<ExportButtonProps> = ({
  currentQuery,
  deckLabel,
  status,
  currentListCount,
  currentDeckCount,
  allDecksCount,
}) => {
  const { messages } = useI18n();
  const t = messages.words;

  const titleId = useId();
  const radioGroupName = useId();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const toastCounterRef = useRef(0);

  const [, bumpAuth] = useReducer((count: number) => count + 1, 0);
  const signedIn = hasAuthToken();

  const [open, setOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ExportScope>('list');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) {
        bumpAuth();
      }
    };
    const handleUnauthorized = () => {
      setOpen(false);
      setExporting(false);
      setExportError(null);
      bumpAuth();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dabia:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dabia:unauthorized', handleUnauthorized);
    };
  }, []);

  const options = useMemo<ExportOption[]>(
    () => [
      {
        key: 'list',
        label: t.export.currentList,
        description: [deckLabel, t.tabs[status], t.export.wordCount(currentListCount)]
          .filter(Boolean)
          .join(' · '),
        count: currentListCount,
        query: currentQuery,
      },
      {
        key: 'deck',
        label: t.export.currentDeck,
        description: [deckLabel, t.export.wordCount(currentDeckCount)]
          .filter(Boolean)
          .join(' · '),
        count: currentDeckCount,
        query: {
          deckIds: currentQuery.deckIds,
          status: 'all',
        },
      },
      {
        key: 'all',
        label: t.export.allDecks,
        description: t.export.wordCount(allDecksCount),
        count: allDecksCount,
        query: {
          allDecks: true,
          status: 'all',
        },
      },
    ],
    [
      t,
      deckLabel,
      status,
      currentListCount,
      currentDeckCount,
      allDecksCount,
      currentQuery,
    ],
  );

  const selectedOption =
    options.find((opt) => opt.key === selectedScope && opt.count > 0) ??
    options.find((opt) => opt.count > 0) ??
    options[0];
  const effectiveScope = selectedOption.key;
  const allEmpty =
    currentListCount === 0 && currentDeckCount === 0 && allDecksCount === 0;

  const closePopover = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setExportError(null);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const handleEscape = useCallback(() => {
    closePopover(true);
  }, [closePopover]);

  useEscapeKey(open && signedIn && !exporting, handleEscape);

  useEffect(() => {
    if (!open || !signedIn) return;
    const checkedRadio = popoverRef.current?.querySelector<HTMLInputElement>(
      'input[type="radio"]:checked:not(:disabled)',
    );
    const firstEnabledRadio = popoverRef.current?.querySelector<HTMLInputElement>(
      'input[type="radio"]:not(:disabled)',
    );
    (checkedRadio ?? firstEnabledRadio ?? popoverRef.current)?.focus();
  }, [open, signedIn]);

  useEffect(() => {
    if (!open || !signedIn) return;
    const handleOutside = (event: MouseEvent) => {
      if (exporting) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      const isInteractive =
        target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
      closePopover(!isInteractive);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('click', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('click', handleOutside);
    };
  }, [open, signedIn, exporting, closePopover]);

  const clearToast = useCallback(() => setToast(null), []);

  const handleTriggerClick = () => {
    if (!signedIn) {
      window.dispatchEvent(new CustomEvent('dabia:unauthorized'));
      return;
    }
    if (allEmpty) return;
    if (open) {
      if (!exporting) {
        closePopover(true);
      }
      return;
    }
    const defaultScope = options.find((opt) => opt.count > 0)?.key ?? 'list';
    setSelectedScope(defaultScope);
    setExportError(null);
    setOpen(true);
  };

  const handleExport = async () => {
    if (exporting || selectedOption.count === 0) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportWords(selectedOption.query);
      if (!mountedRef.current) return;
      setExporting(false);
      closePopover(true);
      toastCounterRef.current += 1;
      setToast({
        id: toastCounterRef.current,
        message: t.export.success(selectedOption.count),
      });
    } catch {
      if (!mountedRef.current) return;
      setExporting(false);
      setExportError(t.export.error);
    }
  };

  const buttonClassName =
    'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D97757] bg-[#FFFFFF] px-3 sm:px-3.5 text-sm font-medium text-[#D97757] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#B05030] hover:bg-[#F2DCD6]/50 hover:text-[#B05030] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] disabled:cursor-not-allowed disabled:border-[#E6E6E3] disabled:bg-[#F2F0EF] disabled:text-[#888888] disabled:hover:bg-[#F2F0EF]';

  if (!signedIn) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          aria-label={t.export.signIn}
          title={t.export.signIn}
          className={buttonClassName}
        >
          <Download size={16} aria-hidden="true" className="shrink-0" />
          <span className="hidden sm:inline">{t.export.signIn}</span>
        </button>
        {toast && <Toast key={toast.id} message={toast.message} onClose={clearToast} />}
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <span
        className="inline-flex"
        title={allEmpty ? t.export.emptyTooltip : undefined}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          disabled={allEmpty}
          aria-label={t.export.button}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={allEmpty ? t.export.emptyTooltip : undefined}
          className={buttonClassName}
        >
          <Download size={16} aria-hidden="true" className="shrink-0" />
          <span className="hidden sm:inline">{t.export.button}</span>
        </button>
      </span>

      {open && (
        <div
          ref={popoverRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E6E6E3] bg-[#FFFFFF] p-4 shadow-[0_12px_32px_-8px_rgba(42,42,41,0.18)] focus:outline-none"
        >
          <h2 id={titleId} className="mb-3 text-sm font-medium text-[#2A2A29]">
            {t.export.title}
          </h2>

          <div role="radiogroup" aria-labelledby={titleId} className="space-y-2">
            {options.map((opt) => {
              const isDisabled = opt.count === 0;
              const isSelected = effectiveScope === opt.key && !isDisabled;
              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${
                    isDisabled
                      ? 'cursor-not-allowed border-[#E6E6E3] bg-[#F2F0EF] opacity-70'
                      : isSelected
                        ? 'cursor-pointer border-[#D97757] bg-[#F2DCD6]/40'
                        : 'cursor-pointer border-[#E6E6E3] bg-[#FFFFFF] hover:border-[#E5A087]'
                  }`}
                >
                  <input
                    type="radio"
                    name={radioGroupName}
                    value={opt.key}
                    checked={isSelected}
                    disabled={isDisabled || exporting}
                    onChange={() => {
                      setSelectedScope(opt.key);
                      setExportError(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#D97757] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-medium ${
                        isDisabled ? 'text-[#888888]' : 'text-[#2A2A29]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#888888] tabular-nums">
                      {opt.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#888888]">
            {t.export.columnsNote}
          </p>

          {exportError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-[#E5A087] bg-[#F2DCD6]/50 px-3 py-2 text-xs text-[#B05030]"
            >
              {exportError}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => closePopover(true)}
              className="rounded-xl border border-[#E6E6E3] bg-[#FFFFFF] px-3.5 py-1.5 text-sm font-medium text-[#2A2A29] transition-colors hover:border-[#888888] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
            >
              {t.export.cancel}
            </button>
            <button
              type="button"
              disabled={exporting || selectedOption.count === 0}
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D97757] px-4 py-1.5 text-sm font-medium text-[#FFFFFF] transition-colors hover:bg-[#B05030] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
            >
              {exporting && <Loader2 size={14} aria-hidden="true" className="animate-spin" />}
              <span>{t.export.confirm}</span>
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} onClose={clearToast} />}
    </div>
  );
};

export default ExportButton;
