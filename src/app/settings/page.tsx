"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Bell,
  Check,
  Eye,
  KeyRound,
  Lock,
  Moon,
  Shield,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<
    "account" | "notifications" | "privacy" | "appearance"
  >("account");

  // Form states
  const [fullName, setFullName] = useState(
    user?.fullName || user?.name || ""
  );
  const [email] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [likeNotifications, setLikeNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);

  // Privacy toggles
  const [privateProfile, setPrivateProfile] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Account settings updated successfully!");
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Manage your account preferences, privacy, and notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar Navigation */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveSection("account")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-normal text-left transition-colors cursor-pointer ${
              activeSection === "account"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("notifications")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-normal text-left transition-colors cursor-pointer ${
              activeSection === "notifications"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("privacy")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-normal text-left transition-colors cursor-pointer ${
              activeSection === "privacy"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy & Safety</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("appearance")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-normal text-left transition-colors cursor-pointer ${
              activeSection === "appearance"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Appearance</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Account Settings */}
          {activeSection === "account" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h2 className="text-base font-medium text-slate-900 mb-1">
                  Profile Information
                </h2>
                <p className="text-xs text-slate-500 mb-4 font-normal">
                  Update your display name and email address.
                </p>

                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400 mt-1 font-normal">
                      Email address cannot be changed directly.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white text-xs font-normal rounded-md transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h2 className="text-base font-medium text-slate-900 mb-1">
                  Change Password
                </h2>
                <p className="text-xs text-slate-500 mb-4 font-normal">
                  Ensure your account is using a long, random password.
                </p>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white text-xs font-normal rounded-md transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeSection === "notifications" && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div>
                <h2 className="text-base font-medium text-slate-900 mb-1">
                  Notification Preferences
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Choose how and when you want to be notified.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Email Notifications
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      Receive email updates about your account activity.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Push Notifications
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      Get notified in real-time when someone interacts with you.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Likes & Reactions
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      Notify when someone likes your posts or comments.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={likeNotifications}
                    onChange={(e) => setLikeNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Comments & Mentions
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      Notify when someone comments on your post or mentions you.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={commentNotifications}
                    onChange={(e) => setCommentNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {activeSection === "privacy" && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div>
                <h2 className="text-base font-medium text-slate-900 mb-1">
                  Privacy & Safety
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Control who can see your profile and activity.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Private Account
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      When private, only people you approve can see your posts.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privateProfile}
                    onChange={(e) => setPrivateProfile(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-slate-800">
                      Show Online Status
                    </p>
                    <p className="text-xs text-slate-400 font-normal">
                      Allow friends to see when you are active on the platform.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activityStatus}
                    onChange={(e) => setActivityStatus(e.target.checked)}
                    className="w-4 h-4 text-[#4E4AFC] rounded-md border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeSection === "appearance" && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div>
                <h2 className="text-base font-medium text-slate-900 mb-1">
                  Appearance
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Customize the look and feel of the interface.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-[#4E4AFC] rounded-lg p-4 cursor-pointer bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Light Mode
                    </span>
                    <span className="w-4 h-4 rounded-full bg-[#4E4AFC] flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-normal">
                    Standard clean and bright interface.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 opacity-60 cursor-not-allowed bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Dark Mode
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal">
                    High contrast dark theme.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

