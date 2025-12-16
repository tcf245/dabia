import type { SessionProgress as SessionProgressType } from '../services/api';

interface SessionProgressProps {
  progress: SessionProgressType;
  headerLeft?: React.ReactNode;
}

const SessionProgress: React.FC<SessionProgressProps> = ({ progress, headerLeft }) => {
  const percentage = progress.goal_today > 0 ? Math.min((progress.completed_today / progress.goal_today) * 100, 100) : 0;

  return (
    <div className="w-full max-w-2xl px-4 mb-4">
      <div className="flex justify-between items-end mb-1 text-sm font-medium text-muted-foreground min-h-[2rem]">
        <div className="flex items-center">
          {headerLeft}
        </div>
        <div className="flex items-center gap-2">
          <span>Daily Goal</span>
          <span>{progress.completed_today} / {progress.goal_today}</span>
        </div>
      </div>
      <div className="w-full bg-secondary rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default SessionProgress;
