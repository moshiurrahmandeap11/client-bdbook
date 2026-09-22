"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Users, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { createGroup } from "@/services/message.service";
import { IConversation } from "@/types/message.types";
import { IUser } from "@/types/user.types";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: IConversation) => void;
  currentUserId?: string;
  existingConversations?: IConversation[];
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
  currentUserId,
  existingConversations = [],
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; avatar?: string | null }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<Array<{ id: string; name: string; avatar?: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive initial candidates from existing 1-on-1 conversations
  const defaultCandidates = React.useMemo(() => {
    const list: Array<{ id: string; name: string; avatar?: string | null }> = [];
    const seen = new Set<string>();

    existingConversations.forEach((c) => {
      if (!c.isGroup && c.friendId && c.friendId !== currentUserId) {
        if (!seen.has(c.friendId)) {
          seen.add(c.friendId);
          list.push({
            id: c.friendId,
            name: c.friendName || "User",
            avatar: c.friendProfilePicture,
          });
        }
      }
    });

    return list;
  }, [existingConversations, currentUserId]);

  // Search people via API when query has at least 2 chars
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await apiClient.get(
          `/users/search/${encodeURIComponent(searchQuery.trim())}`
        );
        const users = res.data?.data || [];
        const mapped = users
          .filter((u: IUser) => (u.id || (u as any)._id) !== currentUserId)
          .map((u: IUser) => ({
            id: u.id || (u as any)._id,
            name: u.fullName || (u as any).name || "User",
            avatar:
              u.profilePicUrl ||
              (typeof (u as any).profilePicture === "object"
                ? (u as any).profilePicture?.url
                : (u as any).profilePicture) ||
              (u as any).avatar,
          }));
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  const toggleSelectMember = (user: { id: string; name: string; avatar?: string | null }) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m.id === user.id);
      if (exists) {
        return prev.filter((m) => m.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least 1 member to add to the group");
      return;
    }

    try {
      setIsSubmitting(true);
      const newGroup = await createGroup({
        name: trimmed,
        memberIds: selectedMembers.map((m) => m.id),
      });

      toast.success("Group created successfully!");
      onGroupCreated(newGroup);
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setSearchQuery("");
    setSelectedMembers([]);
    setSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  const displayCandidates = searchQuery.trim().length >= 2 ? searchResults : defaultCandidates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Create Group Chat
              </h3>
              <p className="text-xs text-muted">Chat with multiple friends together</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-fb-btn text-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Project Discussion, Trip Buddies..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-fb-input hover:bg-fb-input-hover focus:bg-card text-foreground rounded-xl border border-transparent focus:border-primary/40 focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                {selectedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-medium rounded-full"
                  >
                    <span>{m.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectMember(m)}
                      className="p-0.5 hover:bg-primary/20 rounded-full transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search Members */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Add Members
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search friends by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-fb-input hover:bg-fb-input-hover focus:bg-card text-foreground rounded-xl border border-transparent focus:border-primary/40 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Candidates List */}
          <div className="space-y-1 border border-border/60 rounded-xl max-h-52 overflow-y-auto p-1 divide-y divide-border/40">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching users...</span>
              </div>
            ) : displayCandidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                {searchQuery.trim().length >= 2
                  ? "No users found matching your search."
                  : "No recent contacts. Type above to search people."}
              </div>
            ) : (
              displayCandidates.map((c) => {
                const isSelected = selectedMembers.some((m) => m.id === c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelectMember(c)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-fb-btn rounded-lg transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center overflow-hidden shrink-0 border border-border">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {c.name}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-border bg-card"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-canvas/40 dark:bg-slate-900/20 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-full border border-border bg-fb-btn hover:bg-fb-btn-hover text-foreground transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting || !groupName.trim() || selectedMembers.length === 0}
            className="px-5 py-2 text-xs font-semibold rounded-full bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Group ({selectedMembers.length})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

