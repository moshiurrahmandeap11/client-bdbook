"use client";

import { Suspense } from "react";
import MessagePage from "../components/messageComponents/MessagePage";

const Message = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <MessagePage />
    </Suspense>
  );
};

export default Message;