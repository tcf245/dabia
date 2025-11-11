import { Progress } from "@nextui-org/react";
import type { SessionProgress as SessionProgressType } from '../services/api';

interface SessionProgressProps {
  progress: SessionProgressType;
}

const SessionProgress: React.FC<SessionProgressProps> = ({ progress }) => {
  return (
    <Progress 
      aria-label="Session Progress" 
      value={progress.completed_today} 
      maxValue={progress.goal_today}
      className="w-full"
      classNames={{
        indicator: "bg-sora-iro",
      }}
    />
  );
};

export default SessionProgress;
