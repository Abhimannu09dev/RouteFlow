"use client";
import { useAuth } from "@/hooks/useAuth";
import ChatPage from "@/components/shared/chat";

export default function ManufacturerChatsPage() {
  const { user } = useAuth();
  return <ChatPage role="manufacturer" currentUserId={user?.id ?? null} />;
}
