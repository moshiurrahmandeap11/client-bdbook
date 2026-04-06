// ─────────────────────────────────────────────────────────────────────────────
// PART 3: components/messaging/Skeletons.jsx
// Skeleton loaders — replaces all spinners for instant perceived performance
// ─────────────────────────────────────────────────────────────────────────────

// ── Base pulse animation wrapper ─────────────────────────────────────────────
const Pulse = ({ className = "" }) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`} />
);

// ── Conversation List Skeleton ───────────────────────────────────────────────
export const ConversationSkeleton = () => (
  <div className="flex items-center gap-3 px-3 py-2 mx-1">
    {/* Avatar */}
    <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
    {/* Lines */}
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-center">
        <Pulse className="h-3.5 w-28 rounded-full" />
        <Pulse className="h-2.5 w-10 rounded-full" />
      </div>
      <Pulse className="h-3 w-40 rounded-full" />
    </div>
  </div>
);

export const ConversationListSkeleton = ({ count = 8 }) => (
  <div className="py-2 space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <ConversationSkeleton key={i} />
    ))}
  </div>
);

// ── Message Bubbles Skeleton ─────────────────────────────────────────────────
const MessageBubbleSkeleton = ({ isOwn, wide = false }) => (
  <div className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2 mt-3`}>
    {!isOwn && (
      <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
    )}
    <div
      className={`h-9 rounded-2xl bg-white/10 animate-pulse ${
        wide ? "w-52" : "w-32"
      }`}
    />
  </div>
);

export const MessageListSkeleton = () => (
  <div className="px-4 py-4">
    <MessageBubbleSkeleton isOwn={false} wide />
    <MessageBubbleSkeleton isOwn={false} />
    <MessageBubbleSkeleton isOwn={true} wide />
    <MessageBubbleSkeleton isOwn={true} />
    <MessageBubbleSkeleton isOwn={false} />
    <MessageBubbleSkeleton isOwn={true} wide />
    <MessageBubbleSkeleton isOwn={false} wide />
    <MessageBubbleSkeleton isOwn={true} />
    <MessageBubbleSkeleton isOwn={false} />
    <MessageBubbleSkeleton isOwn={true} />
  </div>
);