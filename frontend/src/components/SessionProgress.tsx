import React from 'react';
import { Check } from 'lucide-react';
import type { SessionProgress as SessionProgressType } from '../services/api';
import { useI18n } from '../i18n/LanguageProvider';

interface SessionProgressProps {
  progress: SessionProgressType;
  headerLeft?: React.ReactNode;
}

const RING_SIZE = 20;
const STROKE = 2.5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Session toolbar above the flashcard: optional left slot and a compact daily-goal ring. */
const SessionProgress: React.FC<SessionProgressProps> = ({ progress, headerLeft }) => {
  const { completed_today: done, goal_today: goal } = progress;
  const t = useI18n().messages.session;
  const ratio = goal > 0 ? Math.min(done / goal, 1) : 0;
  const reached = goal > 0 && done >= goal;

  return (
    <div className="w-full max-w-2xl mb-4 flex items-center justify-between min-h-[2rem]">
      <div className="flex items-center">{headerLeft}</div>

      <div
        role="progressbar"
        aria-label={t.dailyGoal}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={done}
        title={t.dailyGoal}
        className={`inline-flex h-8 items-center gap-2 rounded-full border pl-1.5 pr-3 text-sm transition-colors ${reached
          ? 'border-[#F2DCD6] bg-[#F2DCD6]/50'
          : 'border-[#E6E6E3] bg-white'
          }`}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="-rotate-90" aria-hidden="true">
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} fill="none" stroke="#F2DCD6" strokeWidth={STROKE} />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill={reached ? '#D97757' : 'none'}
              stroke="#D97757"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>
          {reached && (
            <Check data-testid="goal-complete" size={11} strokeWidth={3.5} className="absolute text-white" />
          )}
        </span>
        <span className="tabular-nums font-medium text-[#2A2A29]">
          {done} <span className="text-[#A3A39D]">/ {goal}</span>
        </span>
        <span className="text-[#74746E]">{t.today}</span>
      </div>
    </div>
  );
};

export default SessionProgress;
