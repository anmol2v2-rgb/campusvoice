import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const TEACHER_FACTORS = [
  ["clarity", "Teaching clarity"], ["punctuality", "Punctuality"],
  ["doubts", "Doubt solving"], ["behaviour", "Behaviour"]
];
export const COLLEGE_FACTORS = [
  ["mess", "Mess food"], ["study", "Study quality"], ["hostel", "Hostel"],
  ["campus", "Campus and facilities"], ["wifi", "Wi-Fi"], ["overall", "Overall"]
];
export const MIN_RATINGS = 3;

const BANNED = [
  "idiot", "stupid", "bastard", "fuck", "shit", "bitch", "asshole",
  "madarchod", "bhenchod", "behenchod", "chutiya", "harami", "randi"
];

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function barRow(label, valueText, percent, color) {
  const row = el("div", "bar-row");
  const track = el("span", "bar-track");
  track.setAttribute("aria-hidden", "true");
  const fill = el("span", "bar-fill");
  fill.style.width = percent + "%";
  fill.style.background = color;
  track.append(fill);
  row.append(el("span", "bar-label", label), track, el("span", "bar-value", valueText));
  return row;
}

export function scoreColor(v) {
  const r = Math.round(v * 10) / 10;
  return r >= 4 ? "var(--ok)" : r >= 3.3 ? "var(--accent)" : "var(--bad)";
}

export async function loadMyRatingSummary(teacherUid) {
  const snap = await getDocs(query(collection(db, "teacherRatings"), where("teacherUid", "==", teacherUid)));
  const sums = {};
  TEACHER_FACTORS.forEach(([k]) => { sums[k] = 0; });
  snap.forEach((d) => {
    const r = d.data();
    TEACHER_FACTORS.forEach(([k]) => { sums[k] += r[k]; });
  });
  const count = snap.size;
  const avgs = {};
  let total = 0;
  TEACHER_FACTORS.forEach(([k]) => {
    avgs[k] = count ? sums[k] / count : 0;
    total += avgs[k];
  });
  return { count, avgs, overall: total / TEACHER_FACTORS.length };
}

export function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return "\u2605".repeat(r) + "\u2606".repeat(5 - r);
}

export function containsBanned(text) {
  return text.toLowerCase().split(/[^a-z]+/).some((token) => BANNED.some((word) => token.includes(word)));
}

export function starInput(labelText) {
  const row = el("div", "star-row");
  const box = el("span", "stars-input");
  const buttons = [];
  let value = 0;
  function paint() {
    buttons.forEach((b, i) => {
      b.classList.toggle("on", i < value);
      b.setAttribute("aria-pressed", String(i + 1 === value));
    });
  }
  for (let i = 1; i <= 5; i++) {
    const b = el("button", "star-btn", "\u2605");
    b.type = "button";
    b.setAttribute("aria-label", i + " out of 5 for " + labelText);
    b.addEventListener("click", () => { value = i; paint(); });
    buttons.push(b);
    box.append(b);
  }
  row.append(el("span", "", labelText), box);
  return { element: row, get value() { return value; }, reset() { value = 0; paint(); } };
}

export async function loadTeacherStats(teachers) {
  const map = new Map();
  teachers.forEach((t) => {
    const sums = {};
    TEACHER_FACTORS.forEach(([k]) => { sums[k] = 0; });
    map.set(t.uid, { ...t, count: 0, sums });
  });
  const snap = await getDocs(collection(db, "teacherRatings"));
  snap.forEach((d) => {
    const r = d.data();
    const s = map.get(r.teacherUid);
    if (!s) return;
    s.count++;
    TEACHER_FACTORS.forEach(([k]) => { s.sums[k] += r[k]; });
  });
  return [...map.values()].map((s) => {
    const avgs = {};
    let total = 0;
    TEACHER_FACTORS.forEach(([k]) => {
      avgs[k] = s.count ? s.sums[k] / s.count : 0;
      total += avgs[k];
    });
    return { ...s, avgs, overall: total / TEACHER_FACTORS.length };
  });
}

export async function hasRatedTeacher(uid, teacherUid) {
  const snap = await getDoc(doc(db, "teacherVotes", uid + "_" + teacherUid));
  return snap.exists();
}

export async function rateTeacher(uid, teacherUid, scores) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "teacherRatings")), { teacherUid, ...scores, createdAt: serverTimestamp() });
  batch.set(doc(db, "teacherVotes", uid + "_" + teacherUid), { createdAt: serverTimestamp() });
  await batch.commit();
}

export async function hasReviewed(uid) {
  const snap = await getDoc(doc(db, "collegeVotes", uid));
  return snap.exists();
}

export async function submitCollegeReview(uid, branch, scores, comment) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "collegeReviews")), { ...scores, comment, branch, createdAt: serverTimestamp() });
  batch.set(doc(db, "collegeVotes", uid), { createdAt: serverTimestamp() });
  await batch.commit();
}

export async function loadCollegeReviews() {
  const snap = await getDocs(collection(db, "collegeReviews"));
  const list = snap.docs.map((d) => d.data());
  const ms = (r) => (r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : 0);
  return list.sort((a, b) => ms(b) - ms(a));
}
