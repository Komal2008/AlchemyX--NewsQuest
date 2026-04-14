import { createContext, type ReactNode } from 'react';
import { useBattleSocket, type BattleSocketContextValue } from '@/hooks/useBattleSocket';

export const BattleSocketContext = createContext<BattleSocketContextValue | null>(null);

export const BattleSocketProvider = ({ children }: { children: ReactNode }) => {
    const socketState = useBattleSocket();
    return <BattleSocketContext.Provider value={socketState}>{children}</BattleSocketContext.Provider>;
};