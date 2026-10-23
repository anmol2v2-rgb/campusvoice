(function () {
  var THEME_KEY = "cv_theme";
  var ROLE_KEY = "cv_role";
  var ROLE_PAGES = {
    student: "student.html", pending: "staff.html", teacher: "staff.html",
    warden: "staff.html", principal: "admin.html", superadmin: "admin.html"
  };

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function currentTheme() {
    return readStored(THEME_KEY) === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f6f3ff" : "#120b2e");
  }

  applyTheme(currentTheme());

  function addThemeToggle() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var holder = header.querySelector(".header-right");
    if (!holder) {
      holder = document.createElement("div");
      holder.className = "header-right";
      header.appendChild(holder);
    }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ghost theme-toggle";
    function refresh() {
      var light = currentTheme() === "light";
      button.textContent = light ? "Dark mode" : "Light mode";
      button.setAttribute("aria-label", "Switch to " + (light ? "dark" : "light") + " mode");
    }
    button.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      applyTheme(next);
      refresh();
    });
    refresh();
    holder.insertBefore(button, holder.firstChild);
  }

  function addBottomNav() {
    var page = location.pathname.split("/").pop() || "index.html";
    if (["login.html", "signup.html", "poster.html"].indexOf(page) !== -1) return;
    var role = readStored(ROLE_KEY);
    var home = role && ROLE_PAGES[role] ? ROLE_PAGES[role] : "login.html";
    var items = [["Home", "index.html"], [role ? "My page" : "Log in", home], ["Teachers", "ranker.html"], ["Rater", "rater.html"]];
    var nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Main");
    items.forEach(function (item) {
      var link = document.createElement("a");
      link.href = item[1];
      link.textContent = item[0];
      if (page === item[1]) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });
    document.body.appendChild(nav);
  }

  document.addEventListener("DOMContentLoaded", function () {
    addThemeToggle();
    addBottomNav();
  });
})();
