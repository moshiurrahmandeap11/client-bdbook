"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  MessageSquare,
  Search,
  Shield,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

const faqs = [
  {
    q: "How do I change my profile information?",
    a: "You can update your profile information by going to your Profile page and clicking 'Edit Profile' or through the Settings > Account section.",
  },
  {
    q: "How does the notification system work?",
    a: "You receive instant real-time notifications for likes, comments, and friend requests. Click the bell icon in the top navigation to view the slide-over notification panel.",
  },
  {
    q: "How can I make my account private?",
    a: "Navigate to Settings > Privacy & Safety, and toggle 'Private Account'. Once enabled, only accepted friends will be able to see your posts.",
  },
  {
    q: "What file types can I upload for posts?",
    a: "You can upload JPEG, PNG, GIF, and WebP images, as well as MP4, MOV, and AVI videos up to 50MB in size.",
  },
  {
    q: "How do I report inappropriate content?",
    a: "Click the three dots on any post and select 'Report'. Our moderation team reviews reported content within 24 hours.",
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }
    toast.success("Your message has been sent to our support team!");
    setContactSubject("");
    setContactMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <h1 className="text-2xl font-medium text-slate-900">
          Help & Support
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Find answers to common questions or reach out to our support team.
        </p>

        <div className="relative mt-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help topics, questions..."
            className="w-full px-4 py-2.5 pl-10 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Quick Help Topics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-md bg-[#4E4AFC]/10 text-[#4E4AFC] flex items-center justify-center mb-3">
            <User className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">
            Account & Security
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Manage your account settings, passwords, and login methods.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-md bg-[#4E4AFC]/10 text-[#4E4AFC] flex items-center justify-center mb-3">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">
            Privacy & Policies
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Learn about how we protect your personal information and data.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-md bg-[#4E4AFC]/10 text-[#4E4AFC] flex items-center justify-center mb-3">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">
            Community Guidelines
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Rules and best practices for creating a safe, respectful environment.
          </p>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="mb-10">
        <h2 className="text-lg font-medium text-slate-900 mb-4">
          Frequently Asked Questions
        </h2>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
          {filteredFaqs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-normal">
              No matching questions found.
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="p-4">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between text-left text-sm font-normal text-slate-800 hover:text-[#4E4AFC] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="text-xs text-slate-600 mt-2 font-normal leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contact Support Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-[#4E4AFC]" />
          <h2 className="text-base font-medium text-slate-900">
            Contact Support
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Cannot find what you are looking for? Send a direct message to our support team.
        </p>

        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#4E4AFC] resize-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white text-xs font-normal rounded-md transition-colors cursor-pointer"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

