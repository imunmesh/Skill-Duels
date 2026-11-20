import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { getAvatarUrl } from '../utils/avatar';
import {
  Camera,
  Upload,
  User,
  FileText,
  Tag,
  X,
  Check,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const ProfileSetupPage = ({ onComplete }) => {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [skillsCatalog, setSkillsCatalog] = useState({});
  const [allSkills, setAllSkills] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ? getAvatarUrl(user.avatarUrl) : null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Load skills catalog from server
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

  // Filter autocomplete suggestions based on user input
  const trimmedInput = skillInput.trim().toLowerCase();
  const suggestions =
    trimmedInput.length > 0
      ? allSkills.filter(
          (s) =>
            s.toLowerCase().includes(trimmedInput) &&
            !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
        )
      : [];

  // Group suggestions by category
  const groupedSuggestions = {};
  if (trimmedInput.length > 0) {
    for (const [category, categorySkills] of Object.entries(skillsCatalog)) {
      const matches = categorySkills.filter(
        (s) =>
          s.toLowerCase().includes(trimmedInput) &&
          !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
      );
      if (matches.length > 0) {
        groupedSuggestions[category] = matches;
      }
    }
  }

  // Handle adding skill tag
  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;

    if (skills.length >= 10) {
      setUploadError('Maximum of 10 skills allowed.');
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
    setUploadError('');
  };

  // Remove skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Handle avatar file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Client-side validations
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size must be less than 2 MB.');
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  // Save profile and avatar
  const handleSave = async () => {
    setSaving(true);
    setUploadError('');

    try {
      let finalAvatarUrl = user?.avatarUrl || '';

      // 1. Upload avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await profileAPI.uploadAvatar(formData);
        if (uploadRes.success && uploadRes.avatarUrl) {
          finalAvatarUrl = uploadRes.avatarUrl;
        }
      }

      // 2. Update profile fields
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

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const userInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 75px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Set Up Your Duelist Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Customize your avatar, bio, and skills so peers recognize you in the Arena
          </p>
        </div>

        {uploadError && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* SECTION A: Profile Picture */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            background: 'var(--bg-input)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Avatar Preview */}
          <div style={{ position: 'relative' }}>
            <input
              id="setup-avatar-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              onClick={(e) => {
                e.target.value = null;
              }}
              style={{ display: 'none' }}
            />
            {avatarPreview ? (
              <img
                key={avatarPreview}
                src={getAvatarUrl(avatarPreview)}
                alt="Avatar preview"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-primary)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {userInitial}
              </div>
            )}
            <label
              htmlFor="setup-avatar-file-input"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Upload profile image"
            >
              <Camera size={14} />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              Profile Photo
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
              Upload JPG, PNG, or WebP (max 2 MB). If skipped, your initials are used.
            </p>
            <label
              htmlFor="setup-avatar-file-input"
              className="btn btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                minHeight: 32,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Upload size={14} />
              <span>Choose Image</span>
            </label>
          </div>
        </div>

        {/* SECTION B: Display Name & Bio */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="displayName">
            Display Name (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="displayName"
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder={user?.username || 'Your in-game name'}
            />
            <User
              size={16}
              style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Defaults to your username: @{user?.username}
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="bio">
              Bio (Optional)
            </label>
            <span
              style={{
                fontSize: '0.75rem',
                color: bio.length > 270 ? '#fca5a5' : 'var(--text-muted)',
              }}
            >
              {bio.length} / 300
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <textarea
              id="bio"
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                resize: 'vertical',
                minHeight: 80,
              }}
              placeholder="Tell other duelists about your technical interests, favorite stacks, or quiz goals..."
            />
            <FileText
              size={16}
              style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
            />
          </div>
        </div>

        {/* SECTION C: Skills Tag Input with Autocomplete */}
        <div className="form-group" style={{ marginBottom: '2rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="skills">
              Skills & Topics ({skills.length} / 10)
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Type to search or add custom skills
            </span>
          </div>

          {/* Selected Skills Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: skills.length > 0 ? '0.75rem' : 0,
            }}
          >
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#c7d2fe',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-label={`Remove ${skill}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {/* Tag Input */}
          <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="skills"
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
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder={skills.length >= 10 ? 'Maximum 10 skills reached' : 'e.g. Java, React, SQL...'}
                disabled={skills.length >= 10}
              />
              <Tag
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddSkill(suggestions[0] || skillInput)}
              className="btn btn-secondary"
              disabled={!skillInput.trim() || skills.length >= 10}
              style={{ minHeight: 42, padding: '0 1rem' }}
            >
              Add
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && skillInput.trim().length > 0 && Object.keys(groupedSuggestions).length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 40,
                marginTop: '0.35rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                maxHeight: 220,
                overflowY: 'auto',
                padding: '0.5rem',
              }}
            >
              {Object.entries(groupedSuggestions).map(([category, items]) => (
                <div key={category} style={{ marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.5rem',
                    }}
                  >
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.2rem 0.5rem' }}>
                    {items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleAddSkill(item)}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#e2e8f0',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '0.25rem 0.6rem',
                          cursor: 'pointer',
                        }}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons: Save & Continue / Skip for now */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.75rem 1.25rem' }}
          >
            {saving ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <span>Save & Continue</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
};
