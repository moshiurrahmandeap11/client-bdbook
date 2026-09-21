"use client";

import React, { useState, useRef, useEffect } from "react";
import { IUser, UpdateUserPayload } from "@/interfaces";
import {
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,
  removeProfilePicture,
  removeCoverPhoto,
} from "@/services/user.service";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import {
  Camera,
  Trash2,
  Globe,
  MapPin,
  Calendar,
  User,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser;
  onProfileUpdated: (user: IUser) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}) => {
  const { refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user.fullName || user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [website, setWebsite] = useState(user.website || "");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    (user.gender as "male" | "female" | "other") || ""
  );
  const [dob, setDob] = useState(
    user.dob ? new Date(user.dob).toISOString().split("T")[0] : ""
  );

  // Media state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCoverFlag, setRemoveCoverFlag] = useState(false);

  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Lock body scroll and listen for Escape key when drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, saving]);

  // Reset form when drawer opens or user changes
  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || user.name || "");
      setBio(user.bio || "");
      setLocation(user.location || "");
      setWebsite(user.website || "");
      setGender((user.gender as "male" | "female" | "other") || "");
      setDob(
        user.dob ? new Date(user.dob).toISOString().split("T")[0] : ""
      );
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatarFlag(false);
      setCoverFile(null);
      setCoverPreview(null);
      setRemoveCoverFlag(false);
    }
  }, [isOpen, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setRemoveAvatarFlag(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setRemoveCoverFlag(false);
    }
  };

  const currentAvatar = removeAvatarFlag
    ? null
    : avatarPreview ||
      user.avatar ||
      user.profilePicUrl ||
      (typeof user.profilePicture === "object"
        ? user.profilePicture?.url
        : user.profilePicture);

  const currentCover = removeCoverFlag
    ? null
    : coverPreview || user.coverImage || user.coverPhotoUrl;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      // 1. Upload Avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append("profilePic", avatarFile);
        await uploadProfilePicture(formData);
      } else if (removeAvatarFlag) {
        await removeProfilePicture();
      }

      // 2. Upload Cover if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("coverPhoto", coverFile);
        await uploadCoverPhoto(formData);
      } else if (removeCoverFlag) {
        await removeCoverPhoto();
      }

      // 3. Normalize website if entered
      let formattedWebsite = website.trim();
      if (
        formattedWebsite &&
        !formattedWebsite.startsWith("http://") &&
        !formattedWebsite.startsWith("https://")
      ) {
        if (formattedWebsite.includes(".")) {
          formattedWebsite = `https://${formattedWebsite}`;
        }
      }

      // 4. Update profile fields
      const payload: UpdateUserPayload = {
        fullName: fullName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: formattedWebsite,
        gender: gender ? gender : undefined,
        dob: dob ? new Date(dob).toISOString() : undefined,
      };

      const updatedUser = await updateProfile(user.id, payload);
      await refreshUser();
      onProfileUpdated(updatedUser);
      toast.success("Profile updated successfully!");
      onClose();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast.error(err?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Click-outside Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/20 backdrop-blur-[0.5px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden={!isOpen}
      />

      {/* Fluid Right Drawer with smooth slide transition (500ms) */}
      <div
        className={`fixed top-0 bottom-0 right-0 z-[100] w-full sm:w-[480px] bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-label="Edit Profile Drawer"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 bg-white flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your personal details, bio, and photos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close edit profile drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="edit-profile-drawer-form"
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6"
        >
          {/* Cover Photo Section */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Cover Photo
            </label>
            <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              {currentCover ? (
                <img
                  src={currentCover}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 text-xs">
                  <Camera className="h-6 w-6 stroke-[1.5]" />
                  <span>Add a cover photo</span>
                </div>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm shadow transition-all cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{currentCover ? "Change" : "Upload"}</span>
                </button>
                {currentCover && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      setRemoveCoverFlag(true);
                    }}
                    className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs backdrop-blur-sm shadow transition-all cursor-pointer"
                    title="Remove cover photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#4E4AFC] text-white text-xl font-medium flex items-center justify-center">
                    {(fullName || user.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs"
                >
                  {currentAvatar ? "Change Avatar" : "Upload Avatar"}
                </Button>
                {currentAvatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      setRemoveAvatarFlag(true);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
          />

          {/* Bio */}
          <div className="space-y-1">
            <TextArea
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Tell the world a little about yourself..."
              rows={3}
            />
            <div className="flex justify-end">
              <span
                className={`text-[11px] ${
                  bio.length >= 480 ? "text-red-500 font-medium" : "text-slate-400"
                }`}
              >
                {bio.length}/500
              </span>
            </div>
          </div>

          {/* Location & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dhaka, Bangladesh"
              leftIcon={<MapPin className="h-4 w-4" />}
            />
            <Input
              label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://yourportfolio.com"
              leftIcon={<Globe className="h-4 w-4" />}
            />
          </div>

          {/* Gender & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-slate-700 tracking-wide">
                Gender
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(
                      e.target.value as "male" | "female" | "other" | ""
                    )
                  }
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none hover:border-slate-300 focus:bg-white focus:border-[#4E4AFC] focus:ring-3 focus:ring-[#4E4AFC]/15 transition-all cursor-pointer"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              leftIcon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </form>

        {/* Sticky Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-profile-drawer-form"
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
