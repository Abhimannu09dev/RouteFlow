import { Router } from "express";
import {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
  getMyOffers,
} from "../controllers/priceOfferController.js";
import { rolecheck } from "../middleware/auth.js";

const router = Router();

router.get("/my-offers", rolecheck(["logistics"]), getMyOffers);

router.get("/:orderId/offers", getOffers);
router.put(
  "/:orderId/offers/:offerId/accept",
  rolecheck(["manufacturer"]),
  acceptOffer,
);

router.use(rolecheck(["logistics"]));
router.post("/:orderId/offers", submitOffer);
router.put("/:orderId/offers/:offerId", updateOffer);
router.delete("/:orderId/offers/:offerId", withdrawOffer);

export default router;
