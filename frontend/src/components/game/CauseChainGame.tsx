import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap } from 'lucide-react';
import { CauseChainBuilder } from '@/components/game/CauseChainBuilder';
import { CauseChainResult } from '@/components/game/CauseChainResult';
import { GlassCard } from '@/components/game/GlassCard';
import {
  getOrGenerateChallenge,
  submitCauseChainAttempt,
  type CauseChainChallenge,
  type CauseChainSubmitResponse,
} from '@/lib/causeChainApi';
import { recordCauseChainProgress } from '@/lib/progressSync';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/useAuthStore';

interface CauseChainGameProps {
  articleId: string;
  headline: string;
  summary: string;
  category: string;
  onClose: () => void;
}

export const CauseChainGame = ({
  articleId,
  headline,
  summary,
  category,
  onClose,
}: CauseChainGameProps) => {
  const { user } = useGameStore();
  const { user: authUser } = useAuthStore();
  const [challenge, setChallenge] = useState<CauseChainChallenge | null>(null);
  const [result, setResult] = useState<CauseChainSubmitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load or generate challenge
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        setLoading(true);
        const challenge = await getOrGenerateChallenge(articleId, headline, summary, category);
        setChallenge(challenge);
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load challenge';
        setError(message);
        console.error('Error loading challenge:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [articleId, headline, summary, category]);

  const handleSubmit = async (userChain: string[], userConnections: Array<{ from: string; to: string }>) => {
    if (!challenge || !authUser) {
      setError('Challenge or user data missing');
      return;
    }

    try {
      setSubmitting(true);
      console.log('[CauseChainGame] Submitting attempt:', {
        challengeId: challenge.id,
        articleId,
        userId: authUser.id,
        userChainLength: userChain.length,
        userConnectionsLength: userConnections.length,
      });
      const response = await submitCauseChainAttempt(
        challenge.id,
        articleId,
        authUser.id,
        userChain,
        userConnections,
      );

      console.log('[CauseChainGame] Submission response:', response);
      setResult(response);

      // Record progress which syncs to Supabase
      const isCorrect = response.validation.allCorrect;
      const netXP = response.xp_earned - response.xp_penalty;
      console.log('[CauseChainGame] Recording progress:', { isCorrect, xp_earned: response.xp_earned, xp_penalty: response.xp_penalty, netXP });
      
      recordCauseChainProgress(isCorrect, netXP, { title: headline, category });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit attempt';
      setError(message);
      console.error('Error submitting attempt:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-2xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition-colors text-slate-300 font-medium"
          >
            <ArrowLeft size={18} />
            Back
          </motion.button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nq-orange/20 border border-nq-orange/50">
            <Zap size={18} className="text-nq-orange" />
            <span className="text-sm font-bold text-nq-orange">CAUSE CHAIN</span>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <GlassCard key="loading" className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                <Zap size={32} className="text-nq-orange" />
              </motion.div>
              <p className="mt-4 text-slate-300">Generating challenge...</p>
            </GlassCard>
          ) : error && !challenge ? (
            <GlassCard key="error" className="text-center py-8">
              <p className="text-red-400 font-medium mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-nq-orange/70 hover:bg-nq-orange text-white font-semibold"
              >
                Retry
              </button>
            </GlassCard>
          ) : challenge && !result ? (
            <CauseChainBuilder
              key="builder"
              challenge={challenge}
              onSubmit={handleSubmit}
              isLoading={submitting}
            />
          ) : result ? (
            <CauseChainResult
              key="result"
              result={{
                percentageCorrect: result.percentage_correct,
                allCorrect: result.validation.allCorrect,
                hasDistractor: result.has_distractor,
                feedback: result.validation.feedback,
                aiFeedback: result.ai_feedback,
                xpEarned: result.xp_earned,
                xpPenalty: result.xp_penalty,
                correctConnections: result.correct_connections,
                totalConnections: result.total_connections,
              }}
              onClose={handleResultClose}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
