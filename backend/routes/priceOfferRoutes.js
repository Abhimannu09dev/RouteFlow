const express = require("express");
const router = express.Router();

const {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
} = require("../controllers/priceOfferController");

const { rolecheck } = require("../middleware/auth");

router.post("/:orderId/offers", rolecheck(["logistics"]), submitOffer);
router.get("/:orderId/offers", getOffers);
router.put("/:orderId/offers/:offerId", rolecheck(["logistics"]), updateOffer);
router.delete(
  "/:orderId/offers/:offerId",
  rolecheck(["logistics"]),
  withdrawOffer,
);
router.put(
  "/:orderId/offers/:offerId/accept",
  rolecheck(["manufacturer"]),
  acceptOffer,
);

module.exports = router;
