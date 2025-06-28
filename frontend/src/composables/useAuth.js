import { ref, computed } from "vue";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

const user = ref(null);
const loading = ref(true);

// Initialize user from Firebase Auth
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    try {
      const idToken = await firebaseUser.getIdToken();

      let displayName = firebaseUser.displayName;
      let firstName = "";
      let lastName = "";
      let needsProfileUpdate = false;

      if (displayName && displayName.includes(" ")) {
        // User has a proper full name
        const nameParts = displayName.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
      } else if (displayName && !displayName.includes("@")) {
        // User has a single name (could be firstName or displayName)
        firstName = displayName;
        lastName = "";
      } else {
        // User doesn't have displayName or it looks like an email
        // This indicates they need to update their profile
        const emailPrefix = firebaseUser.email.split("@")[0];
        displayName = emailPrefix;
        firstName = emailPrefix;
        lastName = "";
        needsProfileUpdate = true;
      }

      user.value = {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        needsProfileUpdate: needsProfileUpdate,
        token: idToken,
      };
    } catch (error) {
      console.error("Error getting Firebase token:", error);
      user.value = null;
    }
  } else {
    user.value = null;
  }
  loading.value = false;
});

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      let displayName = userCredential.user.displayName;
      let firstName = "";
      let lastName = "";
      let needsProfileUpdate = false;

      if (displayName && displayName.includes(" ")) {
        // User has a proper full name
        const nameParts = displayName.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
      } else if (displayName && !displayName.includes("@")) {
        // User has a single name (could be firstName or displayName)
        firstName = displayName;
        lastName = "";
      } else {
        // User doesn't have displayName or it looks like an email
        // This indicates they need to update their profile
        const emailPrefix = userCredential.user.email.split("@")[0];
        displayName = emailPrefix;
        firstName = emailPrefix;
        lastName = "";
        needsProfileUpdate = true;
      }

      user.value = {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        needsProfileUpdate: needsProfileUpdate,
        token: idToken,
      };

      return userCredential.user;
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      }
      throw new Error(errorMessage);
    }
  };

  const signup = async (email, password, firstName, lastName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const fullName = `${firstName} ${lastName}`;
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
      const idToken = await userCredential.user.getIdToken();

      user.value = {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        token: idToken,
      };

      return userCredential.user;
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "Signup failed. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      }
      throw new Error(errorMessage);
    }
  };

  const updateUserProfile = async (firstName, lastName) => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user logged in");
      }

      const fullName = `${firstName} ${lastName}`.trim();
      await updateProfile(auth.currentUser, {
        displayName: fullName,
      });

      // Update the local user object
      if (user.value) {
        user.value.name = fullName;
        user.value.firstName = firstName;
        user.value.lastName = lastName;
        user.value.needsProfileUpdate = false;
      }

      return true;
    } catch (error) {
      console.error("Profile update error:", error);
      throw new Error("Failed to update profile. Please try again.");
    }
  };

  const refreshToken = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user logged in");
      }

      const idToken = await auth.currentUser.getIdToken(true);

      if (user.value) {
        user.value.token = idToken;
      }

      return idToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw new Error("Failed to refresh authentication token");
    }
  };

  const checkAndRefreshToken = async () => {
    try {
      if (!auth.currentUser || !user.value?.token) {
        return;
      }

      // Decode the token to check expiration
      const tokenParts = user.value.token.split(".");
      if (tokenParts.length !== 3) {
        return;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;

      if (expirationTime - now < 300) {
        await refreshToken();
      }
    } catch (error) {
      console.error("Error checking token expiration:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      user.value = null;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    updateUserProfile,
    refreshToken,
    checkAndRefreshToken,
    logout,
  };
}
