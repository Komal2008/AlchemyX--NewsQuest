import { useContext } from 'react';
import { BattleSocketContext } from './BattleSocketProvider';
import type { BattleSocketContextValue } from '@/hooks/useBattleSocket';

export const useBattleSocketContext = (): BattleSocketContextValue => {
    const context = useContext(BattleSocketContext);
    if (!context) {
        throw new Error('useBattleSocketContext must be used within BattleSocketProvider');
    }
    return context;
};
