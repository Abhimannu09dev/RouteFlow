import SupportTicket from "../models/supportTicketModel.js";

const getAllTickets = async (req, res) => {
  try {
    const { status, category } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = await SupportTicket.find(filter)
      .populate("userId", "companyName email role")
      .sort({ createdAt: -1 });

    res.json({ success: true, tickets });
  } catch (err) {
    console.error("getAllTickets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin can update status and/or add a reply
const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminReply } = req.body;

    const validStatuses = ["open", "in-progress", "resolved"];
    if (status && !validStatuses.includes(status)) {
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

    res.json({ success: true, ticket });
  } catch (err) {
    console.error("updateTicket error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAllTickets, updateTicket };
