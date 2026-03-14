const { Router } = require("express");
const {
  getProfile,
  updateProfile,
} = require("../controllers/profileController");
const { auth } = require("../middleware/auth");

const router = Router();

router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

module.exports = router;
