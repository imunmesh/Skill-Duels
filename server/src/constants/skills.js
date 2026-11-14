/**
 * SkillDuels Skills Catalog
 * Categorized skills for profile tagging and autocomplete suggestions.
 */
const SKILLS_CATALOG = {
  Technical: [
    'Java',
    'Python',
    'C++',
    'JavaScript',
    'Node.js',
    'React',
    'MongoDB',
    'SQL',
    'Data Structures & Algorithms',
    'OS',
    'DBMS',
    'Networks',
  ],
  'Web Development': [
    'HTML5',
    'CSS3',
    'Express',
    'REST APIs',
  ],
  Aptitude: [
    'Quantitative',
    'Percentages',
    'Time & Work',
    'Probability',
  ],
  'Logical Reasoning': [
    'Sequences',
    'Syllogisms',
    'Puzzles',
    'Coding-Decoding',
  ],
};

const ALL_SKILLS = Object.values(SKILLS_CATALOG).flat();

module.exports = {
  SKILLS_CATALOG,
  ALL_SKILLS,
};
