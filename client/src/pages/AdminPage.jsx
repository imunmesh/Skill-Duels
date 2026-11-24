import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { categoryAPI, questionAPI } from '../services/api';
import { QUESTIONS_PER_MATCH } from '../constants/rules';
import {
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Search,
  Check,
  X,
  Shield,
  RefreshCw,
  AlertTriangle,
  Database,
  Layers,
  Sparkles,
  BarChart3,
  Copy,
  ChevronLeft,
  ChevronRight,
  Code,
  Brain,
  Compass,
  Globe,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Flame
} from 'lucide-react';

const CATEGORY_COLORS = {
  technical: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.35)' },
  aptitude: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' },
  logical: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' },
  'web-dev': { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.35)' },
  dsa: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' },
  ml: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
};

const getCategoryStyle = (slug) => {
  const key = (slug || '').toLowerCase();
  return CATEGORY_COLORS[key] || { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.35)' };
};

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'categories' | 'health'
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question Form State
  const [questionForm, setQuestionForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    category: '',
    difficulty: 'medium',
    timeLimit: 20,
    points: 100,
    explanation: '',
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Code',
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4500);
  };

  // Fetch Categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryAPI.getAll(true);
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      showAlert(err.message || 'Failed to load categories', 'danger');
    }
  }, []);

  // Fetch Questions
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await questionAPI.getAll({
        page: currentPage,
        limit: 8,
        category: filterCategory,
        difficulty: filterDifficulty,
        search: searchQuery,
      });
      if (res.success) {
        setQuestions(res.questions || []);
        setTotalQuestions(res.totalQuestions || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      showAlert(err.message || 'Failed to load questions', 'danger');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory, filterDifficulty, searchQuery]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions();
    }
  }, [activeTab, loadQuestions]);

  // Derived Stats
  const playableCategoriesCount = useMemo(() => {
    return categories.filter((c) => (c.questionCount ?? 0) >= QUESTIONS_PER_MATCH).length;
  }, [categories]);

  // Open Create/Edit Question Modal
  const handleOpenQuestionModal = (q = null) => {
    if (q) {
      setEditingQuestion(q);
      setQuestionForm({
        text: q.text,
        options: [...q.options],
        correctIndex: q.correctIndex,
        category: q.category?._id || q.category,
        difficulty: q.difficulty || 'medium',
        timeLimit: q.timeLimit || 20,
        points: q.points || 100,
        explanation: q.explanation || '',
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        category: filterCategory || categories[0]?._id || '',
        difficulty: 'medium',
        timeLimit: 20,
        points: 100,
        explanation: '',
      });
    }
    setIsQuestionModalOpen(true);
  };

  // Duplicate Question Handler
  const handleDuplicateQuestion = (q) => {
    setEditingQuestion(null);
    setQuestionForm({
      text: `${q.text} (Copy)`,
      options: [...q.options],
      correctIndex: q.correctIndex,
      category: q.category?._id || q.category,
      difficulty: q.difficulty || 'medium',
      timeLimit: q.timeLimit || 20,
      points: q.points || 100,
      explanation: q.explanation || '',
    });
    setIsQuestionModalOpen(true);
    showAlert('Duplicating question. Modify fields and click Save.', 'info');
  };

  // Save Question
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.category) return showAlert('Category is required', 'danger');
    if (!questionForm.text.trim()) return showAlert('Question text is required', 'danger');
    if (!Array.isArray(questionForm.options) || questionForm.options.length !== 4) {
      return showAlert('Exactly 4 options are required', 'danger');
    }
    if (questionForm.options.some((opt) => !opt.trim())) {
      return showAlert('All 4 option fields must be provided and cannot be blank', 'danger');
    }
    const normalizedOptions = questionForm.options.map((opt) => opt.trim().toLowerCase());
    if (new Set(normalizedOptions).size !== 4) {
      return showAlert('Options must be unique. Duplicate answers are not permitted.', 'danger');
    }
    if (questionForm.correctIndex < 0 || questionForm.correctIndex > 3) {
      return showAlert('Valid correct answer option must be selected', 'danger');
    }

    try {
      if (editingQuestion) {
        await questionAPI.update(editingQuestion._id, questionForm);
        showAlert('Question updated successfully!');
      } else {
        await questionAPI.create(questionForm);
        showAlert('New question created successfully! It is now live for duels (AC-06).');
      }
      setIsQuestionModalOpen(false);
      loadQuestions();
      loadCategories();
    } catch (err) {
      showAlert(err.message || 'Failed to save question', 'danger');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionAPI.delete(id);
      showAlert('Question deleted successfully');
      loadQuestions();
      loadCategories();
    } catch (err) {
      showAlert(err.message || 'Failed to delete question', 'danger');
    }
  };

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return showAlert('Category name is required', 'danger');

    try {
      await categoryAPI.create(categoryForm);
      showAlert('Category created successfully!');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', slug: '', description: '', icon: 'Code' });
      loadCategories();
    } catch (err) {
      showAlert(err.message || 'Failed to create category', 'danger');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete category? Warning: Questions linked to this category may be orphaned.')) return;
    try {
      await categoryAPI.delete(id);
      showAlert('Category deleted successfully');
      loadCategories();
    } catch (err) {
      showAlert(err.message || 'Failed to delete category', 'danger');
    }
  };

  // Quick filter jump
  const handleJumpToCategoryQuestions = (catId) => {
    setFilterCategory(catId);
    setCurrentPage(1);
    setActiveTab('questions');
  };

  // Check for duplicate options in live form
  const hasDuplicateOptions = useMemo(() => {
    const filled = questionForm.options.map((o) => o.trim().toLowerCase()).filter(Boolean);
    return new Set(filled).size !== filled.length;
  }, [questionForm.options]);

  return (
    <main className="container" style={{ maxWidth: 1160, paddingTop: '5.25rem', paddingBottom: '4rem' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span
              className="badge"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Shield size={13} /> Admin Console &bull; FR-09
            </span>
            <span
              className="badge"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Live MongoDB Sync
            </span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc', margin: 0 }}>
            Question Bank & Arena Pools
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '0.35rem', maxWidth: 640 }}>
            Curate quiz questions, govern domain isolation rules, and monitor real-time battle readiness across all skill categories.
          </p>
        </div>

        {/* Global Action: Add Question Button */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => handleOpenQuestionModal()}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.35rem',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>New Question</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Metric 1 */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Questions
            </span>
            <div style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#818cf8' }}>
              <Database size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {totalQuestions}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>
            Live in MongoDB &bull; AC-06 Active
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Categories Configured
            </span>
            <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#c084fc' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {categories.length}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Skill domains available
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Playable Categories
            </span>
            <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34d399' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: playableCategoriesCount === categories.length ? '#34d399' : '#fbbf24' }}>
            {playableCategoriesCount} / {categories.length}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Meets &gt;= {QUESTIONS_PER_MATCH} questions rule
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Match Rule Enforced
            </span>
            <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', color: '#fbbf24' }}>
              <Flame size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {QUESTIONS_PER_MATCH} Qs
          </div>
          <div style={{ fontSize: '0.775rem', color: '#818cf8', marginTop: '0.25rem', fontWeight: 500 }}>
            Strict Category Isolation (AC-01)
          </div>
        </div>
      </div>

      {/* Main Tab Controls Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          background: '#131b2e',
          padding: '0.4rem',
          borderRadius: '12px',
          marginBottom: '1.75rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`btn ${activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', minHeight: 38, borderRadius: '8px' }}
        >
          <Database size={14} style={{ marginRight: 6 }} />
          <span>Question Bank ({totalQuestions})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', minHeight: 38, borderRadius: '8px' }}
        >
          <Layers size={14} style={{ marginRight: 6 }} />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`btn ${activeTab === 'health' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', minHeight: 38, borderRadius: '8px' }}
        >
          <BarChart3 size={14} style={{ marginRight: 6 }} />
          <span>Pool Readiness & Health</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`alert alert-${alert.type}`} role="alert" style={{ marginBottom: '1.75rem' }}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: QUESTION BANK                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div>
          {/* Action & Filter Toolbar */}
          <div
            className="card"
            style={{
              padding: '1.15rem 1.35rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flexGrow: 1 }}>
              {/* Search Box */}
              <div style={{ position: 'relative', minWidth: 240, flexGrow: 1, maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Search questions or keywords..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-input"
                  style={{
                    paddingLeft: '2.4rem',
                    paddingRight: searchQuery ? '2.2rem' : '1rem',
                    height: 40,
                    minHeight: 40,
                    fontSize: '0.875rem',
                    width: '100%',
                    background: '#0b1120',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '0.8rem', color: 'var(--text-dim)' }} />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '0.65rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input"
                style={{ height: 40, minHeight: 40, fontSize: '0.875rem', background: '#0b1120', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                aria-label="Filter by category"
              >
                <option value="">All Categories ({totalQuestions})</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.questionCount ?? 0})
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={filterDifficulty}
                onChange={(e) => {
                  setFilterDifficulty(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input"
                style={{ height: 40, minHeight: 40, fontSize: '0.875rem', background: '#0b1120', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                aria-label="Filter by difficulty"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Reset Filters */}
              {(searchQuery || filterCategory || filterDifficulty) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('');
                    setFilterDifficulty('');
                    setCurrentPage(1);
                  }}
                  className="btn btn-secondary"
                  style={{ height: 40, minHeight: 40, padding: '0 0.85rem', fontSize: '0.825rem' }}
                >
                  Clear Filters
                </button>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                onClick={loadQuestions}
                className="btn btn-secondary"
                style={{ height: 40, minHeight: 40, padding: '0 0.85rem' }}
                title="Refresh Question List"
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Questions Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#0b1120', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '1rem 1.25rem', width: '38%', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Question Prompt
                    </th>
                    <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Category
                    </th>
                    <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Difficulty
                    </th>
                    <th style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Answer Options
                    </th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <RefreshCw size={18} className="spin" />
                          <span>Fetching questions from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700, marginBottom: '0.25rem' }}>
                          No questions found
                        </h3>
                        <p style={{ fontSize: '0.875rem', maxWidth: 420, margin: '0 auto 1.25rem' }}>
                          {searchQuery || filterCategory || filterDifficulty
                            ? 'No questions match the applied filters. Try clearing your filters.'
                            : 'The question bank is currently empty. Click "New Question" to create your first question.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenQuestionModal()}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                        >
                          <Plus size={15} />
                          <span>Add New Question</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => {
                      const catSlug = q.category?.slug || '';
                      const catStyle = getCategoryStyle(catSlug);
                      const isHard = q.difficulty === 'hard';
                      const isMedium = q.difficulty === 'medium';

                      return (
                        <tr
                          key={q._id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {/* Question text & metadata */}
                          <td style={{ padding: '1.1rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, color: '#f8fafc', lineHeight: 1.4, fontSize: '0.925rem' }}>
                              {q.text}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                              <span>Timer: <strong>{q.timeLimit || 20}s</strong></span>
                              <span>&bull;</span>
                              <span>Points: <strong>{q.points || 100} XP</strong></span>
                              <span>&bull;</span>
                              <span>ID: <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{q._id.substring(q._id.length - 6)}</code></span>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td style={{ padding: '1.1rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: catStyle.bg,
                                color: catStyle.text,
                                border: `1px solid ${catStyle.border}`,
                              }}
                            >
                              {q.category?.name || 'General'}
                            </span>
                          </td>

                          {/* Difficulty Badge */}
                          <td style={{ padding: '1.1rem 1rem' }}>
                            <span
                              className={`badge ${
                                isHard ? 'badge-danger' : isMedium ? 'badge-primary' : 'badge-success'
                              }`}
                              style={{
                                fontSize: '0.7rem',
                                textTransform: 'capitalize',
                                padding: '3px 9px',
                              }}
                            >
                              {q.difficulty}
                            </span>
                          </td>

                          {/* Answer Options Preview */}
                          <td style={{ padding: '1.1rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 600, fontSize: '0.85rem' }}>
                                <Check size={14} strokeWidth={2.5} />
                                <span>{q.options[q.correctIndex]}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {q.options.length} options configured
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(q)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', minHeight: 32 }}
                                title="Duplicate question"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenQuestionModal(q)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', minHeight: 32 }}
                                title="Edit question"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q._id)}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.6rem', minHeight: 32 }}
                                title="Delete question"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#0b1120',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalQuestions} total questions)
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', color: '#cbd5e1' }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CATEGORIES MANAGEMENT                                              */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Skill Categories</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Each category governs independent quiz pools. Minimum <strong>{QUESTIONS_PER_MATCH} questions</strong> required to be playable in arena duels.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
            >
              <FolderPlus size={16} />
              <span>Create Category</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {categories.map((cat) => {
              const count = cat.questionCount ?? 0;
              const isPlayable = count >= QUESTIONS_PER_MATCH;
              const progressPct = Math.min(100, Math.round((count / QUESTIONS_PER_MATCH) * 100));
              const catStyle = getCategoryStyle(cat.slug);

              return (
                <div
                  key={cat._id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    background: '#131b2e',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                  }}
                >
                  <div>
                    {/* Header badge & delete button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {cat.slug}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', minHeight: 28 }}
                        aria-label={`Delete category ${cat.name}`}
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
                      {cat.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, minHeight: 38 }}>
                      {cat.description || 'No description provided.'}
                    </p>

                    {/* Progress Bar towards 5 questions */}
                    <div style={{ marginTop: '1.25rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Active Questions</span>
                        <span style={{ color: isPlayable ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                          {count} / {QUESTIONS_PER_MATCH} min
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#0b1120', borderRadius: 9999, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: isPlayable ? '#10b981' : '#f59e0b',
                            borderRadius: 9999,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer status chip & filter link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    {isPlayable ? (
                      <span className="badge badge-success" style={{ fontSize: '0.725rem', padding: '4px 10px' }}>
                        <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Battle Ready
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.725rem', padding: '4px 10px' }}>
                        <AlertTriangle size={12} style={{ marginRight: 4 }} /> Needs {QUESTIONS_PER_MATCH - count} More Qs
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleJumpToCategoryQuestions(cat._id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', minHeight: 30 }}
                    >
                      View Questions &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POOL READINESS & HEALTH                                            */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem', background: '#131b2e', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Battle Pool Isolation & Compliance Rules
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              SkillDuels strictly prohibits cross-category question fallbacks. A battle can only start when a domain contains at least <strong>{QUESTIONS_PER_MATCH} verified questions</strong> added through this console.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categories.map((c) => {
                const count = c.questionCount ?? 0;
                const isReady = count >= QUESTIONS_PER_MATCH;

                return (
                  <div
                    key={c._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: '#0b1120',
                      borderRadius: '12px',
                      border: `1px solid ${isReady ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Slug: <code>{c.slug}</code> &bull; Questions available: <strong>{count}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                        {isReady ? 'PLAYABLE IN DUELS' : `NEEDS ${QUESTIONS_PER_MATCH - count} QUESTIONS`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJumpToCategoryQuestions(c._id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT QUESTION                                                */}
      {/* ========================================================================= */}
      {isQuestionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  {editingQuestion ? 'Edit Quiz Question' : 'Create New Duel Question'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Questions are immediately synced into the selected category pool.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', minHeight: 34, minWidth: 34, borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              {/* Question Text */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                  Question Prompt *
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="e.g. Which data structure follows the LIFO principle?"
                  style={{ background: '#0b1120', fontSize: '0.9rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Category & Difficulty Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                    Category Domain *
                  </label>
                  <select
                    required
                    className="form-input"
                    value={questionForm.category}
                    onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                    style={{ background: '#0b1120', fontSize: '0.875rem' }}
                  >
                    <option value="">Select Domain</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.questionCount ?? 0} current)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                    Difficulty Level
                  </label>
                  <select
                    className="form-input"
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    style={{ background: '#0b1120', fontSize: '0.875rem' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem', margin: 0 }}>
                    Answer Options (Select the radio next to the correct answer) *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    Option {String.fromCharCode(65 + questionForm.correctIndex)} is Correct
                  </span>
                </div>

                {hasDuplicateOptions && (
                  <div style={{ fontSize: '0.775rem', color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertTriangle size={13} />
                    <span>Warning: Duplicate answer options detected. All 4 choices must be unique.</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {questionForm.options.map((opt, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.45rem 0.75rem',
                        background: questionForm.correctIndex === idx ? 'rgba(16, 185, 129, 0.08)' : '#0b1120',
                        border: `1px solid ${questionForm.correctIndex === idx ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '10px',
                      }}
                    >
                      <input
                        type="radio"
                        id={`opt_${idx}`}
                        name="correctAnswerRadio"
                        checked={questionForm.correctIndex === idx}
                        onChange={() => setQuestionForm({ ...questionForm, correctIndex: idx })}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#10b981' }}
                        title="Mark this option as the correct answer"
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: questionForm.correctIndex === idx ? '#34d399' : '#94a3b8', width: 20 }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...questionForm.options];
                          updated[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: updated });
                        }}
                        className="form-input"
                        style={{ flexGrow: 1, background: 'transparent', border: 'none', paddingLeft: 0, height: 34 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Timer & Points Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                    Timer (seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    className="form-input"
                    value={questionForm.timeLimit}
                    onChange={(e) => setQuestionForm({ ...questionForm, timeLimit: e.target.value })}
                    style={{ background: '#0b1120', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                    Base Points (XP)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    className="form-input"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                    style={{ background: '#0b1120', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasDuplicateOptions}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.5rem', opacity: hasDuplicateOptions ? 0.5 : 1 }}
                >
                  {editingQuestion ? 'Update Question' : 'Publish Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CATEGORY                                                    */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Create Skill Domain
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Define a new category domain for multiplayer trivia battles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', minHeight: 34, minWidth: 34, borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud & DevOps"
                  className="form-input"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setCategoryForm({ ...categoryForm, name, slug: categoryForm.slug ? categoryForm.slug : autoSlug });
                  }}
                  style={{ background: '#0b1120', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                  URL Slug (unique identifier)
                </label>
                <input
                  type="text"
                  placeholder="e.g. devops"
                  className="form-input"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  style={{ background: '#0b1120', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                  Domain Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of skills tested in this domain..."
                  className="form-input"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  style={{ background: '#0b1120', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem' }}>
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminPage;
