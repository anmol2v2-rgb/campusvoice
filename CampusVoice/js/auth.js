import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ROLE_PAGES = {
  student: "student.html",
  pending: "staff.html",
  teacher: "staff.html",
  warden: "staff.html",
  principal: "admin.html",
  superadmin: "admin.html"
};

function rememberRole(role) {
  try {
    if (role) localStorage.setItem("cv_role", role);
    else localStorage.removeItem("cv_role");
  } catch (error) {
    console.log("Could not remember role", error);
  }
}

export function pageForRole(role) {
  return ROLE_PAGES[role] || "login.html";
}

export function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/invalid-email": "That email address does not look right.",
    "auth/missing-email": "Please type your email address first.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "No internet connection. Check your network and try again.",
    "permission-denied": "You do not have permission to do that.",
    "unavailable": "Could not reach the server. Check your internet connection."
  };
  if (error && error.message === "NO_PROFILE") {
    return "This account has no profile. Please sign up again.";
  }
  const known = error && messages[error.code];
  return known || "Something went wrong. " + (error && error.message ? error.message : "");
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function register(email, password, profileData) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      ...profileData,
      uid: cred.user.uid,
      email: cred.user.email,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    await deleteUser(cred.user).catch(() => {});
    throw error;
  }
  return profileData.role;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error("NO_PROFILE");
  }
  rememberRole(profile.role);
  return profile;
}

export async function sendReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
  rememberRole(null);
  location.replace("login.html");
}

function showFatal(text) {
  document.body.textContent = "";
  const p = document.createElement("p");
  p.className = "fatal";
  p.textContent = text + " ";
  const a = document.createElement("a");
  a.href = "login.html";
  a.textContent = "Back to login";
  p.append(a);
  document.body.append(p);
}

export function requireRole(allowedRoles) {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, async (user) => {
      stop();
      if (!user) {
        location.replace("login.html");
        return;
      }
      try {
        const profile = await getProfile(user.uid);
        if (!profile) {
          await signOut(auth);
          location.replace("login.html");
          return;
        }
        if (!allowedRoles.includes(profile.role)) {
          location.replace(pageForRole(profile.role));
          return;
        }
        rememberRole(profile.role);
        resolve({ user, profile });
      } catch (error) {
        console.error(error);
        showFatal("We could not load your account. " + friendlyError(error));
      }
    });
  });
}
