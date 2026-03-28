"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
} from "react";
import { io, Socket } from "socket.io-client";
import {
  Send,
  Paperclip,
  Lock,
  X,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { chatAPI, type Message, type Conversation } from "@/lib/api";
import MessageBubble from "./message-bubble";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
}

export default function ChatWindow({
  conversation,
  currentUserId,
}: ChatWindowProps) {
  const { orderId, isClosed: initialClosed, otherParty } = conversation;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(initialClosed);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  //  Scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  //  Load message history
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setText("");
    setFile(null);
    setFilePreview(null);

    chatAPI
      .getMessages(orderId)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setIsClosed(data.isClosed);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load messages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  //  Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  //  Socket setup — use ref so send always targets the live socket (state lags one frame)
  useEffect(() => {
    const s = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = s;

    const onConnect = () => {
      s.emit("join_chat", { orderId });
      s.emit("mark_read", { orderId });
    };
    s.on("connect", onConnect);
    if (s.connected) onConnect();

    s.on("message_received", (msg: Message) => {
      setMessages((prev) => {
        // Avoid duplicates (REST upload + socket broadcast overlap)
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (String(msg.receiverId) === currentUserId) {
        s.emit("mark_read", { orderId });
      }
    });

    s.on("messages_read", ({ orderId: rid }: { orderId: string }) => {
      if (rid === orderId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId._id === currentUserId ? { ...m, isRead: true } : m,
          ),
        );
      }
    });

    s.on("chat_closed", () => {
      setIsClosed(true);
      toast.info("This order has been delivered. The chat is now closed.");
    });

    s.on("chat_error", ({ message }: { message: string }) => {
      toast.error(message);
    });

    return () => {
      s.off("connect", onConnect);
      s.emit("leave_chat", { orderId });
      s.disconnect();
      socketRef.current = null;
    };
  }, [orderId, currentUserId]);

  //  File pick
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ALLOWED_FILE_TYPES.includes(picked.type)) {
      toast.error("Only images and PDF/Word documents are allowed");
      return;
    }
    if (picked.size > MAX_FILE_SIZE) {
      toast.error("File must be under 5 MB");
      return;
    }

    setFile(picked);
    if (picked.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(picked));
    } else {
      setFilePreview(null);
    }
    e.target.value = "";
  }

  function clearFile() {
    setFile(null);
    setFilePreview(null);
  }

  //  Send
  async function handleSend() {
    if (isClosed) return;
    if (!text.trim() && !file) return;
    if (!otherParty?._id) {
      toast.error("Recipient not found");
      return;
    }

    setSending(true);
    try {
      if (file) {
        // File goes through REST (multipart)
        const data = await chatAPI.sendFile(
          orderId,
          otherParty._id,
          file,
          text.trim() || undefined,
        );
        if (data.success) {
          // Message will arrive via socket broadcast; optimistic add as fallback
          setMessages((prev) => {
            if (prev.some((m) => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
        }
        clearFile();
        setText("");
      } else {
        const s = socketRef.current;
        const payload = {
          orderId,
          receiverId: otherParty._id,
          content: text.trim(),
        };
        const emitSend = () => s?.emit("send_message", payload);
        if (s?.connected) emitSend();
        else if (s) s.once("connect", emitSend);
        else toast.error("Connection not ready. Please try again.");
        setText("");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  //  Render
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E5E9EB] bg-white flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm font-semibold text-[#252C32]">
            {otherParty?.companyName || "Unknown Company"}
          </p>
          <p className="text-xs text-[#9AA6AC]">{conversation.orderTitle}</p>
        </div>
        {isClosed && (
          <span className="flex items-center gap-1 text-xs text-[#9AA6AC] bg-[#F5F7F8] px-2.5 py-1 rounded-full border border-[#E5E9EB]">
            <Lock size={11} />
            Chat closed
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-[#F8FAFB]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#9AA6AC]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-[#9AA6AC]">No messages yet</p>
            <p className="text-xs text-[#9AA6AC]">Say hello 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isMine={msg.senderId._id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex items-center gap-2 shrink-0">
          <Lock size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            This order has been delivered. The chat is read-only.
          </p>
        </div>
      )}

      {/* File preview strip */}
      {file && (
        <div className="px-4 py-2 border-t border-[#E5E9EB] bg-white flex items-center gap-3 shrink-0">
          {filePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={filePreview}
              alt="preview"
              className="h-14 w-14 rounded-lg object-cover border border-[#E5E9EB]"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-[#F5F7F8] border border-[#E5E9EB] flex items-center justify-center">
              <FileText size={20} color="#5B6871" />
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium text-[#252C32] truncate">
              {file.name}
            </span>
            <span className="text-[10px] text-[#9AA6AC]">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <button
            onClick={clearFile}
            className="p-1 rounded-full hover:bg-[#F5F7F8] transition"
          >
            <X size={14} color="#5B6871" />
          </button>
        </div>
      )}

      {/* Input area */}
      {!isClosed && (
        <div className="px-4 py-3 border-t border-[#E5E9EB] bg-white flex items-end gap-2 shrink-0">
          {/* File attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl hover:bg-[#F5F7F8] transition shrink-0 self-end mb-0.5"
            title="Attach file"
            disabled={sending}
          >
            {file ? (
              <ImageIcon size={18} color="#3B82F6" />
            ) : (
              <Paperclip size={18} color="#5B6871" />
            )}
          </button>

          {/* Text input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#E5E9EB] px-3 py-2.5 text-sm text-[#252C32] placeholder-[#9AA6AC] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 max-h-28 overflow-y-auto transition"
            style={{ lineHeight: "1.5" }}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !file)}
            className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 self-end"
          >
            {sending ? (
              <Loader2 size={16} color="white" className="animate-spin" />
            ) : (
              <Send size={16} color="white" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
