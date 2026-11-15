import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import * as api from '../services/api';
import { deckDescription, deckTitle, isGrammarDeck, sortDecks } from '../utils/decks';
const DeckManagement = () => {
    const [decks, setDecks] = useState<api.Deck[]>([]);
    const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [allDecks, settings] = await Promise.all([
                    api.getDecks(),
                    api.getDeckSettings()
                ]);
                setDecks(sortDecks(allDecks));
                setSelectedDeckIds(settings.active_deck_ids);
            } catch (error) {
                console.error("Failed to load deck data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleToggle = async (deckId: string) => {
        // Optimistic update
        const newSelected = selectedDeckIds.includes(deckId)
            ? selectedDeckIds.filter(id => id !== deckId)
            : [...selectedDeckIds, deckId];
            
        setSelectedDeckIds(newSelected);
        setSaving(true);
        try {
            await api.updateDeckSettings({ active_deck_ids: newSelected });
        } catch (error) {
            console.error("Failed to save deck settings:", error);
            // Revert logic could go here
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                     <div className="animate-spin text-[#D97757]">
                        <Layers size={32} />
                     </div>
                     <p className="text-[#888888] font-light">Loading library...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24 w-full max-w-4xl mx-auto animate-fade-in">
          <header className="text-center mb-12">
            <h1 className="font-serif text-5xl font-normal text-[#1A1A1A] mb-4 tracking-tight" style={{ lineHeight: '1' }}>
              Library
            </h1>
            <p className="text-[#888] text-sm font-light tracking-wider mt-3">
              选择用于每日复习的词库。
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {decks.map((deck) => {
              const isActive = selectedDeckIds.includes(deck.id);
              const grammar = isGrammarDeck(deck);
              
              return (
                <div 
                  key={deck.id}
                  role="switch"
                  aria-checked={isActive}
                  aria-label={deckTitle(deck.name)}
                  tabIndex={0}
                  onClick={() => handleToggle(deck.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggle(deck.id);
                    }
                  }}
                  className={`
                    relative rounded-[20px] border p-6 cursor-pointer transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2
                    ${isActive 
                      ? 'bg-white border-[#D97757] shadow-[0_8px_30px_rgba(217,119,87,0.15)]' 
                      : 'bg-white border-[#E6E6E3] hover:border-[#D0D0D0] shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-6">
                      <span className="inline-block mb-3 px-2 py-0.5 rounded-md bg-[#F2F0EF] text-[#74746E] text-[10px] font-medium uppercase tracking-wider">
                        {grammar ? 'Grammar' : 'Vocabulary'}
                      </span>
                      <h3 className={`font-serif text-xl font-bold mb-2 ${isActive ? 'text-[#D97757]' : 'text-[#2A2A29]'}`}>
                        {deckTitle(deck.name)}
                      </h3>
                      <p className="text-[#74746E] text-sm font-light leading-relaxed line-clamp-2">
                        {deckDescription(deck)}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className={`
                      w-12 h-7 rounded-full flex items-center transition-colors duration-300 p-1 flex-shrink-0 mt-1
                      ${isActive ? 'bg-[#D97757]' : 'bg-[#E6E6E3] group-hover:bg-[#D0D0D0]'}
                    `}>
                      <div className={`
                        bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-out
                        ${isActive ? 'translate-x-5' : 'translate-x-0'}
                      `}/>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F2F0EF] flex items-center justify-between">
                    <span className="text-xs text-[#74746E] tabular-nums">
                      {deck.count.toLocaleString('en-US')} cards
                    </span>
                    <span className="text-xs font-medium text-[#74746E]">
                      {deck.difficulty || 'Unknown'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
           {saving && (
                <div className="fixed bottom-6 right-6 bg-[#2A2A29] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3 animate-fade-in z-50">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm font-medium tracking-wide">Saving changes...</span>
                </div>
            )}
        </div>
    );
};

export default DeckManagement;
