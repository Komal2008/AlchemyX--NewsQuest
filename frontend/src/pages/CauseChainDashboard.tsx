import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, BookOpen, Trophy, TrendingUp, Brain } from 'lucide-react';
import { HUDBar } from '@/components/game/HUDBar';
import { GlassCard } from '@/components/game/GlassCard';
import { CauseChainGame } from '@/components/game/CauseChainGame';
import { useGameStore } from '@/store/gameStore';
import { fetchCauseChainStats } from '@/lib/causeChainApi';
import { useAuthStore } from '@/store/useAuthStore';

const CauseChainDashboard = () => {
  const { feed } = useGameStore();
  const { user: authUser } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    xpEarned: 0,
    accuracy: 0,
  });
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('[CauseChainDashboard] Auth user ID:', authUser?.id);
  const articles = feed.articles.slice(0, 12); // Show first 12 articles

  useEffect(() => {
    const loadStats = async () => {
      if (authUser) {
        try {
          console.log('[CauseChainDashboard] Initial load - fetching stats for:', authUser.id);
          const data = await fetchCauseChainStats(authUser.id);
          console.log('[CauseChainDashboard] Initial stats loaded:', data);
          setStats(data);
        } catch (error) {
          console.error('Error loading stats:', error);
        }
      }
      setLoading(false);
    };

    loadStats();
  }, [authUser]);

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  const reloadStats = async () => {
    if (authUser) {
      try {
        // Add delay to ensure backend completes update
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[CauseChainDashboard] Reloading stats for user:', authUser.id);
        const data = await fetchCauseChainStats(authUser.id);
        console.log('[CauseChainDashboard] Stats reloaded:', data);
        setStats(data);
      } catch (error) {
        console.error('Error reloading stats:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-nq-void grain-overlay pb-20">
      <HUDBar />

      <div className="pt-20 max-w-[1200px] mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-nq-orange" />
            <h1 className="text-3xl font-bold text-white">Cause Chain Builder</h1>
          </div>
        </motion.div>

        {/* Challenge Browser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Available Challenges</h2>
              <p className="text-sm text-slate-400">Select an article to build its cause-effect chain</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nq-orange/20 border border-nq-orange/50">
              <Zap size={18} className="text-nq-orange" />
              <span className="text-sm font-bold text-nq-orange">40 XP per challenge</span>
            </div>
          </div>

          {/* Article Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, index) => (
              <motion.button
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedArticle(article.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-left"
              >
                <GlassCard
                  className={`h-full transition-all ${
                    selectedArticle === article.id
                      ? 'border-2 border-nq-orange bg-nq-orange/10'
                      : 'border border-slate-600/30 hover:border-nq-orange/50'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Category & Difficulty */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-nq-cyan/20 text-nq-cyan">
                        {article.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          article.difficulty === 'Easy'
                            ? 'bg-green-500/20 text-green-300'
                            : article.difficulty === 'Medium'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {article.difficulty}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-white line-clamp-3 text-sm">
                      {article.headline}
                    </h3>

                    {/* Footer */}
                    <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <BookOpen size={12} />
                        {article.readTime}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-nq-orange font-bold">
                        <Zap size={12} />
                        +40 XP
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 p-6 rounded-lg bg-slate-800/30 border border-slate-700/50"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain size={20} className="text-nq-orange" />
            How it works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-bold text-nq-orange mb-2">① Select Nodes</div>
              <p className="text-sm text-slate-400">
                Pick event nodes from the article. Some are real events, others are distractors.
              </p>
            </div>
            <div>
              <div className="text-sm font-bold text-nq-orange mb-2">② Create Connections</div>
              <p className="text-sm text-slate-400">
                Link events together to show cause-effect relationships. Build a logical chain.
              </p>
            </div>
            <div>
              <div className="text-sm font-bold text-nq-orange mb-2">③ Earn XP</div>
              <p className="text-sm text-slate-400">
                Submit your chain for validation. Earn 0-40 XP based on accuracy.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Game Modal */}
      <AnimatePresence>
        {selectedArticle && selectedArticleData && (
          <CauseChainGame
            articleId={selectedArticleData.id}
            headline={selectedArticleData.headline}
            summary={selectedArticleData.summary}
            category={selectedArticleData.category}
            onClose={async () => {
              console.log('[CauseChainDashboard] Game closed, reloading stats');
              setSelectedArticle(null);
              await reloadStats();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CauseChainDashboard;
