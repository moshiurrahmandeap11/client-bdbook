"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    ArrowLeftIcon,
    CameraIcon,
    CheckIcon,
    LinkIcon,
    MapPinIcon,
    UserIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const EditProfilePage = () => {
  const { id } = useParams();
  const { user, refreshUser, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const coverInputRef = useRef(null);
  const profileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    website: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Debug: Log user data
  useEffect(() => {
    console.log("EditProfilePage - User data:", user);
    console.log("EditProfilePage - User ID from params:", id);
    console.log("EditProfilePage - Current user ID:", user?._id);
    console.log("EditProfilePage - Is own profile:", user?._id === id);
  }, [user, id]);

  // Check if user is editing their own profile
  const isOwnProfile = user?._id === id || user?.id === id;

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push("/auth/login");
      return;
    }
    
    // If not own profile, redirect to profile page
    if (user && !isOwnProfile && !authLoading) {
      toast.error("You can only edit your own profile");
      router.push(`/profile/${id}`);
      return;
    }
    
    if (user && isOwnProfile) {
      setFormData({
        fullName: user.fullName || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        gender: user.gender || "",
      });
    }
  }, [user, isAuthenticated, authLoading, isOwnProfile, id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log("Uploading cover photo:", file.name, file.type, file.size);
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, WEBP)");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    
    setUploadingCover(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      
      console.log("Sending cover photo to:", "/users/upload-cover-photo");
      
      const response = await axiosInstance.post("/users/upload-cover-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      console.log("Cover upload response:", response.data);
      
      if (response.data.success) {
        toast.success("Cover photo updated successfully!");
        await refreshUser();
        setCoverPreview(null);
      } else {
        toast.error(response.data.message || "Failed to upload cover photo");
      }
    } catch (error) {
      console.error("Cover upload failed:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      // Show specific error message from backend
      const errorMessage = error.response?.data?.message || "Failed to upload cover photo";
      toast.error(errorMessage);
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log("Uploading profile picture:", file.name, file.type, file.size);
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, WEBP)");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    
    setUploadingProfile(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      
      console.log("Sending profile picture to:", "/users/upload-profile-pic");
      
      const response = await axiosInstance.post("/users/upload-profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      console.log("Profile upload response:", response.data);
      
      if (response.data.success) {
        toast.success("Profile picture updated successfully!");
        await refreshUser();
        setProfilePreview(null);
      } else {
        toast.error(response.data.message || "Failed to upload profile picture");
      }
    } catch (error) {
      console.error("Profile upload failed:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || "Failed to upload profile picture";
      toast.error(errorMessage);
      setProfilePreview(null);
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!confirm("Remove cover photo?")) return;
    
    setUploadingCover(true);
    try {
      console.log("Removing cover photo...");
      const response = await axiosInstance.delete("/users/remove-cover-photo");
      console.log("Remove cover response:", response.data);
      
      if (response.data.success) {
        toast.success("Cover photo removed");
        await refreshUser();
      } else {
        toast.error(response.data.message || "Failed to remove cover photo");
      }
    } catch (error) {
      console.error("Remove cover failed:", error);
      console.error("Error response:", error.response);
      toast.error(error.response?.data?.message || "Failed to remove cover photo");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveProfile = async () => {
    if (!confirm("Remove profile picture?")) return;
    
    setUploadingProfile(true);
    try {
      console.log("Removing profile picture...");
      const response = await axiosInstance.delete("/users/remove-profile-pic");
      console.log("Remove profile response:", response.data);
      
      if (response.data.success) {
        toast.success("Profile picture removed");
        await refreshUser();
      } else {
        toast.error(response.data.message || "Failed to remove profile picture");
      }
    } catch (error) {
      console.error("Remove profile failed:", error);
      console.error("Error response:", error.response);
      toast.error(error.response?.data?.message || "Failed to remove profile picture");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    
    // Get user ID from user object
    const userId = user?._id || user?.id;
    
    if (!userId) {
      console.error("No user ID found:", user);
      toast.error("User ID not found. Please log out and log in again.");
      return;
    }
    
    console.log("Updating user with ID:", userId);
    console.log("Update data:", {
      fullName: formData.fullName.trim(),
      bio: formData.bio?.trim() || "",
      location: formData.location?.trim() || "",
      website: formData.website?.trim() || "",
      gender: formData.gender || "",
    });
    
    setLoading(true);
    try {
      const response = await axiosInstance.patch(`/users/${userId}`, {
        fullName: formData.fullName.trim(),
        bio: formData.bio?.trim() || "",
        location: formData.location?.trim() || "",
        website: formData.website?.trim() || "",
        gender: formData.gender || "",
      });
      
      console.log("Update response:", response.data);
      
      if (response.data.success) {
        toast.success("Profile updated successfully!");
        await refreshUser();
        router.push(`/profile/${userId}`);
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update failed:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      if (error.response?.status === 403) {
        toast.error("You don't have permission to update this profile");
      } else {
        toast.error(error.response?.data?.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <ArrowLeftIcon className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Edit Profile
            </h1>
            <p className="text-white/60 mt-1">Update your profile information</p>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6">
            <label className="block text-white font-medium mb-3">Cover Photo</label>
            <div className="relative h-40 rounded-xl overflow-hidden bg-white/10 border border-white/20">
              {coverPreview ? (
                <Image src={coverPreview} alt="Preview" fill className="object-cover" />
              ) : user.coverPhoto?.url ? (
                <Image src={user.coverPhoto.url} alt="Cover" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CameraIcon className="h-12 w-12 text-white/50" />
                </div>
              )}
              {uploadingCover && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm hover:bg-white/30 transition"
                  disabled={uploadingCover}
                >
                  <CameraIcon className="h-4 w-4 inline mr-1" />
                  Change
                </button>
                {user.coverPhoto?.url && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="px-3 py-1.5 bg-red-500/20 backdrop-blur-sm rounded-lg text-red-300 text-sm hover:bg-red-500/30 transition"
                    disabled={uploadingCover}
                  >
                    <XMarkIcon className="h-4 w-4 inline mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <p className="text-white/40 text-xs mt-2">Recommended size: 1200x400px</p>
          </div>

          {/* Profile Picture Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6">
            <label className="block text-white font-medium mb-3">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
                {profilePreview ? (
                  <Image src={profilePreview} alt="Preview" fill className="object-cover" />
                ) : user.profilePicture?.url ? (
                  <Image src={user.profilePicture.url} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-white" />
                  </div>
                )}
                {uploadingProfile && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  className="px-4 py-2 bg-white/10 rounded-xl text-white text-sm hover:bg-white/20 transition"
                  disabled={uploadingProfile}
                >
                  <CameraIcon className="h-4 w-4 inline mr-1" />
                  Upload
                </button>
                {user.profilePicture?.url && (
                  <button
                    type="button"
                    onClick={handleRemoveProfile}
                    className="px-4 py-2 bg-red-500/20 rounded-xl text-red-300 text-sm hover:bg-red-500/30 transition"
                    disabled={uploadingProfile}
                  >
                    <XMarkIcon className="h-4 w-4 inline mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileUpload}
              className="hidden"
            />
            <p className="text-white/40 text-xs mt-2">Recommended size: 200x200px</p>
          </div>

          {/* Basic Information */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-6 space-y-4">
            <h3 className="text-white font-medium mb-4">Basic Information</h3>
            
            <div>
              <label className="block text-white/80 text-sm mb-2">Full Name *</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                maxLength="160"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Tell us about yourself"
              />
              <p className="text-white/40 text-xs mt-1 text-right">{formData.bio.length}/160 characters</p>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Location</label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Website</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;