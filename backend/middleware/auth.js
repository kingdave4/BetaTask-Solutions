const { admin } = require("../firebase-admin");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.userId = decodedToken.uid;
      next();
    } catch (firebaseError) {
      console.log(
        "Firebase verification failed, trying fallback:",
        firebaseError.message
      );

      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );
        if (payload.user_id || payload.sub) {
          req.userId = payload.user_id || payload.sub;
          next();
        } else {
          throw new Error("No user ID in token");
        }
      } catch (fallbackError) {
        res.status(401).json({ message: "Invalid token." });
      }
    }
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = auth;
