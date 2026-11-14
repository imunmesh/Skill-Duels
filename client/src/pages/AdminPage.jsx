import React, { useState, useEffect, useCallback } from 'react';
import { categoryAPI, questionAPI } from '../services/api';
import { Plus, Edit2, Trash2, FolderPlus, Search, Filter, Check, X, Shield, RefreshCw } from 'lucide-react';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'categories'
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
    timeLimit: 10,
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
    setTimeout(() => setAlert(null), 4000);
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
        timeLimit: q.timeLimit || 10,
        points: q.points || 100,
        explanation: q.explanation || '',
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        category: categories[0]?._id || '',
        difficulty: 'medium',
        timeLimit: 10,
        points: 100,
        explanation: '',
      });
    }
    setIsQuestionModalOpen(true);
  };

  // Save Question
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.text.trim()) return showAlert('Question text is required', 'danger');
    if (questionForm.options.some((opt) => !opt.trim())) {
      return showAlert('All 4 option fields must be provided', 'danger');
    }
    if (!questionForm.category) return showAlert('Category is required', 'danger');

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

  return (
    <main className="container" style={{ maxWidth: 1100, paddingTop: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
              <Shield size={12} /> Admin Dashboard (FR-09)
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Quiz Content Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Create and moderate question sets, verify categories, and manage live match pools (AC-06).
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.35rem', borderRadius: 'var(--radius-md)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`btn ${activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: 36 }}
          >
            Questions ({totalQuestions})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: 36 }}
          >
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`alert alert-${alert.type}`} role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* TAB 1: QUESTIONS MANAGEMENT */}
      {activeTab === 'questions' && (
        <div>
          {/* Action & Filter Toolbar */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flexGrow: 1 }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="Search question text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', height: 38, minHeight: 38, fontSize: '0.85rem', width: '100%' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-dim)' }} />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input"
                style={{ height: 38, minHeight: 38, fontSize: '0.85rem' }}
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
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
                style={{ height: 38, minHeight: 38, fontSize: '0.85rem' }}
                aria-label="Filter by difficulty"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <button
                type="button"
                onClick={loadQuestions}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', minHeight: 38 }}
                title="Refresh Questions List"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Add Question Button */}
            <button
              type="button"
              onClick={() => handleOpenQuestionModal()}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', minHeight: 38 }}
            >
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>

          {/* Questions Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem', width: '40%' }}>Question Prompt</th>
                    <th style={{ padding: '1rem' }}>Category</th>
                    <th style={{ padding: '1rem' }}>Difficulty</th>
                    <th style={{ padding: '1rem' }}>Correct Answer</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading questions...
                      </td>
                    </tr>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No questions found matching criteria. Click &quot;Add Question&quot; to seed your first quiz prompt!
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => (
                      <tr key={q._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                          {q.text}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                            Timer: {q.timeLimit || 10}s &bull; Points: {q.points || 100}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            {q.category?.name || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            className={`badge ${
                              q.difficulty === 'hard'
                                ? 'badge-warning'
                                : q.difficulty === 'medium'
                                ? 'badge-primary'
                                : 'badge-success'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {q.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: '#6ee7b7' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Check size={14} />
                            <span>{q.options[q.correctIndex]}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenQuestionModal(q)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', minHeight: 32 }}
                              aria-label={`Edit question: ${q.text}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q._id)}
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.65rem', minHeight: 32 }}
                              aria-label={`Delete question: ${q.text}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing Page {currentPage} of {totalPages} ({totalQuestions} questions total)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              <FolderPlus size={16} />
              <span>Create Category</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {categories.map((cat) => (
              <div key={cat._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="badge badge-primary">{cat.slug}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.5rem', minHeight: 28 }}
                      aria-label={`Delete category ${cat.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>{cat.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {cat.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION */}
      {isQuestionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingQuestion ? 'Edit Quiz Question' : 'Create New Question'}
              </h2>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', minHeight: 32, minWidth: 32 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="form-group">
                <label className="form-label">Question Prompt *</label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="e.g. Which data structure follows the LIFO principle?"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Category *</label>
                  <select
                    required
                    className="form-input"
                    value={questionForm.category}
                    onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-input"
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Answer Options (Select radio next to correct answer) *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="radio"
                        id={`opt_${idx}`}
                        name="correctAnswerRadio"
                        checked={questionForm.correctIndex === idx}
                        onChange={() => setQuestionForm({ ...questionForm, correctIndex: idx })}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }}
                        title="Mark this option as the correct answer"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...questionForm.options];
                          updated[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: updated });
                        }}
                        className="form-input"
                        style={{ flexGrow: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Time Limit (seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    className="form-input"
                    value={questionForm.timeLimit}
                    onChange={(e) => setQuestionForm({ ...questionForm, timeLimit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Base Points</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    className="form-input"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CATEGORY */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Skill Category</h2>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', minHeight: 32, minWidth: 32 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  className="form-input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. dsa"
                  className="form-input"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description of this skill area..."
                  className="form-input"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
