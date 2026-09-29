"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, User as UserIcon, Camera, Edit2, Check, Loader2, Mail } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setBio(user.bio || "");
      setProfilePhoto(user.profilePhoto || "");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile image must be less than 5MB");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploaded = res.data?.data;
      if (uploaded?.storageUrl) {
        setProfilePhoto(uploaded.storageUrl);
        // Automatically save avatar change
        await api.patch("/api/users/me", { avatarUrl: uploaded.storageUrl });
        updateUser({ profilePhoto: uploaded.storageUrl });
        toast.success("Profile photo updated!");
      }
    } catch (err: unknown) {
      console.error("Photo upload error:", err);
      toast.error("Failed to upload profile photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: fullName.trim(),
        about: bio.trim(),
        avatarUrl: profilePhoto || undefined,
      };

      const res = await api.patch("/api/users/me", payload);
      const updatedData = res.data?.data || res.data;

      updateUser({
        fullName: updatedData.name || fullName.trim(),
        bio: updatedData.about || bio.trim(),
        profilePhoto: updatedData.avatarUrl || profilePhoto,
      });

      toast.success("Profile saved successfully!");
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Save profile error:", err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update profile";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1B202D] border border-[#2F374A] rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242C3F]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">My Profile</h2>
              <p className="text-[11px] text-text-secondary">Manage your public information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Avatar Banner */}
        <div className="flex flex-col items-center pt-5 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-[#5B8EFF] p-0.5 shadow-glow">
              <div className="w-full h-full rounded-full bg-[#161B26] overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
                {profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0).toUpperCase() || "U"
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg border-2 border-[#1B202D] transition-transform active:scale-95"
              title="Change profile picture"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-[11px] text-accent-green font-medium">Online</span>
          </div>
        </div>

        {/* Details or Edit Form */}
        {!isEditing ? (
          <div className="space-y-3.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-[#232A3B]/60 border border-[#2F374A]/50">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
                Full Name
              </span>
              <p className="text-sm font-semibold text-white">{user.fullName}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#232A3B]/60 border border-[#2F374A]/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
                  Email Address
                </span>
                <p className="text-xs text-white/90 font-medium">{user.email}</p>
              </div>
              <Mail className="w-4 h-4 text-text-muted" />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#232A3B]/60 border border-[#2F374A]/50">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
                About / Bio
              </span>
              <p className="text-xs text-white/80">
                {user.bio || "Hey there! I am using CM Chat."}
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-glow transition-all active:scale-98"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={40}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                About / Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                placeholder="Write a brief intro..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#232A3B] hover:bg-[#2F374A] text-text-muted hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !fullName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow transition-all active:scale-98"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
