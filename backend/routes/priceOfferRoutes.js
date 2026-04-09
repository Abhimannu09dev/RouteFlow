import { Router } from "express";
import {
  submitOffer,
  getOffers,
  updateOffer,
  withdrawOffer,
  acceptOffer,
} from "../controllers/priceOfferController.js";
import { rolecheck } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  submitOfferSchema,
  updateOfferSchema,
} from "../validators/priceOfferValidators.js";

const router = Router();

router.get("/:orderId/offers", getOffers);
router.put(
  "/:orderId/offers/:offerId/accept",
  rolecheck(["manufacturer"]),
  acceptOffer,
);

router.use(rolecheck(["logistics"]));
router.post("/:orderId/offers", validate(submitOfferSchema), submitOffer);
router.put(
  "/:orderId/offers/:offerId",
  validate(updateOfferSchema),
  updateOffer,
);
router.delete("/:orderId/offers/:offerId", withdrawOffer);

export default router;
