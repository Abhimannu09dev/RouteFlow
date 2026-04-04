import SupportTicket from "../models/supportTicketModel.js";

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

const VALID_STATUSES = ["open", "in-progress", "resolved"];

// Get all support tickets with optional filters and pagination
// Query params: ?status=open|in-progress|resolved&category=general|technical|billing&page=1&limit=10
const getAllTickets = async (req, res) => {
  try {
    const { status, category } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate("userId", "companyName email role")
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
    console.error("getAllTickets error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update ticket status and/or add an admin reply
const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminReply } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const updates = {};
    if (status) updates.status = status;
    if (adminReply?.trim()) {
      updates.adminReply = adminReply.trim();
      updates.repliedAt = new Date();
      // Auto-set to in-progress if still open when a reply is added
      if (!status) updates.status = "in-progress";
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: updates },
      { new: true },
    ).populate("userId", "companyName email role");

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error("updateTicket error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAllTickets, updateTicket };
