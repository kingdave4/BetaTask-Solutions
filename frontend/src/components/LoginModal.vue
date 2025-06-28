<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2>{{ isProfileUpdate ? 'Update Your Profile' : (isSignUp ? 'Sign Up' : 'Sign In') }}</h2>
      
      <div v-if="isProfileUpdate" class="profile-update-info">
        <p>Welcome! To personalize your experience, please provide your first and last name.</p>
      </div>
      
      <div v-if="authError" class="auth-error">
        {{ authError }}
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="isSignUp || isProfileUpdate" class="form-group">
          <label for="firstName">First Name*</label>
          <input
            type="text"
            id="firstName"
            v-model="firstName"
            placeholder="Enter your first name"
            class="form-input"
            :class="{ error: firstNameError }"
          />
          <p v-if="firstNameError" class="input-error">{{ firstNameError }}</p>
        </div>

        <div v-if="isSignUp || isProfileUpdate" class="form-group">
          <label for="lastName">Last Name*</label>
          <input
            type="text"
            id="lastName"
            v-model="lastName"
            placeholder="Enter your last name"
            class="form-input"
            :class="{ error: lastNameError }"
          />
          <p v-if="lastNameError" class="input-error">{{ lastNameError }}</p>
        </div>

        <div v-if="!isProfileUpdate" class="form-group">
          <label for="email">Email*</label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="Enter your email"
            class="form-input"
            :class="{ error: emailError }"
          />
          <p v-if="emailError" class="input-error">{{ emailError }}</p>
        </div>

        <div v-if="!isProfileUpdate" class="form-group">
          <label for="password">Password*</label>
          <input
            type="password"
            id="password"
            v-model="password"
            placeholder="Enter your password"
            class="form-input"
            :class="{ error: passwordError }"
          />
          <p v-if="passwordError" class="input-error">{{ passwordError }}</p>
        </div>

        <div v-if="isSignUp" class="form-group">
          <label for="confirmPassword">Confirm Password*</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            placeholder="Confirm your password"
            class="form-input"
            :class="{ error: confirmPasswordError }"
          />
          <p v-if="confirmPasswordError" class="input-error">{{ confirmPasswordError }}</p>
        </div>

        <div class="modal-actions">
          <button type="submit" class="form-button primary-button">
            {{ isProfileUpdate ? 'Update Profile' : (isSignUp ? 'Sign Up' : 'Sign In') }}
          </button>
          <button v-if="!isProfileUpdate" type="button" @click="closeModal" class="form-button cancel-button">
            Cancel
          </button>
        </div>
      </form>

      <div v-if="!isProfileUpdate" class="auth-toggle">
        <p v-if="!isSignUp">
          Don't have an account?
          <a href="#" @click.prevent="toggleMode" class="toggle-link">Sign up here</a>
        </p>
        <p v-else>
          Already have an account?
          <a href="#" @click.prevent="toggleMode" class="toggle-link">Sign in here</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  showModal: {
    type: Boolean,
    required: true,
  },
  mode: {
    type: String,
    default: 'signin', // 'signin', 'signup', 'profile-update'
  },
});

const emit = defineEmits(["close-modal", "login", "signup", "profile-update"]);

const isSignUp = ref(false);
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const firstName = ref("");
const lastName = ref("");
const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");
const firstNameError = ref("");
const lastNameError = ref("");
const authError = ref("");
const isProfileUpdate = ref(false);

watch(
  () => props.showModal,
  (newValue) => {
    if (newValue) {
      resetForm();
    }
  }
);

watch(
  () => props.mode,
  (newMode) => {
    if (newMode === 'profile-update') {
      isProfileUpdate.value = true;
      isSignUp.value = false;
    } else if (newMode === 'signup') {
      isSignUp.value = true;
      isProfileUpdate.value = false;
    } else {
      isSignUp.value = false;
      isProfileUpdate.value = false;
    }
  },
  { immediate: true }
);

const resetForm = () => {
  firstName.value = "";
  lastName.value = "";
  email.value = "";
  password.value = "";
  confirmPassword.value = "";
  firstNameError.value = "";
  lastNameError.value = "";
  emailError.value = "";
  passwordError.value = "";
  confirmPasswordError.value = "";
  authError.value = "";
  isProfileUpdate.value = false;
};

