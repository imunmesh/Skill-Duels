import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI, profileAPI } from '../services/api';
import { getAvatarUrl } from '../utils/avatar';
import { normalizeTier } from '../components/ui/podium-leaderboard';
import {
  Dialog,
  DialogClose,
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
  Upload,
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
  Tag,
  X,
  Check,
  AlertCircle,
  Clock,
  ChevronLeft,
} from 'lucide-react';

const renderBadgeIcon = (iconName, isUnlocked) => {
  const color = isUnlocked ? '#ffffff' : '#94a3b8';
  const size = 22;
  switch (iconName) {
    case 'swords':
      return <Swords size={size} color={color} />;
    case 'trophy':
      return <Trophy size={size} color={color} />;
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
    case 'medal':
      return <Medal size={size} color={color} />;
    case 'diamond':
      return <Gem size={size} color={color} />;
    case 'crown':
      return <Crown size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

export const ProfilePage = ({ onBackToArena }) => {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

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
  const loadProfile = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await leaderboardAPI.getUserProgression(user._id);
      if (res.success && res.profile) {
        setProfileData(res.profile);
      }
    } catch (err) {
      console.warn('Could not load detailed progression:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
      loadProfile();
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const p = profileData
    ? {
        ...profileData,
        rank: normalizeTier(profileData.rank, profileData.xp || user?.xp || 0),
      }
    : {
        xp: user?.xp || 0,
        rank: normalizeTier(user?.rank, user?.xp || 0),
        globalPosition: 1,
        xpToNextRank: 100,
        rankProgressPercent: 25,
        streak: { current: 1, highest: 1 },
        badges: [],
        recentMatches: [],
      };

  const userInitial = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <main className="container" style={{ maxWidth: 1000, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
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
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', minHeight: 36 }}
        >
          <ChevronLeft size={16} />
          <span>Back to Arena</span>
        </button>

        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="btn btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', minHeight: 36 }}
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
            Make changes to your profile here. Update your banner, avatar, display name, bio, and skills.
          </DialogDescription>

          <div className="overflow-y-auto max-h-[75vh]">
            {/* Profile Cover Banner */}
            <div className="h-32 relative bg-slate-800 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                alt="Profile banner"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#182234] to-transparent" />
            </div>

            {/* Avatar Row */}
            <div className="-mt-12 px-6 flex items-end justify-between">
              <div className="relative">
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
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-xs font-medium"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
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
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {user?.avatarUrl && !viewImgError ? (
                <img
                  key={user.avatarUrl}
                  src={getAvatarUrl(user.avatarUrl)}
                  alt={user.displayName || user.username}
                  onError={() => setViewImgError(true)}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 'var(--radius-lg)',
                    objectFit: 'cover',
                    border: '2px solid #818cf8',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 84,
                    height: 84,
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
              <button
                type="button"
                onClick={startEditing}
                title="Change Avatar"
                aria-label="Change Avatar"
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
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
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
                @{user?.username} &bull; Standing: <strong style={{ color: '#818cf8' }}>#{p.globalPosition || 1}</strong>
              </div>

              {/* Bio */}
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#cbd5e1', maxWidth: 520, lineHeight: 1.5 }}>
                {user?.bio || 'No bio written yet. Click "Edit Profile" to share your technical background.'}
              </p>

              {/* Skills Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(user?.skills || []).length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    No skills tagged yet
                  </span>
                ) : (
                  user.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#c7d2fe',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics (Streak & XP) */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Streak */}
            <div
              style={{
                background: (p.streak?.current || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                border: `1px solid ${(p.streak?.current || 0) > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Flame size={24} color={(p.streak?.current || 0) > 0 ? '#ef4444' : '#94a3b8'} />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (p.streak?.current || 0) > 0 ? '#fca5a5' : '#cbd5e1' }}>
                  {(p.streak?.current || 0) > 0 ? `${p.streak.current} Day${p.streak.current === 1 ? '' : 's'}` : '0 Days'}
                </div>
                <div style={{ fontSize: '0.7rem', color: (p.streak?.current || 0) > 0 ? 'var(--text-muted)' : '#f59e0b' }}>
                  {(p.streak?.current || 0) > 0 ? 'ACTIVE STREAK' : 'Play today to start streak'}
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Zap size={24} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fcd34d' }}>
                  {(p.xp || 0).toLocaleString()} XP
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIFETIME XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Progression Bar */}
        <div style={{ background: 'var(--bg-input)', padding: '1.1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span>
              Current Tier: <strong style={{ color: '#818cf8' }}>{p.rank}</strong>
            </span>
            <span>
              {p.nextTier ? (
                <>
                  Next: <strong style={{ color: '#fcd34d' }}>{p.nextTier.name}</strong> ({p.xpToNextRank} XP needed)
                </>
              ) : (
                <span style={{ color: '#fcd34d' }}>Max Tier Achieved!</span>
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
                width: `${p.rankProgressPercent || 0}%`,
                height: '100%',
                background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>{p.xp || 0} XP earned</span>
            <span style={{ fontWeight: 700, color: '#c7d2fe' }}>{p.rankProgressPercent || 0}% toward next rank</span>
          </div>
        </div>
      </section>

      {/* SECTION 1: BADGES & ACHIEVEMENTS */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="#fcd34d" />
          <span>Achievements & Badges</span>
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {(p.badges || []).map((badge) => (
            <div
              key={badge.badgeId}
              className="card"
              style={{
                background: badge.isUnlocked ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                border: `1px solid ${badge.isUnlocked ? 'var(--border-focus)' : 'var(--border-color)'}`,
                opacity: badge.isUnlocked ? 1 : 0.6,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: badge.isUnlocked ? 'var(--accent-gradient)' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {renderBadgeIcon(badge.icon, badge.isUnlocked)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{badge.name}</h3>
                    {badge.isUnlocked ? (
                      <span className="badge badge-success" style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid #10b981' }}>
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.6rem', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid #64748b' }}>
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    {badge.description}
                  </p>
                  {!badge.isUnlocked && (
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.3rem', fontWeight: 600 }}>
                      Req: {badge.requirement || 'Play matches and keep streaks to unlock'}
                    </div>
                  )}
                  {badge.isUnlocked && badge.unlockedAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                      Unlocked: {new Date(badge.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: MATCH HISTORY */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Swords size={20} color="#818cf8" />
          <span>Recent Match History</span>
        </h2>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Outcome</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Opponent</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>XP Gained</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {(p.recentMatches || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matches played yet. Enter the Arena to compete!
                    </td>
                  </tr>
                ) : (
                  p.recentMatches.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span
                            className="badge"
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
                            }}
                          >
                            {m.isWinner ? 'VICTORY' : m.isDraw ? 'DRAW' : 'DEFEAT'}
                          </span>
                          {m.reason === 'tab_switch_forfeit' && (
                            <span
                              className="badge badge-danger"
                              style={{
                                fontSize: '0.55rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                              }}
                            >
                              TAB FORFEIT
                            </span>
                          )}
                          {m.reason === 'opponent_forfeit' && (
                            <span
                              className="badge badge-warning"
                              style={{
                                fontSize: '0.55rem',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#fcd34d',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              DISCONNECT FORFEIT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{m.category}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{m.opponentUsername}</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        {m.myScore} - {m.opponentScore}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#fcd34d', fontWeight: 700 }}>
                        +{m.xpAwarded} XP
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {new Date(m.playedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};
