"use client";

import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/lib/axiosInstance";
import {
    MagnifyingGlassIcon,
    UserIcon,
    VideoCameraIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SearchPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Load query from URL on mount
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [searchParams]);

  // Debounced search - fetch both users and posts
  const performSearch = useCallback(async (query) => {
    if (!query.trim() || !isAuthenticated) return;
    
    setLoading(true);
    try {
      // Fetch users from your existing endpoint
      const [usersRes, postsRes] = await Promise.allSettled([
        axiosInstance.get(`/users/search/${encodeURIComponent(query)}`, { params: { limit: 20 } }),
        // Fetch posts and filter client-side (since backend doesn't have post search endpoint)
        axiosInstance.get("/posts", { params: { limit: 50 } }),
      ]);

      const users = usersRes.status === "fulfilled" && usersRes.value.data.success 
        ? usersRes.value.data.data 
        : [];

      // Client-side filter posts by description/content
      let posts = [];
      if (postsRes.status === "fulfilled" && postsRes.value.data.success) {
        const allPosts = postsRes.value.data.data;
        const searchLower = query.toLowerCase();
        posts = allPosts.filter(post => 
          post.description?.toLowerCase().includes(searchLower) ||
          post.userName?.toLowerCase().includes(searchLower)
        ).slice(0, 20); // Limit results
      }

      setSearchResults({ users, posts });
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Failed to fetch search results");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      performSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults({ users: [], posts: [] });
    router.push("/search");
    inputRef.current?.focus();
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "users", label: "People" },
    { id: "posts", label: "Posts" },
  ];

  // ── Render Components ────────────────────────────────────────────
  const UserResultCard = ({ user }) => (
    <Link
      href={`/profile/${user._id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
    >
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 flex-shrink-0">
        {user.profilePicture?.url ? (
          <Image src={user.profilePicture.url} alt={user.fullName} fill className="object-cover" />
        ) : (
          <UserIcon className="h-6 w-6 text-white m-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition">
          {user.fullName}
        </p>
        <p className="text-white/40 text-xs truncate">@{user.username || user.email?.split("@")[0]}</p>
      </div>
    </Link>
  );

  const PostResultCard = ({ post }) => (
    <Link
      href={`/post/details/${post._id}`}
      className="p-3 rounded-xl hover:bg-white/5 transition group"
    >
      <div className="flex items-start gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 flex-shrink-0">
          {post.userProfilePicture ? (
            <Image src={post.userProfilePicture} alt={post.userName} fill className="object-cover" />
          ) : (
            <UserIcon className="h-5 w-5 text-white m-2.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-xs mb-1">
            <span className="text-white font-medium">{post.userName}</span>
            {" · "}
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
          <p className="text-white text-sm line-clamp-2 group-hover:text-purple-400 transition">
            {post.description}
          </p>
          {post.media?.url && post.media.resourceType === "image" && (
            <div className="mt-2 rounded-lg overflow-hidden">
              <Image src={post.media.url} alt="Post" width={200} height={120} className="object-cover w-full h-32" />
            </div>
          )}
          {post.media?.url && post.media.resourceType === "video" && (
            <div className="mt-2 rounded-lg overflow-hidden relative bg-black">
              <video src={post.media.url} className="w-full h-32 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoCameraIcon className="h-8 w-8 text-white/70" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    const { users, posts } = searchResults;
    
    if (activeTab === "all") {
      if (users.length === 0 && posts.length === 0 && searchQuery.trim()) {
        return (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No results found for "{searchQuery}"</p>
            <p className="text-white/30 text-sm mt-2">Try different keywords</p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {users.length > 0 && (
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-2 px-1">People</h3>
              <div className="space-y-1">
                {users.map((u) => <UserResultCard key={u._id} user={u} />)}
              </div>
            </div>
          )}
          {posts.length > 0 && (
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-2 px-1">Posts</h3>
              <div className="space-y-1">
                {posts.map((p) => <PostResultCard key={p._id} post={p} />)}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "users") {
      if (users.length === 0) {
        return <div className="text-center py-8 text-white/40">No people found</div>;
      }
      return <div className="space-y-1">{users.map((u) => <UserResultCard key={u._id} user={u} />)}</div>;
    }

    if (activeTab === "posts") {
      if (posts.length === 0) {
        return <div className="text-center py-8 text-white/40">No posts found</div>;
      }
      return <div className="space-y-1">{posts.map((p) => <PostResultCard key={p._id} post={p} />)}</div>;
    }

    return null;
  };

  // ── Auth Guard ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#18191a]">
        <div className="text-center">
          <p className="text-white/70 mb-4">Please login to search</p>
          <Link href="/auth/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191a] pt-20 pb-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Search Header */}
        <div className="sticky top-20 z-30 bg-[#18191a]/95 backdrop-blur-xl py-4">
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = setTimeout(() => {
                  if (e.target.value.trim()) {
                    router.push(`/search?q=${encodeURIComponent(e.target.value)}`);
                    performSearch(e.target.value);
                  }
                }, 500);
              }}
              placeholder="Search BD BOOK..."
              className="w-full bg-[#242526] text-white rounded-full py-3 pl-12 pr-12 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition">
                <XMarkIcon className="h-4 w-4 text-white/60" />
              </button>
            )}
          </form>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "bg-[#242526] text-white/60 hover:text-white hover:bg-[#3a3b3c]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-1 mt-4">
          {searchQuery.trim() && renderResults()}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default SearchPage;