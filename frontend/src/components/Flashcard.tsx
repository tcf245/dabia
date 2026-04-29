import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, MessageCircle, Braces } from 'lucide-react';
import ProficiencyIndicator from './ProficiencyIndicator';
import ProficiencyLevelModal from './ProficiencyLevelModal';
import { useFlashcardLogic } from '../hooks/useFlashcardLogic';
import type { UseFlashcardLogicProps } from '../hooks/useFlashcardLogic';
import { getCardGrammar, type CardGrammarAnnotation } from '../services/api';

// Re-export or use the type from the hook to ensure consistency
type FlashcardProps = UseFlashcardLogicProps;

const Flashcard: React.FC<FlashcardProps> = (props) => {
  const { card, mode = 'quiz' } = props;
  // Type-safe extraction of onContinue
  const onContinue = props.mode === 'review' ? props.onContinue : undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGrammarOpen, setIsGrammarOpen] = useState(false);
  const [grammarAnnotations, setGrammarAnnotations] = useState<CardGrammarAnnotation[] | null>(null);
  const [isGrammarLoading, setIsGrammarLoading] = useState(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);

  const {
    userInput,
    setUserInput,
    answerState,
    inputRef,
    handleCheck,
    handleKeyPress,
    playSentenceAudio,
    isPlayingAudio,
    canPlayAudio,
    displayedProficiency
  } = useFlashcardLogic(props);

  const sentenceParts = card.sentence_template.split('__');

  useEffect(() => {
    setIsGrammarOpen(false);
    setGrammarAnnotations(null);
    setIsGrammarLoading(false);
    setGrammarError(null);
  }, [card.card_id]);

  const toggleGrammarPanel = async () => {
    const nextOpen = !isGrammarOpen;
    setIsGrammarOpen(nextOpen);

    if (!nextOpen || grammarAnnotations !== null || isGrammarLoading) {
      return;
    }

    setIsGrammarLoading(true);
    setGrammarError(null);

    try {
      const response = await getCardGrammar(card.card_id);
      setGrammarAnnotations(response.annotations);
    } catch (error) {
      console.error(error);
      setGrammarError('Could not load grammar details right now.');
    } finally {
      setIsGrammarLoading(false);
    }
  };

  const getInputClasses = () => {
    if (answerState === 'unanswered') {
      return 'border-b-2 border-input focus:border-primary';
    }
    return answerState === 'correct'
      ? 'border-none rounded-lg bg-[#D97757]/10 shadow-[0_2px_8px_rgba(217,119,87,0.15)] text-[#D97757]'
      : 'border-b-2 border-destructive bg-destructive/10';
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl border border-[#E6E6E3] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 mb-4">
        {/* Hint and Proficiency Indicator */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex flex-col gap-4">
            <ProficiencyIndicator
              level={displayedProficiency}
              onClick={() => setIsModalOpen(true)}
            />
            <div className="flex items-center gap-3 text-[#2A2A29]">
              <div className="w-8 h-8 rounded-lg bg-[#F2F0EF] flex items-center justify-center text-[#999999]">
                <MessageCircle size={16} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-light">{card.target.hint}</span>
            </div>
          </div>
        </div>

        {/* Sentence and Input */}
        <div className="mb-8">
          <div className="text-3xl text-foreground font-serif font-light leading-relaxed text-center">
            {mode === 'review' ? (
              <span>
                {sentenceParts[0]}
                <span className="inline-block mx-2 px-2 py-1 rounded-lg bg-[#D97757]/10 shadow-[0_2px_8px_rgba(217,119,87,0.15)] text-[#D97757] font-medium">
                  {card.target.word}
                </span>
                {sentenceParts[1]}
              </span>
            ) : (
              <>
                {sentenceParts[0]}
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`inline-block mx-2 px-2 py-1 focus:outline-none text-center transition-all duration-300 ${getInputClasses()}`}
                  style={{ width: `${Math.max(card.target.word.length * 1.5 + 2, 10)}ch` }}
                  disabled={answerState === 'correct'}
                  placeholder=""
                />
                {sentenceParts[1]}
              </>
            )}
          </div>
        </div>

        {/* Feedback Area */}
        <div className="h-12 flex items-center justify-center">
          {mode === 'review' ? (
            <div className="flex items-center gap-2 text-primary font-semibold text-xl">
              <span>{card.target.word === card.reading ? card.reading : `${card.target.word} (${card.reading})`}</span>
            </div>
          ) : (
            <AnimatePresence>
              {answerState === 'incorrect' && (
                <motion.div
                  key="incorrect"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 text-muted-foreground font-semibold"
                >
                  <X size={20} />
                  <span>{card.target.word === card.reading ? card.reading : `${card.target.word} (${card.reading})`}</span>
                </motion.div>
              )}
              {answerState === 'correct' && (
                <motion.div
                  key="correct"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 text-primary font-semibold text-xl"
                >
                  <span>{card.target.word === card.reading ? card.reading : `${card.target.word} (${card.reading})`}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-6 border-t border-dashed border-[#E6E6E3] flex justify-between items-center">
          <span className="text-base font-light text-[#74746E] text-left">{card.sentence_translation}</span>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleGrammarPanel}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97757] border border-[#E6E6E3] text-[#5F5F59] hover:text-[#2A2A29] hover:border-[#D97757]/40 h-10 rounded-xl px-4 text-sm"
              aria-label={isGrammarOpen ? 'Hide grammar' : 'Show grammar'}
              type="button"
            >
              <Braces size={16} strokeWidth={1.75} />
              <span>{isGrammarOpen ? 'Hide Grammar' : 'Show Grammar'}</span>
            </button>

            {/* Audio Button */}
            {card.sentence_audio_url && (
              <button
                onClick={playSentenceAudio}
                disabled={!canPlayAudio}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${!canPlayAudio
                  ? 'text-gray-300 cursor-not-allowed bg-transparent'
                  : isPlayingAudio
                    ? 'text-[#D97757] bg-[#D97757]/10'
                    : 'text-[#999999] hover:text-[#D97757] hover:bg-[#F2DCD6]/20'
                  }`}
                aria-label="Play audio"
                title="Play audio"
              >
                <Volume2 size={24} strokeWidth={1.5} />
              </button>
            )}

            {/* Main Action Button */}
            {mode !== 'review' && (answerState === 'unanswered' || answerState === 'incorrect') && (
              <button
                onClick={handleCheck}
                className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97757] disabled:bg-[#F2F0EF] disabled:text-[#999] disabled:cursor-not-allowed shadow-sm h-10 rounded-xl px-6 text-sm ${
                  !userInput.trim()
                    ? 'bg-[#2A2A29] text-white hover:bg-[#40403F]'
                    : 'bg-[#D97757] text-white hover:bg-[#C96642]'
                }`}
              >
                {!userInput.trim() ? 'Learn' : 'Submit'}
              </button>
            )}
            {mode === 'review' && (
              <button
                onClick={onContinue}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97757] bg-[#D97757] text-white shadow-sm hover:bg-[#C96642] h-10 rounded-xl px-6 text-sm"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {isGrammarOpen && (
          <div className="mt-6 pt-6 border-t border-dashed border-[#E6E6E3]" data-testid="grammar-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium tracking-[0.08em] uppercase text-[#74746E]">Grammar Skeleton</h3>
              <span className="text-xs text-[#999999]">{card.sentence || card.sentence_template}</span>
            </div>

            {isGrammarLoading && <p className="text-sm text-[#74746E]">Loading grammar details...</p>}
            {grammarError && <p className="text-sm text-destructive">{grammarError}</p>}
            {!isGrammarLoading && !grammarError && grammarAnnotations?.length === 0 && (
              <p className="text-sm text-[#74746E]">No grammar annotations are available for this card yet.</p>
            )}

            {!isGrammarLoading && !grammarError && grammarAnnotations && grammarAnnotations.length > 0 && (
              <div className="space-y-3">
                {grammarAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="rounded-2xl border border-[#E6E6E3] bg-[#F9F7F6] px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#2A2A29]">
                            {annotation.grammar_point.title}
                          </span>
                          {annotation.role_label && (
                            <span className="rounded-full bg-[#F2DCD6] px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[#B05030]">
                              {annotation.role_label}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#5F5F59]">{annotation.grammar_point.short_meaning}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-[#74746E]">
                        {annotation.surface_text}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-[#2A2A29]">{annotation.explanation_for_sentence}</p>

                    {(annotation.grammar_point.formation || annotation.grammar_point.jlpt_level) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#74746E]">
                        {annotation.grammar_point.formation && (
                          <span className="rounded-full bg-white px-2 py-1">{annotation.grammar_point.formation}</span>
                        )}
                        {annotation.grammar_point.jlpt_level && (
                          <span className="rounded-full bg-white px-2 py-1">{annotation.grammar_point.jlpt_level}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ProficiencyLevelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Flashcard;
