import type { SessionProgress as SessionProgressType } from '../services/api';

interface SessionProgressProps {
  progress: SessionProgressType;
}

const SessionProgress: React.FC<SessionProgressProps> = ({ progress }) => {
  const percentage = progress.goal_today > 0 ? (progress.completed_today / progress.goal_today) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-200">
      <div 
        className="bg-sora-iro h-1.5 transition-all duration-500 ease-in-out"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default SessionProgress;
