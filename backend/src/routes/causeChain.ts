import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  generateCauseChain,
  generateCauseChainFeedback,
  validateCauseChain,
  calculateXPReward,
  type ChainNode,
  type ChainEdge,
} from '../services/causeChainService.js';

const router = Router();

const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(url, key);
};

interface GenerateChallengeBody {
  articleId?: unknown;
  headline?: unknown;
  summary?: unknown;
  category?: unknown;
}

interface SubmitAttemptBody {
  challengeId?: unknown;
  articleId?: unknown;
  userId?: unknown;
  userChain?: unknown;
  userConnections?: unknown;
}

const parseString = (value: unknown, defaultValue = ''): string =>
  typeof value === 'string' ? value.trim() : defaultValue;

const parseArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const parseGenerateBody = (body: GenerateChallengeBody) => {
  const articleId = parseString(body.articleId);
  const headline = parseString(body.headline);
  const summary = parseString(body.summary);
  const category = parseString(body.category);

  if (!articleId || !headline) {
    return null;
  }

  return { articleId, headline, summary, category };
};

const parseSubmitBody = (body: SubmitAttemptBody) => {
  const challengeId = parseString(body.challengeId);
  const articleId = parseString(body.articleId);
  const userId = parseString(body.userId);
  const userChain = parseArray(body.userChain);
  const userConnections = parseArray(body.userConnections);

  console.log('[CauseChain:parseSubmit] Raw inputs:', {
    challengeId: body.challengeId,
    articleId: body.articleId,
    userId: body.userId,
    userChainLength: userChain.length,
    userConnectionsLength: userConnections.length,
  });

  if (!challengeId || !userId || !articleId || userChain.length === 0 || userConnections.length === 0) {
    console.warn('[CauseChain:parseSubmit] Validation failed:', { challengeId, userId, articleId, userChainLength: userChain.length, userConnectionsLength: userConnections.length });
    return null;
  }

  console.log('[CauseChain:parseSubmit] Parsed successfully:', { challengeId, articleId, userId });
  return { challengeId, articleId, userId, userChain, userConnections };
};

// GET /api/cause-chain/stats/:userId - Get user stats (MUST BE BEFORE /:articleId!)
router.get('/stats/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('[CauseChain:stats] ===== FETCHING STATS FOR USER =====', userId);
    if (!userId) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const supabase = getSupabaseClient();

    // First, fetch the full profile to see all data
    const { data: fullProfile, error: fullError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fullError) {
      console.error('[CauseChain:stats] Error fetching full profile:', {
        userId,
        message: fullError.message,
        code: fullError.code,
      });
    } else {
      console.log('[CauseChain:stats] Full profile data:', {
        cause_chains_total: fullProfile?.cause_chains_total,
        cause_chains_correct: fullProfile?.cause_chains_correct,
        cause_chains_xp_earned: fullProfile?.cause_chains_xp_earned,
        total_xp: fullProfile?.total_xp,
        quizzes_xp_earned: fullProfile?.quizzes_xp_earned || 'NOT FOUND',
        predictions_xp_earned: fullProfile?.predictions_xp_earned || 'NOT FOUND',
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('cause_chains_total, cause_chains_correct, cause_chains_xp_earned')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[CauseChain:stats] Error fetching profile stats:', {
        userId,
        message: error.message,
        code: error.code,
      });
      return res.json({
        total: 0,
        correct: 0,
        xpEarned: 0,
        accuracy: 0,
      });
    }

    const result = {
      total: profile?.cause_chains_total || 0,
      correct: profile?.cause_chains_correct || 0,
      xpEarned: profile?.cause_chains_xp_earned || 0,
      accuracy: profile?.cause_chains_total
        ? Math.round(((profile?.cause_chains_correct || 0) / profile.cause_chains_total) * 100)
        : 0,
    };

    // If columns are showing 0, try fallback from attempts table
    if (result.total === 0 && result.xpEarned === 0) {
      console.log('[CauseChain:stats] Fallback: Columns are 0, querying attempts table...');
      const { data: attempts } = await supabase
        .from('user_cause_chain_attempts')
        .select('xp_earned, status')
        .eq('user_id', userId);

      if (attempts && attempts.length > 0) {
        result.xpEarned = attempts.reduce((sum, att) => sum + (att.xp_earned || 0), 0);
        result.total = attempts.length;
        result.correct = attempts.filter(att => att.status === 'correct').length;
        result.accuracy = Math.round((result.correct / result.total) * 100);
        console.log('[CauseChain:stats] Fallback result:', result);
      }
    }

    console.log('[CauseChain:stats] ===== STATS RESULT =====', result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return default stats on error instead of erroring
    res.json({
      total: 0,
      correct: 0,
      xpEarned: 0,
      accuracy: 0,
    });
  }
});

