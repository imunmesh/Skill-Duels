import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI, profileAPI } from '../services/api';
import { getAvatarUrl } from '../utils/avatar';
import { normalizeTier, TIERS, getNextTierProgress } from '../constants/tiers';
import { formatCategoryName, CATEGORY_FILTER_OPTIONS } from '../constants/categories';
import { AchievementUnlockedModal } from '../components/ui/achievement-unlocked-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import {
  User,
  Edit3,
  Camera,
  Zap,
  Flame,
  Award,
  Swords,
  Shield,
  Medal,
  Crown,
  Trophy,
  Sparkles,
  ShieldCheck,
  Gem,
  Target,
  Star,
  X,
  Check,
  AlertCircle,
  Clock,
  ChevronLeft,
  Filter,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

// Render unique Lucide icons for each badge
const renderBadgeIcon = (iconName, isUnlocked) => {
  const color = isUnlocked ? '#ffffff' : '#94a3b8';
  const size = 22;
  switch (iconName) {
    case 'swords':
      return <Swords size={size} color={color} />;
    case 'target':
      return <Target size={size} color={color} />;
    case 'sparkles':
      return <Sparkles size={size} color={color} />;
    case 'zap':
      return <Zap size={size} color={color} />;
    case 'flame':
    case 'fire':
      return <Flame size={size} color={color} />;
    case 'shield-check':
      return <ShieldCheck size={size} color={color} />;
    case 'shield':
      return <Shield size={size} color={color} />;
    case 'trophy':
      return <Trophy size={size} color={color} />;
    case 'medal':
      return <Medal size={size} color={color} />;
    case 'diamond':
      return <Gem size={size} color={color} />;
    case 'star':
      return <Star size={size} color={color} />;
    case 'crown':
      return <Crown size={size} color={color} />;
    case 'award':
      return <Award size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

// Skill color mapping based on technology type
const getSkillBadgeStyle = (skill) => {
  const s = (skill || '').toLowerCase().trim();

  // Languages: amber / orange
  const languages = ['java', 'javascript', 'typescript', 'python', 'c++', 'c', 'c#', 'rust', 'go', 'golang', 'ruby', 'php', 'swift', 'kotlin', 'html', 'html5', 'css', 'css3', 'sass', 'dart'];
  if (languages.includes(s) || s.endsWith('script') || s.startsWith('python') || s.startsWith('java')) {
    return {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      color: '#fcd34d',
      label: 'Language',
    };
  }

  // Databases & Cloud: emerald / green
  const databases = ['mongodb', 'sql', 'mysql', 'postgresql', 'postgres', 'redis', 'firebase', 'sqlite', 'oracle', 'supabase', 'dynamodb', 'dbms'];
  if (databases.includes(s) || s.includes('sql') || s.includes('mongo') || s.includes('db')) {
    return {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      color: '#6ee7b7',
      label: 'Database',
    };
  }

  // Frameworks: cyan / sky blue
  const frameworks = ['react', 'next.js', 'nextjs', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'springboot', 'spring boot', 'fastapi', 'tailwind', 'bootstrap'];
  if (frameworks.includes(s) || s.includes('spring') || s.includes('react') || s.includes('node') || s.includes('express')) {
    return {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.35)',
      color: '#38bdf8',
      label: 'Framework',
    };
  }

  // Tools & CS: violet / purple
  return {
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    color: '#d8b4fe',
    label: 'Tool / CS',
  };
};

// Date formatters: Indian style "21 Nov 2026" with relative time
const formatIndianDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${diffDays} days ago`;
};

export const ProfilePage = ({ onBackToArena }) => {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Achievements Filter Tab: 'all' | 'unlocked' | 'locked'
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [celebrateBadge, setCelebrateBadge] = useState(null);

  // Match History Controls
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [matchPage, setMatchPage] = useState(1);
  const [matchesList, setMatchesList] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);

  // Match Breakdown Dialog
  const [selectedMatchForBreakdown, setSelectedMatchForBreakdown] = useState(null);

  // Opponent Preview Dialog
  const [previewOpponent, setPreviewOpponent] = useState(null);

  // Editable Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillsCatalog, setSkillsCatalog] = useState({});
  const [allSkills, setAllSkills] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [viewImgError, setViewImgError] = useState(false);
  const fileInputRef = useRef(null);

  // Load User Progression & Stats
  const loadProfile = useCallback(
    async (page = 1, category = 'all', append = false) => {
      if (!user?._id) return;
      if (page === 1) setLoading(true);
      else setLoadingMoreMatches(true);

      try {
        const res = await leaderboardAPI.getUserProgression(user._id, page, 10, category === 'all' ? '' : category);
        if (res.success && res.profile) {
          setProfileData(res.profile);
          setPaginationInfo(res.profile.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          if (append) {
            setMatchesList((prev) => [...prev, ...(res.profile.recentMatches || [])]);
          } else {
            setMatchesList(res.profile.recentMatches || []);
          }
        }
      } catch (err) {
        console.warn('Could not load detailed progression:', err.message);
      } finally {
        setLoading(false);
        setLoadingMoreMatches(false);
      }
    },
    [user?._id]
  );

  useEffect(() => {
    setMatchPage(1);
    loadProfile(1, selectedCategory, false);
  }, [loadProfile, selectedCategory]);

  // Load skills catalog
  useEffect(() => {
    profileAPI
      .getSkills()
      .then((res) => {
        if (res.success) {
          setSkillsCatalog(res.skillsCatalog || {});
          setAllSkills(res.allSkills || []);
        }
      })
      .catch((err) => console.warn('Could not load skills catalog:', err.message));
  }, []);

  // Handle Load More Matches
  const handleLoadMoreMatches = () => {
    if (matchPage >= paginationInfo.totalPages) return;
    const nextPage = matchPage + 1;
    setMatchPage(nextPage);
    loadProfile(nextPage, selectedCategory, true);
  };

  // Sync edit form with current user data when starting edit
  const startEditing = () => {
    setDisplayName(user?.displayName || user?.username || '');
    setBio(user?.bio || '');
    setSkills(user?.skills || []);
    setAvatarPreview(user?.avatarUrl ? getAvatarUrl(user.avatarUrl) : null);
    setAvatarFile(null);
    setAvatarImgError(false);
    setEditError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError('');
    setAvatarFile(null);
  };

  // Autocomplete suggestions
  const trimmedInput = skillInput.trim().toLowerCase();
  const suggestions =
    trimmedInput.length > 0
      ? allSkills.filter(
          (s) =>
            s.toLowerCase().includes(trimmedInput) &&
            !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
        )
      : [];

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;
    if (skills.length >= 10) {
      setEditError('Maximum of 10 skills allowed.');
      return;
    }
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput('');
      setShowSuggestions(false);
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
    setShowSuggestions(false);
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setEditError('Please select a valid JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setEditError('Image size must be less than 2 MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarImgError(false);
    setEditError('');
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setEditError('');

    try {
      let finalAvatarUrl = user?.avatarUrl || '';

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await profileAPI.uploadAvatar(formData);
        if (uploadRes.success && uploadRes.avatarUrl) {
          finalAvatarUrl = uploadRes.avatarUrl;
        }
      }

      const updatePayload = {
        displayName: displayName.trim() || user?.username,
        bio: bio.trim(),
        skills,
        avatarUrl: finalAvatarUrl,
      };

      const res = await profileAPI.updateProfile(updatePayload);
      if (res.success && res.user) {
        updateUser(res.user);
      }

      setIsEditing(false);
      setToastMessage('Profile changes saved successfully!');
      setTimeout(() => setToastMessage(''), 4000);
      loadProfile(1, selectedCategory, false);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const currentXP = profileData?.xp !== undefined ? profileData.xp : user?.xp || 0;
  const currentTier = normalizeTier(profileData?.rank || user?.rank, currentXP);
  const tierProgress = getNextTierProgress(currentXP);

  const p = profileData
    ? {
        ...profileData,
        rank: currentTier,
      }
    : {
        xp: currentXP,
        rank: currentTier,
        globalPosition: 1,
        stats: { matchesPlayed: 0, matchesWon: 0, winRate: 0, bestCategory: 'DSA' },
        streak: { current: 1, highest: 1 },
        badges: [],
        recentMatches: [],
      };

  const userInitial = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();

  // Filtered badges
  const allBadges = p.badges || [];
  const unlockedBadges = allBadges.filter((b) => b.isUnlocked);
  const lockedBadges = allBadges.filter((b) => !b.isUnlocked);

  const displayedBadges =
    badgeFilter === 'unlocked'
      ? unlockedBadges
      : badgeFilter === 'locked'
      ? lockedBadges
      : allBadges;

  // Calculate Win Rate and Best Category from matches/stats
  const totalMatchesCount = p.stats?.matchesPlayed || matchesList.length || 0;
  const matchesWonCount = p.stats?.matchesWon || matchesList.filter((m) => m.isWinner).length || 0;
  const computedWinRate =
    totalMatchesCount > 0 ? Math.round((matchesWonCount / totalMatchesCount) * 100) : p.stats?.winRate || 0;
  const bestCategoryDisplay = formatCategoryName(p.stats?.bestCategory || 'DSA');

  // Rematch handler
  const handleRematch = (cat) => {
    const targetCat = cat || 'dsa';
    window.location.href = `/arena?category=${encodeURIComponent(targetCat)}`;
  };

  return (
    <main className="container" style={{ maxWidth: 1060, paddingTop: '5.25rem', paddingBottom: '4rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            background: '#10b981',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb / Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={onBackToArena}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', minHeight: 36 }}
        >
          <ChevronLeft size={16} />
          <span>Back to Arena</span>
        </button>

        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="btn btn-primary"
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', minHeight: 36 }}
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* SHADCN RADIX EDIT PROFILE MODAL DIALOG */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) cancelEditing(); else setIsEditing(true); }}>
        <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-xl [&>button:last-child]:top-3.5 bg-[#182234] border-[#334155] text-slate-100 shadow-2xl z-[101]">
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="border-b border-[#334155] px-6 py-4 text-base font-semibold text-white flex items-center gap-2">
              <Edit3 size={18} className="text-indigo-400" />
              <span>Edit Profile</span>
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Make changes to your profile here. Update your avatar, display name, bio, and skills.
          </DialogDescription>

          <div className="overflow-y-auto max-h-[75vh]">
            {/* Profile Cover Banner */}
            <div className="h-28 relative bg-slate-800 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                alt="Profile banner"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#182234] to-transparent" />
            </div>

            {/* Avatar Row */}
            <div className="-mt-12 px-6 flex items-end justify-between">
              <div className="relative group">
                {avatarPreview && !avatarImgError ? (
                  <img
                    key={avatarPreview}
                    src={getAvatarUrl(avatarPreview)}
                    alt="Avatar preview"
                    onError={() => setAvatarImgError(true)}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#182234] shadow-md bg-slate-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-[#182234] shadow-md bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                    {userInitial}
                  </div>
                )}
                <input
                  id="profile-avatar-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  onClick={(e) => {
                    e.target.value = null;
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="profile-avatar-file-input"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105"
                  title="Change avatar"
                >
                  <Camera size={16} />
                </label>
              </div>

              <span className="text-xs text-slate-400 pb-1">
                JPG, PNG or WebP (max 2MB)
              </span>
            </div>

            {/* Form Fields */}
            <div className="px-6 pb-6 pt-4 space-y-4">
              {editError && (
                <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="editDisplayName" className="text-sm font-medium text-slate-200">
                  Display Name
                </Label>
                <Input
                  id="editDisplayName"
                  type="text"
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user?.username}
                  className="bg-[#0f172a] border-[#334155] text-white focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="editBio" className="text-sm font-medium text-slate-200">
                    Biography
                  </Label>
                  <span className={`text-xs ${bio.length > 270 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {300 - bio.length} characters left
                  </span>
                </div>
                <Textarea
                  id="editBio"
                  rows={3}
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell other competitors about your tech focus..."
                  className="bg-[#0f172a] border-[#334155] text-white focus-visible:ring-indigo-500 resize-none"
                />
              </div>

              {/* Skills Tag Section */}
              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <Label htmlFor="editSkills" className="text-sm font-medium text-slate-200">
                    Skills ({skills.length} / 10)
                  </Label>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {skills.map((skill) => {
                    const badgeStyle = getSkillBadgeStyle(skill);
                    return (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: badgeStyle.bg,
                          border: `1px solid ${badgeStyle.border}`,
                          color: badgeStyle.color,
                        }}
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="opacity-70 hover:opacity-100 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    id="editSkills"
                    type="text"
                    value={skillInput}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(suggestions[0] || skillInput);
                      }
                    }}
                    placeholder="Type a technology (e.g. React, Node, Python)..."
                    disabled={skills.length >= 10}
                    className="flex-1 bg-[#0f172a] border-[#334155] text-white"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleAddSkill(suggestions[0] || skillInput)}
                    disabled={!skillInput.trim() || skills.length >= 10}
                  >
                    Add
                  </Button>
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && skillInput.trim().length > 0 && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-slate-900 border border-slate-700 rounded-lg max-h-40 overflow-y-auto p-2 shadow-xl flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 8).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleAddSkill(item)}
                        className="bg-slate-800 hover:bg-indigo-600 border border-slate-700 text-slate-200 hover:text-white text-xs px-2.5 py-1 rounded cursor-pointer transition-colors"
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-[#334155] px-6 py-4 flex sm:justify-end gap-2 bg-[#141d2c]">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={saving}
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {saving ? 'Saving changes...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROFILE OVERVIEW CARD */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          marginBottom: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Avatar & Player Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* Avatar with hover-only camera icon button to avoid looking like notification dot */}
            <div className="relative group" style={{ display: 'inline-block' }}>
              {user?.avatarUrl && !viewImgError ? (
                <img
                  key={user.avatarUrl}
                  src={getAvatarUrl(user.avatarUrl)}
                  alt={user.displayName || user.username}
                  onError={() => setViewImgError(true)}
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 'var(--radius-lg)',
                    objectFit: 'cover',
                    border: '2px solid #818cf8',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                >
                  {userInitial}
                </div>
              )}
              {/* Camera icon button: visible on hover only */}
              <button
                type="button"
                onClick={startEditing}
                title="Change Avatar"
                aria-label="Change Avatar"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  position: 'absolute',
                  bottom: -6,
                  right: -6,
                  background: '#6366f1',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                <Camera size={13} />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                  {user?.displayName || user?.username}
                </h1>
                <span className="badge badge-primary">{p.rank}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                @{user?.username} &bull; Standing:{' '}
                <a
                  href="/leaderboard"
                  className="font-bold hover:underline"
                  style={{ color: '#818cf8' }}
                  title="View full leaderboard"
                >
                  #{p.globalPosition || 1}
                </a>
              </div>

              {/* Bio */}
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#cbd5e1', maxWidth: 520, lineHeight: 1.5 }}>
                {user?.bio || 'No bio written yet. Click "Edit Profile" to share your technical background.'}
              </p>

              {/* Skill Chips colored by category */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(user?.skills || []).length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    No skills tagged yet
                  </span>
                ) : (
                  user.skills.map((skill) => {
                    const badgeStyle = getSkillBadgeStyle(skill);
                    return (
                      <span
                        key={skill}
                        title={badgeStyle.label}
                        style={{
                          padding: '0.22rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: badgeStyle.bg,
                          border: `1px solid ${badgeStyle.border}`,
                          color: badgeStyle.color,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {skill}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics: Streak in Orange & Lifetime XP */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Active Streak in warm orange */}
            <div
              style={{
                background: (p.streak?.current || 0) > 0 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                border: `1px solid ${(p.streak?.current || 0) > 0 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(100, 116, 139, 0.3)'}`,
                padding: '0.65rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <Flame size={24} color={(p.streak?.current || 0) > 0 ? '#f97316' : '#94a3b8'} />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (p.streak?.current || 0) > 0 ? '#fdba74' : '#cbd5e1' }}>
                  {p.streak?.current || 0} {(p.streak?.current === 1) ? 'day' : 'days'}
                </div>
                <div style={{ fontSize: '0.72rem', color: (p.streak?.current || 0) > 0 ? '#fed7aa' : '#f59e0b', fontWeight: 600 }}>
                  {p.streak?.atRisk
                    ? `Play today to keep your ${p.streak.current} day streak (${p.streak.hoursRemaining || 12}h left)`
                    : (p.streak?.current || 0) > 0
                    ? 'Played today! Streak safe'
                    : 'Play today to start streak'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Best: {p.streak?.longest ?? p.streak?.highest ?? 0} {(p.streak?.longest ?? p.streak?.highest ?? 0) === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>

            {/* Total Lifetime XP */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '0.65rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <Zap size={24} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fcd34d' }}>
                  {currentXP.toLocaleString()} XP
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIFETIME XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row: Win Rate, Matches Played, Best Category */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Win Rate
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
              {computedWinRate}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Matches Played
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#93c5fd' }}>
              {totalMatchesCount}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Best Category
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>
              {bestCategoryDisplay}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Tier
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fcd34d' }}>
              {currentTier}
            </div>
          </div>
        </div>

        {/* Tier Roadmap: Horizontal Stepper showing all 7 tiers */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
              Tier Progression Roadmap
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Climb to Conqueror (3,500+ XP)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}
          >
            {TIERS.map((tier, idx) => {
              const isCurrent = tier.name === currentTier;
              const currentTierIdx = TIERS.findIndex((t) => t.name === currentTier);
              const isPassed = idx < currentTierIdx;
              const isUpcoming = idx > currentTierIdx;

              return (
                <div
                  key={tier.name}
                  style={{
                    background: isCurrent
                      ? 'rgba(245, 158, 11, 0.15)'
                      : isPassed
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(30, 41, 59, 0.5)',
                    border: isCurrent
                      ? '2px solid #f59e0b'
                      : isPassed
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 0.5rem',
                    textAlign: 'center',
                    position: 'relative',
                    boxShadow: isCurrent ? '0 0 15px rgba(245, 158, 11, 0.25)' : 'none',
                    minWidth: 105,
                  }}
                >
                  {isCurrent && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#f59e0b',
                        color: '#0f172a',
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        letterSpacing: '0.05em',
                      }}
                    >
                      CURRENT
                    </span>
                  )}
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isCurrent ? '#fcd34d' : isPassed ? '#6ee7b7' : '#94a3b8' }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: isPassed ? '#10b981' : 'var(--text-dim)', marginTop: '0.15rem' }}>
                    {isPassed ? '✓ Achieved' : `${tier.minXP} XP`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Bar Math: Gold is 300-599, show "170 / 300 XP in Gold" */}
        <div style={{ background: 'var(--bg-input)', padding: '1.1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span>
              Current Tier: <strong style={{ color: '#818cf8' }}>{currentTier}</strong>
            </span>
            <span>
              {tierProgress.nextTier ? (
                <>
                  Next: <strong style={{ color: '#fcd34d' }}>{tierProgress.nextTier}</strong> ({tierProgress.xpNeeded} XP needed)
                </>
              ) : (
                <span style={{ color: '#fcd34d', fontWeight: 700 }}>Conqueror Supreme Achieved!</span>
              )}
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: 12,
              background: '#334155',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '0.4rem',
            }}
          >
            <div
              style={{
                width: `${tierProgress.progressPercent || 0}%`,
                height: '100%',
                background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>
              {tierProgress.nextTier ? (
                <>
                  <strong style={{ color: '#e2e8f0' }}>{tierProgress.xpInCurrentTier} / {tierProgress.tierSpan} XP</strong> in {currentTier}{' '}
                  <span style={{ color: 'var(--text-dim)' }}>({currentXP} / {tierProgress.nextTierMinXP} XP)</span>
                </>
              ) : (
                <strong style={{ color: '#e2e8f0' }}>{currentXP} XP Lifetime</strong>
              )}
            </span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>
              {tierProgress.progressPercent || 0}% toward {tierProgress.nextTier || 'Max Tier'}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 1: ACHIEVEMENTS & BADGES */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={22} color="#fcd34d" />
            <span>Achievements ({unlockedBadges.length} / {allBadges.length})</span>
          </h2>

          {/* Filter Tabs: All, Unlocked, Locked */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => setBadgeFilter('all')}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: badgeFilter === 'all' ? '#6366f1' : 'transparent',
                color: badgeFilter === 'all' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              All ({allBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter('unlocked')}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: badgeFilter === 'unlocked' ? '#10b981' : 'transparent',
                color: badgeFilter === 'unlocked' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Unlocked ({unlockedBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter('locked')}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: badgeFilter === 'locked' ? '#f59e0b' : 'transparent',
                color: badgeFilter === 'locked' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Locked ({lockedBadges.length})
            </button>
          </div>
        </div>

        {/* 4-column responsive grid on wide screens */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {displayedBadges.map((badge) => (
            <div
              key={badge.badgeId}
              onClick={() => {
                if (badge.isUnlocked) {
                  setCelebrateBadge(badge);
                }
              }}
              title={badge.isUnlocked ? 'Click to preview celebration animation' : ''}
              className={`card ${
                badge.isUnlocked
                  ? 'achievement-card-shine cursor-pointer hover:scale-[1.02] hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : ''
              }`}
              style={{
                background: badge.isUnlocked ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                border: `1px solid ${badge.isUnlocked ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.07)'}`,
                opacity: badge.isUnlocked ? 1 : 0.75,
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      background: badge.isUnlocked ? 'var(--accent-gradient)' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: badge.isUnlocked ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none',
                    }}
                  >
                    {renderBadgeIcon(badge.icon, badge.isUnlocked)}
                  </div>

                  {badge.isUnlocked ? (
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.62rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#6ee7b7',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontWeight: 700,
                      }}
                    >
                      UNLOCKED
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.62rem',
                        background: 'rgba(100, 116, 139, 0.2)',
                        color: '#94a3b8',
                        border: '1px solid rgba(100, 116, 139, 0.4)',
                        fontWeight: 700,
                      }}
                    >
                      LOCKED
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#ffffff' }}>
                  {badge.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 0.6rem' }}>
                  {badge.description}
                </p>
              </div>

              <div>
                {!badge.isUnlocked && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span>Req: {badge.requirement}</span>
                      {badge.progressPercent > 0 && <span>{badge.progressPercent}%</span>}
                    </div>
                    {badge.progressPercent > 0 && (
                      <div style={{ width: '100%', height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${badge.progressPercent}%`, height: '100%', background: '#f59e0b' }} />
                      </div>
                    )}
                  </div>
                )}

                {badge.isUnlocked && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {badge.unlockedAt ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={12} color="#10b981" />
                        <span>{formatIndianDate(badge.unlockedAt)}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>View Animation</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: MATCH HISTORY TABLE */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Swords size={22} color="#818cf8" />
            <span>Recent Match History</span>
          </h2>

          {/* Category Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0f172a] border border-[#334155] text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {CATEGORY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Empty State when no matches */}
        {matchesList.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
            }}
          >
            <Swords size={44} color="#818cf8" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#ffffff' }}>
              No Matches Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 450, margin: '0 auto 1.5rem' }}>
              Step into the arena to test your skills in live 1v1 quiz battles, gain XP, and climb the tiers!
            </p>
            <button type="button" onClick={onBackToArena} className="btn btn-primary" style={{ padding: '0.55rem 1.4rem' }}>
              <Swords size={16} />
              <span>Find Opponent</span>
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Desktop / Tablet Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Outcome</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Opponent</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                    <th style={{ padding: '0.85rem 1rem' }}>XP Gained</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matchesList.map((m, idx) => {
                    const isForfeit = m.reason === 'opponent_forfeit' || m.reason === 'tab_switch_forfeit';
                    const scoreText =
                      isForfeit && m.myScore === 0 && m.opponentScore === 0
                        ? 'Forfeit'
                        : `${m.myScore} - ${m.opponentScore}`;

                    // Concise outcome pill with forfeit tag built-in
                    let outcomeText = m.isWinner ? 'VICTORY' : m.isDraw ? 'DRAW' : 'DEFEAT';
                    if (isForfeit) {
                      outcomeText = m.isWinner ? 'VICTORY (Forfeit)' : 'DEFEAT (Forfeit)';
                    }

                    // XP Rule display
                    const xpDisplay = isForfeit
                      ? `Forfeit win +${m.xpAwarded} XP`
                      : `+${m.xpAwarded} XP`;

                    return (
                      <tr
                        key={m.matchId || idx}
                        className="hover:bg-slate-800/40 transition-colors"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}
                        onClick={() => setSelectedMatchForBreakdown(m)}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            className="badge"
                            title={isForfeit ? 'Match ended by forfeit' : ''}
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              background: m.isWinner
                                ? 'rgba(16, 185, 129, 0.22)'
                                : m.isDraw
                                ? 'rgba(245, 158, 11, 0.22)'
                                : 'rgba(239, 68, 68, 0.22)',
                              color: m.isWinner ? '#6ee7b7' : m.isDraw ? '#fcd34d' : '#fca5a5',
                              border: `1px solid ${m.isWinner ? '#10b981' : m.isDraw ? '#f59e0b' : '#ef4444'}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {outcomeText}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#e2e8f0' }}>
                          {formatCategoryName(m.category)}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewOpponent({ username: m.opponentUsername, category: m.category });
                            }}
                            className="hover:underline font-semibold text-slate-200 hover:text-indigo-300 text-left"
                          >
                            {m.opponentUsername}
                          </button>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                          <span style={{ color: m.myScore > m.opponentScore ? '#6ee7b7' : '#cbd5e1' }}>
                            {scoreText}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#fcd34d', fontWeight: 700, fontSize: '0.85rem' }}>
                          {xpDisplay}
                        </td>

                        <td
                          style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}
                          title={getRelativeTime(m.playedAt)}
                        >
                          {formatIndianDate(m.playedAt)}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRematch(m.category);
                              }}
                              title="Rematch in Arena"
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', minHeight: 28 }}
                            >
                              <RotateCcw size={12} />
                              <span>Rematch</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View (< 640px) */}
            <div className="block sm:hidden divide-y divide-slate-800">
              {matchesList.map((m, idx) => {
                const isForfeit = m.reason === 'opponent_forfeit' || m.reason === 'tab_switch_forfeit';
                const scoreText =
                  isForfeit && m.myScore === 0 && m.opponentScore === 0
                    ? 'Forfeit'
                    : `${m.myScore} - ${m.opponentScore}`;

                let outcomeText = m.isWinner ? 'VICTORY' : m.isDraw ? 'DRAW' : 'DEFEAT';
                if (isForfeit) {
                  outcomeText = m.isWinner ? 'VICTORY (Forfeit)' : 'DEFEAT (Forfeit)';
                }

                const xpDisplay = isForfeit
                  ? `Forfeit win +${m.xpAwarded} XP`
                  : `+${m.xpAwarded} XP`;

                return (
                  <div
                    key={m.matchId || idx}
                    onClick={() => setSelectedMatchForBreakdown(m)}
                    className="p-4 space-y-2 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          background: m.isWinner
                            ? 'rgba(16, 185, 129, 0.22)'
                            : m.isDraw
                            ? 'rgba(245, 158, 11, 0.22)'
                            : 'rgba(239, 68, 68, 0.22)',
                          color: m.isWinner ? '#6ee7b7' : m.isDraw ? '#fcd34d' : '#fca5a5',
                          border: `1px solid ${m.isWinner ? '#10b981' : m.isDraw ? '#f59e0b' : '#ef4444'}`,
                        }}
                      >
                        {outcomeText}
                      </span>
                      <span className="text-xs text-slate-400" title={getRelativeTime(m.playedAt)}>
                        {formatIndianDate(m.playedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-400 text-xs">vs</span>{' '}
                        <strong className="text-white">{m.opponentUsername}</strong>{' '}
                        <span className="text-xs text-indigo-400">({formatCategoryName(m.category)})</span>
                      </div>
                      <div className="font-mono font-bold text-slate-200">{scoreText}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-amber-400">{xpDisplay}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRematch(m.category);
                        }}
                        className="btn btn-secondary text-xs px-2.5 py-1 min-h-[26px]"
                      >
                        <RotateCcw size={12} />
                        <span>Rematch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination / Load More Footer */}
            {matchPage < paginationInfo.totalPages && (
              <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(15, 23, 42, 0.5)' }}>
                <button
                  type="button"
                  onClick={handleLoadMoreMatches}
                  disabled={loadingMoreMatches}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 1.25rem' }}
                >
                  {loadingMoreMatches ? 'Loading more...' : `Load more matches (${matchesList.length} of ${paginationInfo.total})`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MATCH BREAKDOWN DIALOG MODAL */}
      <Dialog
        open={Boolean(selectedMatchForBreakdown)}
        onOpenChange={(open) => {
          if (!open) setSelectedMatchForBreakdown(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#182234] border-[#334155] text-slate-100 shadow-2xl z-[105]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Swords size={18} className="text-indigo-400" />
              <span>Match Breakdown</span>
            </DialogTitle>
          </DialogHeader>

          {selectedMatchForBreakdown && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex justify-between items-center text-sm">
                <div>
                  <div className="text-xs text-slate-400">Category</div>
                  <div className="font-semibold text-indigo-300">
                    {formatCategoryName(selectedMatchForBreakdown.category)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Opponent</div>
                  <div className="font-semibold text-white">
                    {selectedMatchForBreakdown.opponentUsername}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Final Score</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {selectedMatchForBreakdown.myScore} - {selectedMatchForBreakdown.opponentScore}
                  </div>
                </div>
              </div>

              {/* Question Summary */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question Breakdown
                </div>
                {[1, 2, 3].map((qNum) => {
                  const wasAnswered = selectedMatchForBreakdown.myScore > 0 || !selectedMatchForBreakdown.isForfeit;
                  return (
                    <div
                      key={qNum}
                      className="p-2.5 bg-slate-900/40 rounded border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                          {qNum}
                        </span>
                        <span>Question {qNum}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={selectedMatchForBreakdown.isWinner ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {selectedMatchForBreakdown.isWinner ? '✓ Correct' : 'Attempted'}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {selectedMatchForBreakdown.isWinner ? '< 4s' : '5s'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* XP Rule Details */}
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-200">
                <strong>XP Rule:</strong> {selectedMatchForBreakdown.isForfeit ? 'Forfeit Win (+10 XP) due to opponent disconnect/forfeit' : 'Standard competitive duel (+50 XP win / +15 XP loss)'}
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (selectedMatchForBreakdown) {
                  handleRematch(selectedMatchForBreakdown.category);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Rematch
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedMatchForBreakdown(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OPPONENT PREVIEW MODAL */}
      <Dialog
        open={Boolean(previewOpponent)}
        onOpenChange={(open) => {
          if (!open) setPreviewOpponent(null);
        }}
      >
        <DialogContent className="sm:max-w-sm bg-[#182234] border-[#334155] text-slate-100 shadow-2xl z-[105]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <User size={18} className="text-indigo-400" />
              <span>Competitor Profile</span>
            </DialogTitle>
          </DialogHeader>

          {previewOpponent && (
            <div className="py-4 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-lg">
                {previewOpponent.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">@{previewOpponent.username}</h3>
                <span className="badge badge-primary text-xs mt-1">SkillDuels Competitor</span>
              </div>
              <p className="text-xs text-slate-400">
                Competed against you in {formatCategoryName(previewOpponent.category)}.
              </p>
            </div>
          )}

          <DialogFooter className="flex sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (previewOpponent) {
                  handleRematch(previewOpponent.category);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Challenge to Rematch
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpponent(null)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Achievement Unlocked Celebration Animation Modal */}
      <AchievementUnlockedModal
        isOpen={Boolean(celebrateBadge)}
        onClose={() => setCelebrateBadge(null)}
        badge={celebrateBadge}
      />
    </main>
  );
};
