export const CATEGORY_DISPLAY_MAP = {
  dsa: 'DSA',
  ml: 'Machine Learning',
  mi: 'Machine Learning', // maps typo 'mi' to 'Machine Learning'
  'web-dev': 'Web Dev',
  technical: 'Technical & CS',
  logical: 'Logical Reasoning',
  aptitude: 'Logical Reasoning',
};

export const formatCategoryName = (cat) => {
  if (!cat) return 'General';
  const lower = String(cat).toLowerCase().trim();
  if (CATEGORY_DISPLAY_MAP[lower]) return CATEGORY_DISPLAY_MAP[lower];
  return lower
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: 'All Categories' },
  { id: 'dsa', label: 'DSA' },
  { id: 'ml', label: 'Machine Learning' },
  { id: 'web-dev', label: 'Web Dev' },
  { id: 'technical', label: 'Technical & CS' },
  { id: 'logical', label: 'Logical Reasoning' },
];
