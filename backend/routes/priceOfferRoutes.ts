import { Router } from "express";
import { submitOffer, getOffers, updateOffer, withdrawOffer, acceptOffer } from "../controllers/priceOfferController.js";
import { rolecheck, requireVerification } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { submitOfferSchema, updateOfferSchema } from "../validators/priceOfferValidators.js";

const router: ReturnType<typeof Router> = Router();

router.get("/:orderId/offers", getOffers);
router.put("/:orderId/offers/:offerId/accept", rolecheck(["manufacturer"]), requireVerification, acceptOffer);

router.use(rolecheck(["logistics"]));
router.post("/:orderId/offers", requireVerification, validate(submitOfferSchema), submitOffer);
router.put("/:orderId/offers/:offerId", validate(updateOfferSchema), updateOffer);
router.delete("/:orderId/offers/:offerId", withdrawOffer);

export default router;
