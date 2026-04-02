"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    CheckIcon,
    UserGroupIcon,
    UserIcon,
    UserMinusIcon,
    UserPlusIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const CommunityPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState({});

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    try {
      const response = await axiosInstance.get("/users/friend-requests");
      if (response.data.success) {
        setFriendRequests(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch friend requests:", error);
    }
  };

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      const response = await axiosInstance.get("/users/friends");
      if (response.data.success) {
        setFriends(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchFriendRequests(), fetchFriends()]);
      setLoading(false);
    };
    
    fetchData();
  }, [isAuthenticated]);

  // Accept friend request
  const handleAcceptRequest = async (requestId) => {
    setProcessingIds(prev => ({ ...prev, [requestId]: true }));
    try {
      const response = await axiosInstance.post(`/users/friend-request/accept/${requestId}`);
      if (response.data.success) {
        toast.success("Friend request accepted!");
        await Promise.all([fetchFriendRequests(), fetchFriends()]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    } finally {
      setProcessingIds(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId) => {
    setProcessingIds(prev => ({ ...prev, [requestId]: true }));
    try {
      const response = await axiosInstance.post(`/users/friend-request/decline/${requestId}`);
      if (response.data.success) {
        toast.success("Friend request declined");
        fetchFriendRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to decline request");
    } finally {
      setProcessingIds(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendId) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    
    setProcessingIds(prev => ({ ...prev, [friendId]: true }));
    try {
      const response = await axiosInstance.delete(`/users/friends/${friendId}`);
      if (response.data.success) {
        toast.success("Friend removed");
        fetchFriends();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    } finally {
      setProcessingIds(prev => ({ ...prev, [friendId]: false }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <UserGroupIcon className="h-20 w-20 text-white/30 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-white/60 mb-6">Please login to see your community</p>
          <Link
            href="/auth/login"
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform"
          >
            Login Now
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent flex items-center gap-3">
            <UserGroupIcon className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
            Community
          </h1>
          <p className="text-white/60 mt-2">Manage your friends and friend requests</p>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 overflow-hidden mb-6">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === "requests"
                  ? "text-purple-400 border-b-2 border-purple-400 bg-white/5"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Friend Requests</span>
              {friendRequests.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === "friends"
                  ? "text-purple-400 border-b-2 border-purple-400 bg-white/5"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserGroupIcon className="h-5 w-5" />
              <span>Friends</span>
              {friends.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  {friends.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Friend Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
                <UserPlusIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No pending friend requests</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request._id}
                  className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <Link href={`/profile/${request.senderId}`}>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                        {request.senderProfilePicture ? (
                          <Image
                            src={request.senderProfilePicture}
                            alt={request.senderName}
                            width={56}
                            height={56}
                            className="object-cover"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <Link href={`/profile/${request.senderId}`}>
                        <h3 className="font-semibold text-white hover:text-purple-400 transition text-base sm:text-lg">
                          {request.senderName}
                        </h3>
                      </Link>
                      <p className="text-white/40 text-sm">
                        Sent you a friend request
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request._id)}
                        disabled={processingIds[request._id]}
                        className="p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 transition disabled:opacity-50"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request._id)}
                        disabled={processingIds[request._id]}
                        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition disabled:opacity-50"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.length === 0 ? (
              <div className="col-span-full backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-12 text-center">
                <UserGroupIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No friends yet</p>
                <p className="text-white/40 text-sm mt-2">
                  Send friend requests to connect with people
                </p>
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend._id}
                  className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-4 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${friend.friendId}`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center overflow-hidden cursor-pointer">
                        {friend.friendProfilePicture ? (
                          <Image
                            src={friend.friendProfilePicture}
                            alt={friend.friendName}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6 text-white" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${friend.friendId}`}>
                        <h3 className="font-semibold text-white hover:text-purple-400 transition truncate">
                          {friend.friendName}
                        </h3>
                      </Link>
                      <p className="text-white/40 text-xs">Friend</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.friendId)}
                      disabled={processingIds[friend.friendId]}
                      className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition disabled:opacity-50"
                    >
                      <UserMinusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;