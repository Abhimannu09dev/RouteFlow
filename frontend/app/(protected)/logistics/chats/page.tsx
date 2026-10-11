"use client";
import { useAuth } from "@/hooks/useAuth";
import ChatPage from "@/components/shared/chat";

export default function LogisticsChatsPage() {
  const { user } = useAuth();
  return <ChatPage role="logistics" currentUserId={user?.id ?? null} />;
}
