const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillduels';

const CATEGORIES_DATA = [
  {
    name: 'Technical & CS',
    slug: 'technical',
    description: 'Core computer science fundamentals, OS, memory, and programming concepts.',
    icon: 'Code',
  },
  {
    name: 'Quantitative Aptitude',
    slug: 'aptitude',
    description: 'Arithmetic, speed, distance, time, percentages, and problem solving.',
    icon: 'Compass',
  },
  {
    name: 'Logical Reasoning',
    slug: 'logical',
    description: 'Sequences, patterns, deductions, syllogisms, and critical reasoning.',
    icon: 'Brain',
  },
  {
    name: 'Web Development',
    slug: 'web-dev',
    description: 'HTML5, CSS3, modern JavaScript, browser DOM, and HTTP protocols.',
    icon: 'Globe',
  },
  {
    name: 'Data Structures & Algorithms',
    slug: 'dsa',
    description: 'Arrays, trees, graphs, sorting, searching, and asymptotic Big-O analysis.',
    icon: 'Layers',
  },
  {
    name: 'Machine learning',
    slug: 'ml',
    description: 'Models',
    icon: 'Code',
  },
];

const QUESTIONS_DATA = {
  technical: [
    { text: 'Which data structure follows the Last-In-First-Out (LIFO) model?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctIndex: 1, difficulty: 'easy' },
    { text: 'In JavaScript, what does `typeof null` evaluate to?', options: ['"null"', '"undefined"', '"object"', '"number"'], correctIndex: 2, difficulty: 'easy' },
    { text: 'Which HTTP status code represents "Resource Created"?', options: ['200', '201', '204', '301'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What is the default port used by HTTP traffic?', options: ['21', '22', '80', '443'], correctIndex: 2, difficulty: 'easy' },
    { text: 'Which component in the CPU is responsible for executing arithmetic operations?', options: ['Control Unit', 'ALU', 'Registers', 'Cache'], correctIndex: 1, difficulty: 'medium' },
    { text: 'In relational databases, what does ACID stand for?', options: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Integrity, Data', 'Auto, Commit, Index, Delete', 'Array, Cache, Interface, Driver'], correctIndex: 0, difficulty: 'medium' },
    { text: 'Which protocol does DNS typically use at the transport layer for queries?', options: ['TCP', 'UDP', 'ICMP', 'IGMP'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is a deadlock in concurrent operating systems?', options: ['A process running infinitely', 'Two or more processes waiting indefinitely for resources held by each other', 'A crash due to division by zero', 'A thread finishing before its parent'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What does the POSIX standard define?', options: ['A graphics rendering pipeline', 'API compatibility interface for UNIX-like operating systems', 'A database indexing method', 'A TCP flow control mechanism'], correctIndex: 1, difficulty: 'hard' },
    { text: 'In virtual memory systems, what is thrashing?', options: ['Overheating of CPU cores', 'Excessive paging where CPU spends more time swapping than executing', 'Corrupted cache blocks', 'Buffer overflow vulnerability'], correctIndex: 1, difficulty: 'hard' },
  ],
  aptitude: [
    { text: 'A train 120m long passes an electric pole in 6 seconds. What is its speed in km/h?', options: ['60 km/h', '72 km/h', '80 km/h', '90 km/h'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What is 15% of 400 plus 25% of 200?', options: ['100', '110', '120', '130'], correctIndex: 1, difficulty: 'easy' },
    { text: 'If 12 men can complete a project in 10 days, in how many days can 15 men complete it?', options: ['6 days', '8 days', '9 days', '10 days'], correctIndex: 1, difficulty: 'easy' },
    { text: 'Find the average of numbers: 15, 25, 35, 45, 55.', options: ['30', '35', '40', '45'], correctIndex: 1, difficulty: 'easy' },
    { text: 'A shopkeeper sells a book for $240 at a 20% gain. What was the cost price?', options: ['$180', '$200', '$210', '$220'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is the compound interest on $1,000 for 2 years at 10% per annum compounded annually?', options: ['$200', '$210', '$220', '$250'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Pipe A fills a tank in 4 hours; Pipe B empties it in 6 hours. If opened together, how long to fill?', options: ['10 hours', '12 hours', '14 hours', '16 hours'], correctIndex: 1, difficulty: 'medium' },
    { text: 'A car covers the first half of a trip at 40 km/h and second half at 60 km/h. What is average speed?', options: ['48 km/h', '50 km/h', '52 km/h', '54 km/h'], correctIndex: 0, difficulty: 'medium' },
    { text: 'In how many different ways can the letters of the word "LEADER" be arranged?', options: ['180', '360', '720', '1440'], correctIndex: 1, difficulty: 'hard' },
    { text: 'Two dice are tossed simultaneously. What is the probability of obtaining a total sum of 8?', options: ['1/6', '5/36', '7/36', '1/9'], correctIndex: 1, difficulty: 'hard' },
  ],
  logical: [
    { text: 'Look at this series: 2, 6, 12, 20, 30, ... What number comes next?', options: ['38', '40', '42', '44'], correctIndex: 2, difficulty: 'easy' },
    { text: 'If CAT is coded as 3120, how is DOG coded in the alphabet positions?', options: ['4157', '4147', '3157', '4167'], correctIndex: 0, difficulty: 'easy' },
    { text: 'Which word does NOT belong with the others?', options: ['Apple', 'Banana', 'Orange', 'Carrot'], correctIndex: 3, difficulty: 'easy' },
    { text: 'Pointing to a photograph, John said, "Her mother is the only daughter of my mother." Who is she?', options: ['Daughter', 'Mother', 'Sister', 'Aunt'], correctIndex: 0, difficulty: 'easy' },
    { text: 'If SOUTH-EAST becomes NORTH and NORTH-EAST becomes WEST, what will WEST become?', options: ['SOUTH-EAST', 'SOUTH-WEST', 'NORTH-WEST', 'EAST'], correctIndex: 0, difficulty: 'medium' },
    { text: 'Look at the sequence: J14, L16, N18, P20, ... What is next?', options: ['Q22', 'R22', 'S22', 'R24'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Statements: All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly.', options: ['Definite True', 'Definite False', 'Undetermined', 'Contradictory'], correctIndex: 2, difficulty: 'medium' },
    { text: 'If P implies Q, and Q implies R, what is logically equivalent to NOT R?', options: ['NOT P', 'P AND Q', 'NOT Q implies P', 'None'], correctIndex: 0, difficulty: 'medium' },
    { text: 'Five friends A, B, C, D, E sit in a row. D is right of B, E is left of B but right of A. Who is in middle?', options: ['A', 'B', 'C', 'E'], correctIndex: 3, difficulty: 'hard' },
    { text: 'A clock shows 3:15. What is the acute angle between the hour and minute hands?', options: ['0 degrees', '7.5 degrees', '10 degrees', '12.5 degrees'], correctIndex: 1, difficulty: 'hard' },
  ],
  'web-dev': [
    { text: 'Which HTML5 element represents self-contained syndicated content?', options: ['<section>', '<article>', '<aside>', '<header>'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What is the CSS box model ordering from outside to inside?', options: ['Margin, Border, Padding, Content', 'Border, Margin, Padding, Content', 'Padding, Margin, Border, Content', 'Content, Padding, Border, Margin'], correctIndex: 0, difficulty: 'easy' },
    { text: 'Which JavaScript method serializes an object into a JSON string?', options: ['JSON.parse()', 'JSON.stringify()', 'JSON.encode()', 'JSON.toText()'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What does the HTTP 403 status code mean?', options: ['Unauthorized', 'Forbidden', 'Not Found', 'Bad Request'], correctIndex: 1, difficulty: 'easy' },
    { text: 'In CSS Flexbox, which property aligns items along the cross axis?', options: ['justify-content', 'align-items', 'flex-direction', 'align-content'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is the purpose of the CORS security header on web servers?', options: ['Compress gzip assets', 'Allow or restrict resources requested from another origin', 'Encrypt TLS cookies', 'Cache API payloads'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Which DOM method attaches an event listener without overwriting existing ones?', options: ['attachEvent()', 'addEventListener()', 'on()', 'bindEvent()'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What does `Promise.all()` do when one promise rejects?', options: ['Waits for all others', 'Rejects immediately with that error', 'Returns null', 'Resolves with undefined'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is the critical rendering path sequence in modern browser engines?', options: ['HTML parsing -> DOM -> CSSOM -> Render Tree -> Layout -> Paint', 'CSSOM -> Layout -> DOM -> Paint', 'DOM -> Paint -> Layout -> CSSOM', 'Render Tree -> DOM -> Layout -> CSSOM'], correctIndex: 0, difficulty: 'hard' },
    { text: 'Which HTTP header prevents clickjacking attacks via iframe embedding?', options: ['X-Frame-Options', 'X-XSS-Protection', 'Content-Encoding', 'Strict-Transport-Security'], correctIndex: 0, difficulty: 'hard' },
  ],
  dsa: [
    { text: 'What is the worst-case time complexity of standard QuickSort with poor pivot choices?', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'], correctIndex: 2, difficulty: 'easy' },
    { text: 'Which data structure is primarily used to implement Breadth-First Search (BFS)?', options: ['Stack', 'Queue', 'Priority Queue', 'Trie'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What is the average lookup time complexity in a Hash Table?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], correctIndex: 0, difficulty: 'easy' },
    { text: 'Which algorithm is used to find the shortest path in a graph with non-negative edge weights?', options: ['Prim', 'Dijkstra', 'Kruskal', 'Floyd-Warshall'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is the minimum height of a balanced binary tree with N nodes?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Which traversal of a Binary Search Tree (BST) visits nodes in ascending sorted order?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], correctIndex: 1, difficulty: 'medium' },
    { text: 'In a Min-Heap, where is the smallest element always located?', options: ['At the root (index 0)', 'At a leaf node', 'At the last index', 'At the middle index'], correctIndex: 0, difficulty: 'medium' },
    { text: 'What is the space complexity of merge sort on an array of size N?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], correctIndex: 2, difficulty: 'medium' },
    { text: 'Which string pattern matching algorithm uses a computed prefix table (pi array)?', options: ['Boyer-Moore', 'KMP (Knuth-Morris-Pratt)', 'Rabin-Karp', 'Aho-Corasick'], correctIndex: 1, difficulty: 'hard' },
    { text: 'What is the amortized insertion time complexity for a dynamic resizing array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correctIndex: 0, difficulty: 'hard' },
  ],
  ml: [
    { text: 'Which algorithm is commonly used for classification by finding the maximum-margin hyperplane?', options: ['Linear Regression', 'Support Vector Machine (SVM)', 'K-Means', 'Apriori'], correctIndex: 1, difficulty: 'easy' },
    { text: 'What problem occurs when a machine learning model fits training noise and generalizes poorly?', options: ['Underfitting', 'Overfitting', 'High Bias', 'Vanishing Gradient'], correctIndex: 1, difficulty: 'easy' },
    { text: 'Which activation function outputs values constrained between 0 and 1?', options: ['ReLU', 'Sigmoid', 'Leaky ReLU', 'Step function'], correctIndex: 1, difficulty: 'easy' },
    { text: 'In supervised learning, what does the training dataset consist of?', options: ['Only input features without labels', 'Input features paired with corresponding target labels', 'Unlabeled clusters', 'Reward signals only'], correctIndex: 1, difficulty: 'easy' },
    { text: 'Which loss function is standard for evaluating binary classification models?', options: ['Mean Squared Error', 'Binary Cross-Entropy', 'Huber Loss', 'Hinge Loss'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What is the primary role of the validation set during neural network training?', options: ['Update model weights directly', 'Tune hyperparameters and monitor overfitting', 'Final real-world test evaluation', 'Data preprocessing'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Which dimensionality reduction technique finds orthogonal axes of maximal variance?', options: ['K-Means', 'PCA (Principal Component Analysis)', 'DBSCAN', 'Word2Vec'], correctIndex: 1, difficulty: 'medium' },
    { text: 'What does the term "Dropout" refer to in deep neural networks?', options: ['Stopping training early', 'Randomly deactivating neurons during training to prevent co-adaptation', 'Removing redundant training samples', 'Zeroing weights during inference'], correctIndex: 1, difficulty: 'medium' },
    { text: 'Which optimization algorithm adapts individual learning rates using first and second moments of gradients?', options: ['SGD with Momentum', 'Adam', 'AdaGrad', 'RMSProp'], correctIndex: 1, difficulty: 'hard' },
    { text: 'What mechanism allows Transformer architectures to weigh the relevance of each input token relative to all others?', options: ['Convolutional filters', 'Self-Attention mechanism', 'Recurrent cell gating', 'Max-pooling'], correctIndex: 1, difficulty: 'hard' },
  ],
};

const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed Security] Seeding questions is strictly disabled in production. Questions must be created via Admin Panel.');
    process.exit(1);
  }

  try {
    console.log(`[Seed] Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Database connected.');

    // 1. Seed Users (Admin Only)
    console.log('[Seed] Seeding Default Admin...');
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('skillduelsadmin123', saltRounds);

    let adminUser = await User.findOne({ email: 'admin@skillduels.com' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin_master',
        email: 'admin@skillduels.com',
        passwordHash: adminHash,
        role: 'admin',
        xp: 1500,
        rank: 'Conqueror',
        badges: [{ badgeId: 'admin_badge', name: 'Moderator', description: 'Platform Administrator' }],
      });
      console.log(`[Seed] Created admin: ${adminUser.username}`);
    } else {
      console.log(`[Seed] Admin already exists: ${adminUser.username}`);
    }

    // Seed Demo/Default Players matching Leaderboard
    console.log('[Seed] Seeding Leaderboard Challengers...');
    const playerHash = await bcrypt.hash('Player123!', saltRounds);
    const DEMO_PLAYERS = [
      {
        username: 'ava_turner',
        displayName: 'Ava Elizabeth Turner',
        email: 'ava@skillduels.com',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        role: 'player',
        xp: 289400,
        weeklyXP: 289400,
        rank: 'Diamond',
        stats: { matchesPlayed: 48, matchesWon: 42 },
        streak: { current: 12, highest: 15 },
      },
      {
        username: 'leo_harrison',
        displayName: 'Leo Harrison',
        email: 'leo@skillduels.com',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'player',
        xp: 251800,
        weeklyXP: 251800,
        rank: 'Platinum',
        stats: { matchesPlayed: 41, matchesWon: 35 },
        streak: { current: 8, highest: 10 },
      },
      {
        username: 'rowan_elijah',
        displayName: 'Rowan Elijah',
        email: 'rowan@skillduels.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'player',
        xp: 238300,
        weeklyXP: 238300,
        rank: 'Gold',
        stats: { matchesPlayed: 39, matchesWon: 31 },
        streak: { current: 6, highest: 9 },
      },
      {
        username: 'maya_chen',
        displayName: 'Maya Chen',
        email: 'maya@skillduels.com',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        role: 'player',
        xp: 198700,
        weeklyXP: 198700,
        rank: 'Silver',
        stats: { matchesPlayed: 32, matchesWon: 24 },
        streak: { current: 4, highest: 7 },
      },
      {
        username: 'player1',
        displayName: 'Player One',
        email: 'player1@skillduels.com',
        role: 'player',
        xp: 156200,
        weeklyXP: 156200,
        rank: 'Bronze',
        stats: { matchesPlayed: 25, matchesWon: 18 },
        streak: { current: 3, highest: 5 },
      },
      {
        username: 'player2',
        displayName: 'Player Two',
        email: 'player2@skillduels.com',
        role: 'player',
        xp: 120500,
        weeklyXP: 120500,
        rank: 'Bronze',
        stats: { matchesPlayed: 20, matchesWon: 14 },
        streak: { current: 2, highest: 4 },
      },
    ];

    for (const p of DEMO_PLAYERS) {
      await User.findOneAndUpdate(
        { email: p.email },
        { ...p, passwordHash: playerHash },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[Seed] Seeded ${DEMO_PLAYERS.length} demo players.`);

    // 2. Seed Categories
    console.log('[Seed] Seeding Categories...');
    await Category.deleteMany({});
    const createdCategories = await Category.insertMany(CATEGORIES_DATA);
    console.log(`[Seed] Created ${createdCategories.length} categories.`);

    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.slug] = cat._id;
    });

    // 3. Seed Questions
    console.log('[Seed] Seeding Questions...');
    await Question.deleteMany({});

    const questionsToInsert = [];
    for (const [slug, questions] of Object.entries(QUESTIONS_DATA)) {
      const catId = categoryMap[slug];
      if (!catId) continue;

      for (const q of questions) {
        questionsToInsert.push({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: q.difficulty || 'medium',
          category: catId,
          timeLimit: 10,
          points: 100,
        });
      }
    }

    const createdQuestions = await Question.insertMany(questionsToInsert);
    console.log(`[Seed] Successfully seeded ${createdQuestions.length} questions across 5 categories!`);

    console.log('\n===============================================================');
    console.log('                 SEEDING COMPLETED SUCCESSFULLY                ');
    console.log('===============================================================');
    console.log('Default Admin Account:');
    console.log('  Email:    admin@skillduels.com');
    console.log('  Password: Admin123!');
    console.log('Default Player Accounts:');
    console.log('  Email:    player1@skillduels.com / player2@skillduels.com');
    console.log('  Password: Player123!');
    console.log('===============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  }
};

seedDatabase();
