const XP_PER_LEVEL = 1000;

const XP_REWARDS = {
  signup: 100,
  postGig: 50,
  completeAsWorker: 250,
  completeAsPoster: 100,
};

const TITLES = ['Newcomer', 'Rising Star', 'Trusted Hand', 'Campus Pro', 'Gig Master', 'Campus Legend'];

function levelInfo(xp = 0) {
  const safe = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const xpInLevel = safe % XP_PER_LEVEL;
  return {
    xp: safe,
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    xpInLevel,
    xpForNext: XP_PER_LEVEL,
    progress: Math.round((xpInLevel / XP_PER_LEVEL) * 100),
  };
}

module.exports = { XP_PER_LEVEL, XP_REWARDS, levelInfo };