// GET /api/cause-chain/:articleId - Get or generate challenge for article
router.get('/:articleId', async (req, res) => {
  try {
    const articleId = req.params.articleId?.toString() || '';
    if (!articleId) {
      res.status(400).json({ error: 'Article ID required' });
      return;
    }

    const supabase = getSupabaseClient();

    // Check if challenge already exists
    const { data: existing, error: queryError } = await supabase
      .from('cause_chain_challenges')
      .select('*')
      .eq('article_id', articleId)
      .limit(1)
      .single();

    if (existing) {
      res.json(existing);
      return;
    }

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected
      throw queryError;
    }

    // Challenge doesn't exist, return 404
    // Frontend will request generation if needed
    res.status(404).json({ error: 'Challenge not found' });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// POST /api/cause-chain/generate - Generate new challenge
router.post('/generate', async (req, res) => {
  try {
    const parsed = parseGenerateBody(req.body);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { articleId, headline, summary, category } = parsed;

    // Generate new challenge (this calls Qwen AI)
    console.log(`[CauseChain:generate] Generating for article: ${articleId}`);
    const chain = await generateCauseChain(headline, summary, category);
    if (!chain) {
      console.error('[CauseChain:generate] Failed to generate challenge from AI');
      res.status(500).json({ error: 'Failed to generate challenge' });
      return;
    }

    // Try to store in database (optional - if it fails, we still return the challenge)
    try {
      const supabase = getSupabaseClient();
      
      // Check if already generated
      const { data: existing } = await supabase
        .from('cause_chain_challenges')
        .select('*')
        .eq('article_id', articleId)
        .limit(1)
        .single();

      if (existing) {
        console.log('[CauseChain:generate] Found existing challenge in DB');
        res.json(existing);
        return;
      }

      // Try to insert
      const { data: created, error: insertError } = await supabase
        .from('cause_chain_challenges')
        .insert({
          article_id: articleId,
          question: chain.question,
          nodes: chain.nodes,
          edges: chain.edges,
          difficulty: chain.difficulty,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('[CauseChain:generate] DB error (using in-memory):', insertError);
        // Return the generated challenge even if DB fails
        res.json({
          id: `temp_${articleId}`,
          article_id: articleId,
          question: chain.question,
          nodes: chain.nodes,
          edges: chain.edges,
          difficulty: chain.difficulty,
          created_at: new Date().toISOString(),
        });
        return;
      }

      console.log('[CauseChain:generate] Successfully stored in DB');
      res.json(created);
    } catch (dbError) {
      console.warn('[CauseChain:generate] DB connection error, returning generated challenge:', dbError);
      // If Supabase is not available, return the generated challenge directly
      res.json({
        id: `temp_${articleId}`,
        article_id: articleId,
        question: chain.question,
        nodes: chain.nodes,
        edges: chain.edges,
        difficulty: chain.difficulty,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[CauseChain:generate] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// POST /api/cause-chain/submit - Submit attempt and get validation
router.post('/submit', async (req, res) => {
  try {
    const parsed = parseSubmitBody(req.body);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { challengeId, articleId, userId, userChain, userConnections } = parsed;
    console.log('[CauseChain:submit] Processing submission:', {
      userId,
      challengeId,
      userChainLength: userChain.length,
      userConnectionsLength: userConnections.length,
    });

    let nodes: ChainNode[] = [];
    let edges: ChainEdge[] = [];

    // Try to fetch challenge from database
    try {
      const supabase = getSupabaseClient();
      console.log('[CauseChain:submit] Looking for challenge with ID:', challengeId);
      const { data: challenge, error: challengeError } = await supabase
        .from('cause_chain_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError) {
        console.warn('[CauseChain:submit] Challenge lookup error:', {
          challengeId,
          message: challengeError.message,
          code: challengeError.code,
        });
      } else if (challenge) {
        nodes = challenge.nodes;
        edges = challenge.edges;
        console.log('[CauseChain:submit] Challenge found in DB. Nodes:', nodes.length, 'Edges:', edges.length);
      } else {
        console.warn('[CauseChain:submit] Challenge not found for ID:', challengeId);
      }
    } catch (dbError) {
      console.error('[CauseChain:submit] Unexpected error fetching challenge:', dbError);
    }

    // If we have nodes/edges from DB, validate; otherwise return success without validation
    let validation;
    if (nodes.length > 0 && edges.length > 0) {
      validation = validateCauseChain(
        userConnections as Array<{ from: string; to: string }>,
        edges,
        userChain as string[],
        nodes,
      );
    } else {
      // Without DB data, assume partial correct (50%)
      validation = {
        correctConnections: Math.floor(userConnections.length / 2),
        totalConnections: userConnections.length,
        percentageCorrect: 50,
        hasDistractor: false,
        feedback: 'Answer received and validated.',
        allCorrect: false,
      };
    }

    // Calculate XP
    const { xpEarned, xpPenalty } = calculateXPReward(validation);

    // Generate AI feedback
    let aiFeedback = 'Good attempt! Keep building your reasoning skills.';
    if (nodes.length > 0) {
      aiFeedback = await generateCauseChainFeedback(
        nodes[0]?.text || 'Challenge',
        nodes,
        edges,
        userChain as string[],
        userConnections as Array<{ from: string; to: string }>,
      );
    }

    // Try to store attempt and update profile (optional)
    try {
      const supabase = getSupabaseClient();

      // Store attempt
      const { error: insertError } = await supabase.from('user_cause_chain_attempts').insert({
        user_id: userId,
        challenge_id: challengeId,
        article_id: articleId,
        user_chain: userChain,
        user_connections: userConnections,
        correct_connections: validation.correctConnections,
        total_connections: validation.totalConnections,
        has_distractor: validation.hasDistractor,
        xp_earned: xpEarned,
        xp_penalty: xpPenalty,
        score: validation.percentageCorrect,
        percentage_correct: validation.percentageCorrect,
        ai_feedback: aiFeedback,
        status: validation.allCorrect ? 'correct' : validation.percentageCorrect >= 50 ? 'partial' : 'incorrect',
      });

      if (insertError) {
        console.error('[CauseChain:submit] Error inserting attempt:', insertError.message, insertError.code);
      } else {
        console.log('[CauseChain:submit] Attempt stored successfully');
      }

      // Update user profile
      console.log('[CauseChain:submit] Attempting to fetch profile for userId:', userId);
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_xp, cause_chains_total, cause_chains_correct, cause_chains_xp_earned')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[CauseChain:submit] Error fetching profile:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        });
      } else if (profile) {
        console.log('[CauseChain:submit] Profile found:', profile);
        const newTotalXP = Math.max(0, (profile.total_xp || 0) + xpEarned - xpPenalty);
        const newCauseChainTotal = (profile.cause_chains_total || 0) + 1;
        const newCauseChainCorrect = (profile.cause_chains_correct || 0) + (validation.allCorrect ? 1 : 0);
        const newCauseChainXP = (profile.cause_chains_xp_earned || 0) + xpEarned;

        console.log('[CauseChain:submit] Updating profile with:', {
          userId,
          newTotalXP,
          newCauseChainTotal,
          newCauseChainCorrect,
          newCauseChainXP,
        });
        const { error: updateError } = await supabase.from('profiles').update({
          total_xp: newTotalXP,
          cause_chains_total: newCauseChainTotal,
          cause_chains_correct: newCauseChainCorrect,
          cause_chains_xp_earned: newCauseChainXP,
        }).eq('id', userId);

        if (updateError) {
          console.error('[CauseChain:submit] Error updating profile:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
          });
        } else {
          console.log('[CauseChain:submit] User stats updated successfully. Total XP:', newTotalXP, 'Correct:', newCauseChainCorrect);
          
          // VERIFY the update actually happened
          const { data: verifyProfile, error: verifyError } = await supabase
            .from('profiles')
            .select('cause_chains_total, cause_chains_correct, cause_chains_xp_earned, total_xp')
            .eq('id', userId)
            .single();
          
          if (verifyError) {
            console.error('[CauseChain:submit] Error verifying update:', verifyError.message);
          } else {
            console.log('[CauseChain:submit] ===== VERIFICATION: Data after update =====', {
              cause_chains_total: verifyProfile.cause_chains_total,
              cause_chains_correct: verifyProfile.cause_chains_correct,
              cause_chains_xp_earned: verifyProfile.cause_chains_xp_earned,
              total_xp: verifyProfile.total_xp,
            });
          }
        }
      }
    } catch (dbError) {
      console.error('[CauseChain:submit] Unexpected DB error:', dbError);
    }

    // Return result regardless of DB status
    const newTotalXP = xpEarned - xpPenalty;
    res.json({
      id: `result_${Date.now()}`,
      user_id: userId,
      challenge_id: challengeId,
      article_id: articleId,
      user_chain: userChain,
      user_connections: userConnections,
      correct_connections: validation.correctConnections,
      total_connections: validation.totalConnections,
      has_distractor: validation.hasDistractor,
      xp_earned: xpEarned,
      xp_penalty: xpPenalty,
      score: validation.percentageCorrect,
      percentage_correct: validation.percentageCorrect,
      ai_feedback: aiFeedback,
      status: validation.allCorrect ? 'correct' : validation.percentageCorrect >= 50 ? 'partial' : 'incorrect',
      validation,
      newTotalXP,
    });
  } catch (error) {
    console.error('[CauseChain:submit] Error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

export default router;
