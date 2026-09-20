"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IUser, IPost } from "@/interfaces";
import { searchService } from "@/services/search.service";
import PostCard from "@/components/post_components/PostCard";
import { Search, User as UserIcon, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"all" | "users" | "posts">("all");
  const [users, setUsers] = useState<IUser[]>([]);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    Promise.all([
      searchService.searchUsers(query, 20).catch(() => []),
      searchService.searchPosts(query, 20).catch(() => []),
    ])
      .then(([usersData, postsData]) => {
        setUsers(usersData || []);
        setPosts(postsData || []);
      })
      .finally(() => setLoading(false));
  }, [query]);

  const totalResults = users.length + posts.length;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4E4AFC]/10 text-[#4E4AFC] flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-slate-900">
              {query ? `Search results for "${query}"` : "Search"}
            </h1>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {loading
                ? "Searching..."
                : `${totalResults} ${totalResults === 1 ? "result" : "results"} found`}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-md text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-1.5 rounded-md text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "users"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-1.5 rounded-md text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "posts"
                ? "bg-[#4E4AFC] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Posts ({posts.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#4E4AFC] mb-3"></div>
          <p className="text-sm text-slate-500 font-normal">Loading results...</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Search className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-medium text-slate-800">No results found</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal">
            We could not find anything matching &quot;{query}&quot;. Try searching for another name, username, or post keyword.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users section */}
          {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-medium text-slate-800">
                  People ({users.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {users.map((u) => {
                  const uAvatar =
                    u.avatar ||
                    u.profilePicUrl ||
                    (typeof u.profilePicture === "object"
                      ? u.profilePicture?.url
                      : u.profilePicture);
                  const uName = u.fullName || u.name || u.username || "User";
                  const uUsername = u.username || u.id || u._id;

                  return (
                    <Link
                      key={u.id || u._id}
                      href={`/s/${uUsername}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                          {uAvatar ? (
                            <img
                              src={uAvatar}
                              alt={uName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-normal text-[#4E4AFC]">
                              {uName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {uName}
                          </p>
                          {u.username && (
                            <p className="text-xs text-[#4E4AFC] truncate font-normal">
                              @{u.username}
                            </p>
                          )}
                          {u.bio && (
                            <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md font-normal">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Posts section */}
          {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-medium text-slate-800">
                  Posts ({posts.length})
                </h2>
              </div>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id || post._id} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-16 px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#4E4AFC] mb-3"></div>
          <p className="text-sm text-slate-500 font-normal">Loading search...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

