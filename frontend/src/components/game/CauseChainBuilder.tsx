import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle, Plus, Trash2, Lock } from 'lucide-react';
import { GlassCard } from './GlassCard';
import type { CauseChainNode, CauseChainEdge } from '@/lib/causeChainApi';

interface CauseChainBuilderProps {
  challenge: {
    id: string;
    question: string;
    nodes: CauseChainNode[];
    edges: CauseChainEdge[];
    difficulty: string;
  };
  onSubmit: (userChain: string[], userConnections: Array<{ from: string; to: string }>) => Promise<void>;
  isLoading?: boolean;
}

export const CauseChainBuilder = ({ challenge, onSubmit, isLoading = false }: CauseChainBuilderProps) => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // Shuffle nodes for display
  const shuffledNodes = [...challenge.nodes].sort(() => Math.random() - 0.5);

  // Auto-generate connections from selected nodes (in order: 1->2->3->4...)
  const connections = selectedNodes.length > 1
    ? selectedNodes.slice(0, -1).map((nodeId, idx) => ({
        from: nodeId,
        to: selectedNodes[idx + 1],
      }))
    : [];

  const handleNodeClick = (nodeId: string) => {
    setError('');
    
    if (selectedNodes.includes(nodeId)) {
      // Remove node and any connections involving it
      setSelectedNodes(selectedNodes.filter(id => id !== nodeId));
      return;
    }

    // Add node (auto-connects to previous selection)
    setSelectedNodes([...selectedNodes, nodeId]);
  };

  const handleRemoveNode = (nodeId: string) => {
    const index = selectedNodes.indexOf(nodeId);
    setSelectedNodes(selectedNodes.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedNodes.length === 0) {
      setError('Select at least one event');
      return;
    }

    if (selectedNodes.length < 2) {
      setError('Build a chain with at least 2 events');
      return;
    }

    try {
      await onSubmit(selectedNodes, connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handleClear = () => {
    setSelectedNodes([]);
    setError('');
  };

  const getNodeText = (nodeId: string) =>
    challenge.nodes.find(n => n.id === nodeId)?.text || '';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label className="text-sm font-semibold text-nq-orange uppercase tracking-wider">
          Cause-Effect Challenge
        </label>
        <p className="text-lg font-bold text-white">{challenge.question}</p>
        <div className="flex gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold ${
              challenge.difficulty === 'Easy'
                ? 'bg-green-500/20 text-green-300'
                : challenge.difficulty === 'Medium'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
            }`}
          >
            {challenge.difficulty}
          </span>
        </div>
      </motion.div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Pool */}
      <GlassCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-nq-orange uppercase">Available Events (Click to Build Chain)</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shuffledNodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={`p-3 text-sm rounded-lg font-medium transition-colors ${
                  selectedNodes.includes(node.id)
                    ? 'bg-nq-orange/80 text-white shadow-lg shadow-nq-orange/50 border border-nq-orange'
                    : node.isDistractor
                      ? 'bg-slate-700/40 text-slate-300 border border-slate-600/50 hover:bg-slate-700/50'
                      : 'bg-slate-700/30 text-slate-200 border border-slate-600/30 hover:bg-slate-700/40'
                }`}
              >
                {node.text}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Selected Chain */}
      <GlassCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-nq-orange uppercase">Your Chain ({selectedNodes.length} events)</h3>

          {selectedNodes.length === 0 ? (
            <p className="text-sm text-slate-400">Select events in order to build your cause-effect chain</p>
          ) : (
            <div className="space-y-2">
              {selectedNodes.map((nodeId, index) => (
                <motion.div
                  key={nodeId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40 border border-slate-600/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-bold text-nq-orange bg-slate-800 px-2 py-1 rounded min-w-fit">
                      {index + 1}
                    </span>
                    <span className="text-sm text-slate-200">{getNodeText(nodeId)}</span>
                    {index < selectedNodes.length - 1 && (
                      <span className="text-nq-orange font-bold ml-auto">→</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveNode(nodeId)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Chain Preview */}
      {selectedNodes.length > 1 && (
        <GlassCard>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-nq-orange uppercase">Chain Connections</h3>
            <div className="space-y-2">
              {connections.map((conn, index) => (
                <motion.div
                  key={`${conn.from}-${conn.to}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-nq-blue/20 border border-nq-blue/50 text-sm"
                >
                  <CheckCircle size={14} className="text-nq-blue" />
                  <span className="text-slate-300">{getNodeText(conn.from)}</span>
                  <span className="text-nq-orange font-bold">→</span>
                  <span className="text-slate-300">{getNodeText(conn.to)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleSubmit}
          disabled={selectedNodes.length < 2 || isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-nq-orange to-nq-orange/80 hover:bg-nq-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-white shadow-lg"
        >
          <Lock size={18} />
          {isLoading ? 'Checking...' : 'LOCK IN CHAIN'}
        </button>

        <button
          onClick={handleClear}
          disabled={selectedNodes.length === 0 || isLoading}
          className="px-4 py-3 rounded-lg bg-slate-700/40 border border-slate-600/50 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-slate-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
