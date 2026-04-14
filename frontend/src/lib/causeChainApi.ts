export interface CauseChainNode {
  id: string;
  text: string;
  isDistractor: boolean;
}

export interface CauseChainEdge {
  from: string;
  to: string;
  explanation: string;
}

export interface CauseChainChallenge {
  id: string;
  article_id: string;
  question: string;
  nodes: CauseChainNode[];
  edges: CauseChainEdge[];
  difficulty: string;
  created_at: string;
}

export interface CauseChainSubmitResponse {
  id: string;
  user_id: string;
  challenge_id: string;
  article_id: string;
  user_chain: string[];
  user_connections: Array<{ from: string; to: string }>;
  correct_connections: number;
  total_connections: number;
  has_distractor: boolean;
  xp_earned: number;
  xp_penalty: number;
  score: number;
  percentage_correct: number;
  ai_feedback: string;
  status: string;
  validation: {
    correctConnections: number;
    totalConnections: number;
    percentageCorrect: number;
    hasDistractor: boolean;
    feedback: string;
    allCorrect: boolean;
  };
  newTotalXP: number;
}

export const CAUSE_CHAIN_API_BASE = '/api/cause-chain';

export const fetchCauseChainChallenge = async (
  articleId: string,
): Promise<CauseChainChallenge | null> => {
  try {
    const response = await fetch(`${CAUSE_CHAIN_API_BASE}/${articleId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch challenge');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }
};

export const generateCauseChainChallenge = async (
  articleId: string,
  headline: string,
  summary: string,
  category: string,
): Promise<CauseChainChallenge> => {
  const response = await fetch(`${CAUSE_CHAIN_API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articleId,
      headline,
      summary,
      category,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate challenge');
  }

  return response.json();
};

export const submitCauseChainAttempt = async (
  challengeId: string,
  articleId: string,
  userId: string,
  userChain: string[],
  userConnections: Array<{ from: string; to: string }>,
): Promise<CauseChainSubmitResponse> => {
  const response = await fetch(`${CAUSE_CHAIN_API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      articleId,
      userId,
      userChain,
      userConnections,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit attempt');
  }

  return response.json();
};

export const fetchCauseChainStats = async (userId: string) => {
  console.log('[fetchCauseChainStats] Fetching stats for userId:', userId);
  const url = `${CAUSE_CHAIN_API_BASE}/stats/${userId}`;
  console.log('[fetchCauseChainStats] URL:', url);
  const response = await fetch(url);

  if (!response.ok) {
    console.error('[fetchCauseChainStats] Response not ok:', response.status, response.statusText);
    throw new Error('Failed to fetch stats');
  }

  const data = await response.json();
  console.log('[fetchCauseChainStats] Response data:', data);
  return data;
};

export const getOrGenerateChallenge = async (
  articleId: string,
  headline: string,
  summary: string,
  category: string,
): Promise<CauseChainChallenge> => {
  // Try to fetch existing
  const existing = await fetchCauseChainChallenge(articleId);
  if (existing) {
    return existing;
  }

  // Generate new
  return generateCauseChainChallenge(articleId, headline, summary, category);
};