const validateForm = () => {
  let isValid = true;
  
  // Reset errors
  emailError.value = "";
  passwordError.value = "";
  confirmPasswordError.value = "";
  firstNameError.value = "";
  lastNameError.value = "";
  authError.value = "";

  // Skip email and password validation for profile updates
  if (!isProfileUpdate.value) {
  // Email validation
  if (!email.value.trim()) {
    emailError.value = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email.value)) {
    emailError.value = "Please enter a valid email";
    isValid = false;
  }

  // Password validation
  if (!password.value.trim()) {
    passwordError.value = "Password is required";
    isValid = false;
  } else if (password.value.length < 6) {
    passwordError.value = "Password must be at least 6 characters";
    isValid = false;
  }
  }

  // Sign up and profile update specific validations
  if (isSignUp.value || isProfileUpdate.value) {
    if (!firstName.value.trim()) {
      firstNameError.value = "First name is required";
      isValid = false;
    }

    if (!lastName.value.trim()) {
      lastNameError.value = "Last name is required";
      isValid = false;
    }
  }

  if (isSignUp.value) {
    if (!confirmPassword.value.trim()) {
      confirmPasswordError.value = "Please confirm your password";
      isValid = false;
    } else if (password.value !== confirmPassword.value) {
      confirmPasswordError.value = "Passwords do not match";
      isValid = false;
    }
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  // Clear ALL previous errors before attempting login
  authError.value = "";
  passwordError.value = "";
  emailError.value = "";
  firstNameError.value = "";
  lastNameError.value = "";
  confirmPasswordError.value = "";

  try {
    if (isProfileUpdate.value) {
      await emit("profile-update", {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim()
      });
    } else if (isSignUp.value) {
      await emit("signup", {
        email: email.value.trim(),
        password: password.value,
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim()
      });
    } else {
      await emit("login", {
        email: email.value.trim(),
        password: password.value
      });
    }
    closeModal();
  } catch (error) {
    handleError(error);
  }
};

const handleError = (error) => {
  console.error("Authentication error in LoginModal:", error); // Log the error for debugging
  // Reset specific input errors first
  emailError.value = "";
  passwordError.value = "";
  firstNameError.value = "";
  lastNameError.value = "";
  confirmPasswordError.value = "";
  authError.value = "";

  // Check for specific Firebase Auth error codes
  switch (error.message) {
    case "No user found with this email.":
      emailError.value = error.message;
      break;
    case "Incorrect password.":
      passwordError.value = error.message;
      password.value = "";
      break;
    case "Invalid email address format.":
      emailError.value = error.message;
      break;
    case "This email address is already in use.":
      emailError.value = error.message;
      break;
    case "Password is too weak.":
      passwordError.value = error.message;
      break;
    default:
      authError.value = error.message || "An unexpected authentication error occurred. Please try again.";
      break;
  }
};

defineExpose({
  handleError
});

const toggleMode = () => {
  isSignUp.value = !isSignUp.value;
  resetForm();
};

const closeModal = () => {
  emit("close-modal");
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #252525;
  padding: 30px 40px;
  border-radius: 8px;
  border: 1px solid #444;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 25px;
  text-align: center;
  font-weight: 400;
  color: #eee;
}

.auth-form .form-group {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.modal-actions .form-button {
  padding: 10px 20px;
}

.cancel-button {
  background-color: #555;
  border-color: #444;
}
.cancel-button:hover {
  background-color: #666;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #ccc;
  font-size: 0.9em;
  font-weight: 500;
}

.form-input {
  padding: 12px 15px;
  border: 1px solid #444;
  background-color: #333;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 1em;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #42b983;
}

.form-input.error {
  border-color: #ff6b6b;
}

.form-input::placeholder {
  color: #888;
}

.input-error {
  color: #ff8a8a;
  font-size: 0.85em;
  margin-top: 5px;
  min-height: 1.2em;
}

.form-button {
  padding: 12px 20px;
  border: none;
  background-color: #42b983;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 1em;
  white-space: nowrap;
}

.form-button:hover {
  background-color: #36a476;
}

.primary-button {
  background-color: #42b983;
}

.auth-toggle {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
}

.auth-toggle p {
  color: #ccc;
  margin: 0;
}

.toggle-link {
  color: #42b983;
  text-decoration: none;
  font-weight: 500;
}

.toggle-link:hover {
  text-decoration: underline;
}

.auth-error {
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 0.9em;
}

.profile-update-info {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 0.9em;
}
</style> 