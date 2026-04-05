"use client";

import { Suspense } from "react";
import MessagePage from "../components/messageComponents/MessagePage";

const Message = () => {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <MessagePage />
    </Suspense>
  );
};

export default Message;