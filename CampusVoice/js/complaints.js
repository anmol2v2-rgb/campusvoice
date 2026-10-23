import { db } from "./firebase.js";
import { friendlyError } from "./auth.js";
import {
  collection, addDoc, getDoc, getDocs, query, where, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const CATEGORIES = [
  "Hostel Room", "Electrical & Fan", "Water & Cleanliness", "Mess & Food",
  "Wi-Fi & Devices", "Classroom & Academics", "Safety & Security", "Other"
];
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const STATUS_LABELS = { reported: "Reported", in_progress: "In progress", resolved: "Resolved" };
const JPEG_PREFIX = "data:image/jpeg;base64,";

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This image format is not supported. Try a JPG or PNG photo."));
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        let quality = 0.7;
        let data = canvas.toDataURL("image/jpeg", quality);
        while (data.length > 250000 && quality > 0.3) {
          quality -= 0.1;
          data = canvas.toDataURL("image/jpeg", quality);
        }
        if (data.length > 290000) reject(new Error("This photo is too large. Try a smaller one."));
        else resolve(data);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function createComplaint(uid, profile, form) {
  await addDoc(collection(db, "complaints"), {
    studentUid: uid,
    studentName: profile.name,
    branch: profile.branch,
    rollNo: profile.rollNo,
    roomNo: profile.roomNo,
    title: form.title,
    description: form.description,
    category: form.category,
    priority: form.priority,
    photos: form.photos,
    recipients: form.recipients,
    recipientLabels: form.recipientLabels,
    status: "reported",
    staffRemark: "",
    createdAt: serverTimestamp()
  });
}

export async function getComplaint(id) {
  const snap = await getDoc(doc(db, "complaints", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateOwnComplaint(id, fields) {
  await updateDoc(doc(db, "complaints", id), {
    title: fields.title,
    description: fields.description,
    category: fields.category,
    priority: fields.priority,
    photos: fields.photos,
    updatedAt: serverTimestamp()
  });
}

export async function deleteOwnComplaint(id) {
  await deleteDoc(doc(db, "complaints", id));
}

export async function getTeachers() {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
  return snap.docs.map((d) => ({ uid: d.id, name: d.data().name, department: d.data().department }));
}

function millis(c) {
  return c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0;
}

function newestFirst(list) {
  return list.sort((a, b) => millis(b) - millis(a));
}

async function fetchList(q) {
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function myQueries(uid) {
  return [query(collection(db, "complaints"), where("studentUid", "==", uid))];
}

export function allQueries() {
  return [collection(db, "complaints")];
}

export function inboxQueries(uid, role) {
  const keys = ["uid:" + uid];
  if (role === "warden") keys.push("role:warden");
  return keys.map((k) => query(collection(db, "complaints"), where("recipients", "array-contains", k)));
}

async function loadFrom(queries) {
  const lists = await Promise.all(queries.map(fetchList));
  const unique = new Map();
  lists.flat().forEach((c) => unique.set(c.id, c));
  return newestFirst([...unique.values()]);
}

export const loadMyComplaints = (uid) => loadFrom(myQueries(uid));
export const loadAllComplaints = () => loadFrom(allQueries());
export const loadInbox = (uid, role) => loadFrom(inboxQueries(uid, role));

function csvCell(value) {
  let text = String(value === undefined || value === null ? "" : value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function exportComplaintsCsv(list) {
  const header = ["Date", "Student", "Branch", "Roll number", "Room", "Title", "Category", "Priority", "Status", "Sent to", "Staff remark", "Description"];
  const rows = list.map((c) => [
    c.createdAt && c.createdAt.toDate ? c.createdAt.toDate().toLocaleString() : "",
    c.studentName, c.branch, c.rollNo, c.roomNo, c.title, c.category, c.priority,
    STATUS_LABELS[c.status] || c.status, (c.recipientLabels || []).join("; "), c.staffRemark || "", c.description
  ]);
  const csv = "\ufeff" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "campusvoice-problems-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildCard(c, manager, own, refresh) {
  const card = el("article", "complaint");
  const head = el("div", "complaint-head");
  head.append(el("strong", "", c.title), el("span", "pill pill-" + c.status, STATUS_LABELS[c.status] || c.status));
  card.append(head);

  const when = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate().toLocaleString() : "";
  card.append(el("div", "hint", c.category + " | " + c.priority + " priority | " + when));
  card.append(el("p", "", c.description));

  const photos = (c.photos || []).filter((p) => typeof p === "string" && p.startsWith(JPEG_PREFIX));
  if (photos.length) {
    const wrap = el("div", "photos");
    photos.forEach((src) => {
      const img = el("img", "thumb");
      img.src = src;
      img.alt = "Photo attached to the problem";
      img.title = "Click to enlarge";
      img.addEventListener("click", () => img.classList.toggle("big"));
      wrap.append(img);
    });
    card.append(wrap);
  }

  if (manager) {
    card.append(el("div", "hint", "From: " + c.studentName + " | " + c.branch + " | Roll " + c.rollNo + " | Room " + c.roomNo));
  }
  card.append(el("div", "hint", "Sent to: " + (c.recipientLabels || []).join(", ")));
  if (c.staffRemark) card.append(el("p", "remark", "Staff remark: " + c.staffRemark));

  if (own && c.status === "reported") {
    const actions = el("div", "row-actions");
    const edit = el("a", "btn ghost", "Edit");
    edit.href = "complaint-new.html?edit=" + encodeURIComponent(c.id);
    const del = el("button", "ghost", "Delete");
    const note = el("span", "hint", "");
    del.addEventListener("click", async () => {
      if (!confirm("Delete this problem? This cannot be undone.")) return;
      del.disabled = true;
      try {
        await deleteOwnComplaint(c.id);
        await refresh();
      } catch (error) {
        console.error(error);
        note.textContent = "Could not delete: " + friendlyError(error);
        del.disabled = false;
      }
    });
    actions.append(edit, del, note);
    card.append(actions);
  }

  if (manager) {
    const controls = el("div", "controls");
    const select = el("select");
    Object.keys(STATUS_LABELS).forEach((key) => {
      const option = el("option", "", STATUS_LABELS[key]);
      option.value = key;
      select.append(option);
    });
    select.value = c.status;
    const remark = el("textarea");
    remark.maxLength = 500;
    remark.rows = 2;
    remark.placeholder = "Write a remark for the student";
    remark.value = c.staffRemark || "";
    const save = el("button", "", "Save update");
    const note = el("span", "hint", "");
    save.addEventListener("click", async () => {
      save.disabled = true;
      note.textContent = "Saving...";
      try {
        await updateDoc(doc(db, "complaints", c.id), {
          status: select.value,
          staffRemark: remark.value.trim(),
          updatedAt: serverTimestamp(),
          updatedByName: manager
        });
        await refresh();
      } catch (error) {
        console.error(error);
        note.textContent = "Could not save: " + friendlyError(error);
        save.disabled = false;
      }
    });
    controls.append(select, remark, save, note);
    card.append(controls);
  }
  return card;
}

function addOptions(select, allLabel, values) {
  const all = el("option", "", allLabel);
  all.value = "";
  select.append(all);
  values.forEach(([value, label]) => {
    const option = el("option", "", label);
    option.value = value;
    select.append(option);
  });
}

function buildFilterBar(listEl, manager) {
  const bar = el("div", "filters");
  const fields = [
    ["status", "All statuses", Object.entries(STATUS_LABELS)],
    ["category", "All categories", CATEGORIES.map((c) => [c, c])],
    ["priority", "All priorities", PRIORITIES.map((p) => [p, p])]
  ];
  fields.forEach(([name, allLabel, values]) => {
    const select = el("select");
    select.dataset.f = name;
    select.setAttribute("aria-label", "Filter by " + name);
    addOptions(select, allLabel, values);
    select.addEventListener("change", () => listEl.renderCards && listEl.renderCards());
    bar.append(select);
  });
  const search = el("input");
  search.type = "search";
  search.dataset.f = "search";
  search.placeholder = "Search title, name or roll number";
  search.setAttribute("aria-label", "Search problems");
  search.addEventListener("input", () => listEl.renderCards && listEl.renderCards());
  bar.append(search);
  if (manager) {
    const download = el("button", "ghost", "Download CSV");
    download.type = "button";
    download.addEventListener("click", () => exportComplaintsCsv(listEl.shownComplaints || []));
    bar.append(download);
  }
  return bar;
}

function applyFilters(list, bar) {
  const get = (name) => bar.querySelector('[data-f="' + name + '"]').value;
  const status = get("status");
  const category = get("category");
  const priority = get("priority");
  const text = get("search").trim().toLowerCase();
  return list.filter((c) => {
    if (status && c.status !== status) return false;
    if (category && c.category !== category) return false;
    if (priority && c.priority !== priority) return false;
    if (text) {
      const haystack = (c.title + " " + c.studentName + " " + c.rollNo + " " + c.description).toLowerCase();
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

export async function showComplaints({ listEl, statusEl, load, manager, own, filters }) {
  let bar = listEl.querySelector(".filters");
  let cards = listEl.querySelector(".cards");
  if (!cards) {
    if (filters) {
      bar = buildFilterBar(listEl, manager);
      listEl.append(bar);
    }
    cards = el("div", "cards");
    listEl.append(cards);
  }
  cards.textContent = "";
  statusEl.textContent = "Loading...";
  try {
    const complaints = await load();
    const refresh = () => showComplaints({ listEl, statusEl, load, manager, own, filters });
    listEl.renderCards = () => {
      cards.textContent = "";
      const shown = bar ? applyFilters(complaints, bar) : complaints;
      listEl.shownComplaints = shown;
      if (complaints.length === 0) statusEl.textContent = "No problems yet.";
      else if (bar) statusEl.textContent = "Showing " + shown.length + " of " + complaints.length + " problems";
      else statusEl.textContent = "";
      shown.forEach((c) => cards.append(buildCard(c, manager, own, refresh)));
    };
    listEl.renderCards();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not load problems: " + friendlyError(error);
  }
}

let unread = 0;
const baseTitle = document.title;

function updateTitle() {
  document.title = unread ? "(" + unread + ") " + baseTitle : baseTitle;
}

function clearUnread() {
  unread = 0;
  updateTitle();
}

document.addEventListener("visibilitychange", () => { if (!document.hidden) clearUnread(); });
window.addEventListener("focus", clearUnread);

function toast(text) {
  let box = document.getElementById("toasts");
  if (!box) {
    box = el("div", "toasts");
    box.id = "toasts";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.append(box);
  }
  const note = el("div", "toast", text);
  box.append(note);
  setTimeout(() => note.remove(), 7000);
  unread++;
  updateTitle();
}

export function liveUpdates({ queries, staffView, selfName, listEl, refresh }) {
  const known = new Map();
  const announced = new Set();
  let pending = false;
  let timer = null;

  function scheduleRefresh() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const a = document.activeElement;
      if (listEl.contains(a) && a.matches("textarea, select, input")) pending = true;
      else refresh();
    }, 300);
  }

  listEl.addEventListener("focusout", () => {
    setTimeout(() => {
      if (pending && !listEl.contains(document.activeElement)) {
        pending = false;
        refresh();
      }
    }, 200);
  });

  queries.forEach((q) => {
    let first = true;
    onSnapshot(q, (snap) => {
      let changed = false;
      snap.docChanges().forEach((ch) => {
        const c = ch.doc.data();
        const before = known.get(ch.doc.id);
        known.set(ch.doc.id, { status: c.status, staffRemark: c.staffRemark || "" });
        if (first || ch.doc.metadata.hasPendingWrites) return;
        changed = true;
        if (ch.type === "removed") return;
        const key = ch.type + ":" + ch.doc.id + ":" + c.status + ":" + (c.staffRemark || "");
        if (announced.has(key)) return;
        announced.add(key);
        if (staffView) {
          if (ch.type === "added") toast("New problem: " + c.title);
          else if (c.updatedByName !== selfName) toast("Problem updated: " + c.title);
        } else if (before && before.status !== c.status) {
          toast('Your problem "' + c.title + '" is now ' + (STATUS_LABELS[c.status] || c.status));
        } else if (before && before.staffRemark !== (c.staffRemark || "")) {
          toast('New staff remark on "' + c.title + '"');
        }
      });
      first = false;
      if (changed) scheduleRefresh();
    }, (error) => console.error(error));
  });
}
