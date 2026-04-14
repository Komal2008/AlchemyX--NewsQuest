/** Avatar configuration with 3D models and metadata */

export type AvatarKind = 'emoji' | 'image' | '3d';

export interface AvatarOption {
  id: number;
  name: string;
  kind: AvatarKind;
  emoji?: string;
  src?: string;
  model3d?: string;
  unlockedAtLevel?: number;
  requiredBadges?: string[];
  description: string;
}

export const AVATAR_OPTIONS_3D: AvatarOption[] = [
  {
    id: 0,
    name: 'Runner',
    kind: '3d',
    emoji: '🏃',
    description: 'The swift analyst',
    model3d: '/avatar/3d/avatar-runner.glb',
    unlockedAtLevel: 1,
  },
  {
    id: 1,
    name: 'Thinker',
    kind: '3d',
    emoji: '🧠',
    description: 'The strategic mind',
    model3d: '/avatar/3d/avatar-thinker.glb',
    unlockedAtLevel: 5,
  },
  {
    id: 2,
    name: 'Oracle',
    kind: '3d',
    emoji: '🔮',
    description: 'The prediction master',
    model3d: '/avatar/3d/avatar-oracle.glb',
    unlockedAtLevel: 10,
    requiredBadges: ['prediction_master'],
  },
  {
    id: 3,
    name: 'Electric',
    kind: '3d',
    emoji: '⚡',
    description: 'The lightning fast',
    model3d: '/avatar/3d/avatar-electric.glb',
    unlockedAtLevel: 15,
    requiredBadges: ['speed_demon'],
  },
  {
    id: 4,
    name: 'Phantom',
    kind: '3d',
    emoji: '👻',
    description: 'The mysterious one',
    model3d: '/avatar/3d/avatar-phantom.glb',
    unlockedAtLevel: 20,
    requiredBadges: ['legend'],
  },
];

export const getAvatarOption = (id?: number | null): AvatarOption => {
  if (id === null || id === undefined) return AVATAR_OPTIONS_3D[0]!;
  const avatar = AVATAR_OPTIONS_3D.find((a) => a.id === id);
  return avatar ?? AVATAR_OPTIONS_3D[0]!;
};

export const isAvatarUnlocked = (
  avatar: AvatarOption,
  currentLevel: number,
  earnedBadgeIds?: string[]
): boolean => {
  const minLevel = avatar.unlockedAtLevel ?? 1;
  if (currentLevel < minLevel) return false;

  if (avatar.requiredBadges && avatar.requiredBadges.length > 0) {
    const badges = earnedBadgeIds ?? [];
    return avatar.requiredBadges.some((badge) => badges.includes(badge));
  }

  return true;
};

export const getLastActiveAvatarId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('lastAvatarId');
  return saved ? parseInt(saved, 10) : null;
};

export const saveLastActiveAvatarId = (id: number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lastAvatarId', String(id));
  }
};

export const getAvatarLabel = (id?: number | null): string => {
  const avatar = getAvatarOption(id);
  return avatar.name;
};

export const getAvatarModel3D = (id?: number | null): string | undefined => {
  const avatar = getAvatarOption(id);
  return avatar.model3d;
};
