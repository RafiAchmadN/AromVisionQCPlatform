'use client';
import { useState } from 'react';
import { OperatorCameraPanel } from './camera-panel';
import { OperatorLotPanel } from './lot-panel';

export interface ActiveSession {
  lotId: string;
  sessionId: string;
  lotCode: string;
}

interface Props {
  operatorId: string;
  operatorName: string;
}

export function OperatorWorkspace({ operatorId, operatorName }: Props) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-1/2 border-r border-brand-200 flex flex-col overflow-hidden">
        <OperatorCameraPanel activeSession={activeSession} />
      </div>
      <div className="w-1/2 flex flex-col overflow-hidden">
        <OperatorLotPanel
          operatorId={operatorId}
          operatorName={operatorName}
          onSessionStart={(lotId, sessionId, lotCode) =>
            setActiveSession({ lotId, sessionId, lotCode })
          }
          onSessionEnd={() => setActiveSession(null)}
        />
      </div>
    </div>
  );
}
