const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';
const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export type LeaderboardEntry = {
  id: string;
  username: string;
  avatarId: number;
  level: number;
  totalXP: number;
  streak: number;
  quizzesTotal: number;
  quizzesCorrect: number;
  predictionsTotal: number;
  predictionsCorrect: number;
  accuracy: number;
  oracleScore: number;
  weeklyScore: number;
};

type LeaderboardResponse = {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  generatedAt: string;
  weekStart: string;
};

export const fetchLeaderboard = async () => {
  const response = await fetch(apiUrl('/leaderboard'));
  const data = await response.json() as LeaderboardResponse;
  if (!response.ok || !data.success) {
    throw new Error('Failed to load leaderboard.');
  }
  return data;
};
