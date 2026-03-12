const {
  getProfile,
  updateProfile,
} = require("./controllers/profileController");

router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
