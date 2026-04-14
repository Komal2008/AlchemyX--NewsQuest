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
  const timeoutPromise = new Promise<never>((_resolve, reject) => 
    setTimeout(() => reject(new Error('Leaderboard request timed out')), 12000)
  );
  
  const fetchPromise = (async () => {
    const response = await fetch(apiUrl('/leaderboard'));
    
    // Check if response status is OK
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    // Get the response text first to check it's valid
    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('Empty response from server');
    }
    
    // Try to parse the JSON
    try {
      const data = JSON.parse(text) as LeaderboardResponse;
      if (!data.success) {
        throw new Error(data.error || 'Server returned failure');
      }
      return data;
    } catch (parseError) {
      console.error('Failed to parse leaderboard response:', parseError);
      throw new Error('Invalid response format from server');
    }
  })();
  
  return Promise.race([fetchPromise, timeoutPromise]) as Promise<LeaderboardResponse>;
};
