"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// ✅ Dynamically import RoomPage with SSR disabled
const RoomPage = dynamic(() => import('@/app/components/roomComponents/RoomPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#202124] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#8ab4f8] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[#9aa0a6]">Loading meeting...</p>
      </div>
    </div>
  ),
});

// ✅ Wrap with Suspense boundary
const Room = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#202124] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#8ab4f8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#9aa0a6]">Loading...</p>
        </div>
      </div>
    }>
      <RoomPage />
    </Suspense>
  );
};

export default Room;