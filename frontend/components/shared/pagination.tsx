"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemLabel?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page number array with ellipsis
  function getPages(): (number | "...")[] {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  }

  const from =
    totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const to =
    totalItems && itemsPerPage
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3">
      {/* Item count */}
      {totalItems != null && from != null && to != null ? (
        <p className="text-xs text-[#838383]">
          Showing{" "}
          <span className="font-medium text-[#252C32]">
            {from}–{to}
          </span>{" "}
          of <span className="font-medium text-[#252C32]">{totalItems}</span>{" "}
          {itemLabel}
        </p>
      ) : (
        <p className="text-xs text-[#838383]">
          Page <span className="font-medium text-[#252C32]">{currentPage}</span>{" "}
          of <span className="font-medium text-[#252C32]">{totalPages}</span>
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E9EB] text-[#5B6871] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Pages */}
        {getPages().map((page, idx) =>
          page === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 h-8 flex items-center justify-center text-xs text-[#838383]"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                currentPage === page
                  ? "bg-primary text-white"
                  : "border border-[#E5E9EB] text-[#5B6871] hover:bg-[#F5F5F5]"
              }`}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E9EB] text-[#5B6871] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
