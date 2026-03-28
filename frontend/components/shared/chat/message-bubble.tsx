import { format } from "date-fns";
import { FileText, Download } from "lucide-react";
import type { Message } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), "hh:mm a");

  return (
    <div
      className={`flex flex-col gap-0.5 max-w-[70%] ${isMine ? "self-end items-end" : "self-start items-start"}`}
    >
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isMine
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-white border border-[#E5E9EB] text-[#252C32] rounded-bl-sm"
        }`}
      >
        {/* Image attachment */}
        {message.fileType === "image" && message.fileUrl && (
          <a
            href={`${API_BASE}${message.fileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API_BASE}${message.fileUrl}`}
              alt={message.fileName || "image"}
              className="rounded-xl max-w-[200px] max-h-[200px] object-cover"
            />
          </a>
        )}

        {/* Document attachment */}
        {message.fileType === "document" && message.fileUrl && (
          <a
            href={`${API_BASE}${message.fileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-xl text-xs font-medium ${
              isMine ? "bg-blue-400 text-white" : "bg-[#F5F7F8] text-[#252C32]"
            }`}
          >
            <FileText size={14} />
            <span className="truncate max-w-[160px]">
              {message.fileName || "Document"}
            </span>
            <Download size={12} className="shrink-0" />
          </a>
        )}

        {/* Text content */}
        {message.content && (
          <p className="leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
      </div>

      <span
        className={`text-[10px] text-[#9AA6AC] px-1 ${isMine ? "text-right" : "text-left"}`}
      >
        {time}
        {isMine && (
          <span className="ml-1">{message.isRead ? "· Read" : ""}</span>
        )}
      </span>
    </div>
  );
}
