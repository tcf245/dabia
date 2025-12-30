import { useState, useEffect } from 'react';
import * as api from '../services/api';
// Using inline SVGs to avoid dependency issues if lucide-react is not installed
// or if version mismatches occur. This ensures the UI renders exactly as requested.

const Icons = {
  Layers: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  ),
};

const getDifficultyColor = (difficulty: string) => {
    const d = difficulty?.toLowerCase() || '';
    if (d === 'basic' || d === 'beginner') return 'text-emerald-600/70';
    if (d === 'advanced' || d === 'expert') return 'text-[#D97757]/80';
    return 'text-[#888888]';
};

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
                setDecks(allDecks);
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
            <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
                <div className="flex flex-col items-center gap-4">
                     <div className="animate-spin text-[#D97757]">
                        <Icons.Layers size={32} />
                     </div>
                     <p className="text-[#888888] font-light">Loading library...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 pt-12 px-6 bg-[#F9F9F8] w-full max-w-4xl mx-auto animate-fade-in">
          <header className="mb-10 text-center md:text-left">
            <h1 className="font-serif text-[40px] text-[#1A1A1A] leading-tight mb-2">
              Library
            </h1>
            <p className="font-sans text-[#888888] font-light tracking-wide">
              Select collections for your daily review.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {decks.map((deck) => {
              const isActive = selectedDeckIds.includes(deck.id);
              const difficultyColor = getDifficultyColor(deck.difficulty);
              
              return (
                <div 
                  key={deck.id}
                  onClick={() => handleToggle(deck.id)}
                  className={`
                    relative rounded-[20px] border p-6 cursor-pointer transition-all duration-300 group
                    ${isActive 
                      ? 'bg-white border-[#D97757] shadow-[0_8px_30px_rgba(217,119,87,0.15)]' 
                      : 'bg-white border-[#E6E6E3] hover:border-[#D0D0D0] shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-6">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {deck.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-md bg-[#F2F0EF] text-[#888888] text-[10px] font-medium uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <h3 className={`font-serif text-xl font-bold mb-2 ${isActive ? 'text-[#D97757]' : 'text-[#2A2A29]'}`}>
                        {deck.name}
                      </h3>
                      <p className="text-[#888888] text-sm font-light leading-relaxed line-clamp-2 min-h-[40px]">
                        {deck.description || "No description provided."}
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
                    <span className="text-xs text-[#999999] font-mono tracking-wider">
                      {deck.count} CARDS
                    </span>
                    <span className={`text-xs font-medium ${difficultyColor}`}>
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
