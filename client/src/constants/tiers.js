export const TIERS = [
  { name: 'Bronze', minXP: 0, color: '#cd7f32', icon: 'Medal' },
  { name: 'Silver', minXP: 100, color: '#94a3b8', icon: 'Medal' },
  { name: 'Gold', minXP: 300, color: '#f59e0b', icon: 'Trophy' },
  { name: 'Platinum', minXP: 600, color: '#22d3ee', icon: 'Shield' },
  { name: 'Diamond', minXP: 1000, color: '#818cf8', icon: 'Gem' },
  { name: 'Ace', minXP: 2000, color: '#ec4899', icon: 'Award' },
  { name: 'Conqueror', minXP: 3500, color: '#ef4444', icon: 'Crown' },
];

export const CANONICAL_TIERS = TIERS.map((t) => t.name);
export const TIER_ORDER = CANONICAL_TIERS;

const LEGACY_TIER_MAP = {
  Novice: 'Bronze',
  Apprentice: 'Silver',
  Warrior: 'Gold',
  Master: 'Platinum',
  Grandmaster: 'Conqueror',
};

export const normalizeTier = (rank, xp = 0) => {
  if (rank && CANONICAL_TIERS.includes(rank)) return rank;
  if (rank && LEGACY_TIER_MAP[rank]) return LEGACY_TIER_MAP[rank];
  const numXP = Number(xp) || 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (numXP >= TIERS[i].minXP) {
      return TIERS[i].name;
    }
  }
  return 'Bronze';
};

export const getTierFromXP = (xp = 0) => normalizeTier(null, xp);

export const getTierDetails = (rankOrXP) => {
  const tierName = typeof rankOrXP === 'number' ? normalizeTier(null, rankOrXP) : normalizeTier(rankOrXP, 0);
  return TIERS.find((t) => t.name === tierName) || TIERS[0];
};

export const calculateLevel = (xp = 0) => {
  return Math.max(1, Math.floor(Math.sqrt((Number(xp) || 0) / 20)) + 1);
};

export const getNextTierProgress = (xp = 0) => {
  const currentXP = Number(xp) || 0;
  const currentTier = normalizeTier(null, currentXP);
  const currentIndex = TIERS.findIndex((t) => t.name === currentTier);
  const nextTier = TIERS[currentIndex + 1] || null;
  const currentMinXP = TIERS[currentIndex]?.minXP || 0;

  if (!nextTier) {
    return {
      currentTier,
      currentTierMinXP: currentMinXP,
      nextTier: null,
      nextTierMinXP: currentMinXP,
      progressPercent: 100,
      xpInCurrentTier: currentXP - currentMinXP,
      tierSpan: 0,
      xpNeeded: 0,
    };
  }

  const span = nextTier.minXP - currentMinXP;
  const gained = Math.max(0, currentXP - currentMinXP);
  const progressPercent = Math.min(100, Math.max(0, Math.floor((gained / span) * 100)));
  const xpNeeded = Math.max(0, nextTier.minXP - currentXP);

  return {
    currentTier,
    currentTierMinXP: currentMinXP,
    nextTier: nextTier.name,
    nextTierMinXP: nextTier.minXP,
    progressPercent,
    xpInCurrentTier: gained,
    tierSpan: span,
    xpNeeded,
  };
};
