import { Router } from "express";
import {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
} from "../controllers/priceOfferController.js";
import { rolecheck } from "../middleware/auth.js";

const router = Router();

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

export default router;
