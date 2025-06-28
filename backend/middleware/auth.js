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
      if (firebaseError.code === "auth/id-token-expired") {
        return res.status(401).json({
          message: "Token expired. Please refresh your authentication.",
          code: "TOKEN_EXPIRED",
        });
      }

      // If token is invalid, also return 401
      if (
        firebaseError.code === "auth/argument-error" ||
        firebaseError.code === "auth/invalid-id-token"
      ) {
        return res.status(401).json({
          message: "Invalid token. Please log in again.",
          code: "INVALID_TOKEN",
        });
      }

      // For other Firebase errors, try fallback (only for network issues, etc.)
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );

        // Check if token is expired by looking at exp claim
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          return res.status(401).json({
            message: "Token expired. Please refresh your authentication.",
            code: "TOKEN_EXPIRED",
          });
        }

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
