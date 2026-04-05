import SupportTicket from "../models/supportTicketModel.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

const VALID_CATEGORIES = ["general", "technical", "billing"];

// Create a new support ticket
const createTicket = async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    if (!subject?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Subject is required" });
    }
    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });

    return res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error("createTicket error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all tickets submitted by the logged-in user (paginated)
const getMyTickets = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user.id };

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      tickets,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("getMyTickets error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { createTicket, getMyTickets };
