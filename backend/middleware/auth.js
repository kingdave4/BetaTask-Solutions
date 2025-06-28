const { admin } = require("../firebase-admin");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log("No token provided");
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    try {
      console.log("Attempting Firebase token verification...");
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.userId = decodedToken.uid;
      console.log(`Token verified successfully for user: ${req.userId}`);
      next();
    } catch (firebaseError) {
      console.log(
        "Firebase verification failed:",
        firebaseError.code,
        firebaseError.message
      );

      // If the token is expired, return 401 so frontend can refresh
      if (firebaseError.code === "auth/id-token-expired") {
        console.log("Token expired, returning 401 for refresh");
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
        console.log("Invalid token, returning 401");
        return res.status(401).json({
          message: "Invalid token. Please log in again.",
          code: "INVALID_TOKEN",
        });
      }

      // For other Firebase errors, try fallback (only for network issues, etc.)
      console.log("Attempting fallback token parsing...");
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );

        // Check if token is expired by looking at exp claim
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.log("Token expired in fallback, returning 401");
          return res.status(401).json({
            message: "Token expired. Please refresh your authentication.",
            code: "TOKEN_EXPIRED",
          });
        }

        if (payload.user_id || payload.sub) {
          req.userId = payload.user_id || payload.sub;
          console.log(
            `Fallback authentication successful for user: ${req.userId}`
          );
          next();
        } else {
          throw new Error("No user ID in token");
        }
      } catch (fallbackError) {
        console.log("Fallback failed:", fallbackError.message);
        res.status(401).json({ message: "Invalid token." });
      }
    }
  } catch (error) {
    console.log("Auth middleware error:", error.message);
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = auth;
