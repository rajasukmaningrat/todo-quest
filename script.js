// Demo-only account and task storage. This is not real authentication.
const CURRENT_USER_KEY = "currentUser";
const TODOS_KEY = "todosByUser";
const categories = ["Personal", "Work", "Shopping", "Learning"];
let currentUser = "";
let todos = [];
let activeFilter = "all";
let todoToDelete = null;

const loginPanel = document.querySelector("#login-panel");
const todoApp = document.querySelector("#todo-app");
const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const inProgressList = document.querySelector("#in-progress-list");
const completedList = document.querySelector("#completed-list");
const addDialog = document.querySelector("#add-dialog");
const deleteDialog = document.querySelector("#delete-dialog");
const addTaskForm = document.querySelector("#add-task-form");
const workScopeField = document.querySelector("#work-scope-field");
const shoppingScopeField = document.querySelector("#shopping-scope-field");
const shoppingContextToggle = document.querySelector("#shopping-work-context");
const shoppingContextWrap = document.querySelector("#shopping-context-wrap");
const scopeDetailInput = document.querySelector("#task-position");
const scopeDetailLabel = document.querySelector("#task-position-label");
const searchInput = document.querySelector("#todo-search");

function getTaskClassification(category, scope) {
  if (category === "Work") return scope === "all-teams" ? "Critical" : "Important";
  if (category === "Shopping" && (scope === "specific-team" || scope === "specific-person")) return "Important";
  return "Personal";
}

function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

function getTodos(username) {
  const savedTodos = JSON.parse(localStorage.getItem(TODOS_KEY) || "{}");
  const userTodos = Array.isArray(savedTodos[username]) ? savedTodos[username] : [];
  return userTodos.map((todo) => {
    let scope = todo.scope || null;
    if (todo.category === "Work" && !["all-teams", "specific-team", "specific-person"].includes(scope)) {
      scope = todo.classification === "Critical" ? "all-teams" : (todo.position ? "specific-person" : "specific-team");
    }
    if (todo.category === "Shopping" && !["specific-team", "specific-person"].includes(scope)) scope = null;
    if (!["Work", "Shopping"].includes(todo.category)) scope = null;
    const classification = getTaskClassification(todo.category, scope);
    const completed = Boolean(todo.completed);
    return {
      ...todo,
      scope,
      scopeDetail: ["specific-team", "specific-person"].includes(scope)
        ? (todo.scopeDetail || todo.position || "")
        : "",
      classification,
      createdAt: todo.createdAt || new Date().toISOString(),
      dueDate: todo.dueDate ?? todo.date ?? null,
      dueTime: todo.dueTime || null,
      completed,
      completedAt: completed ? (todo.completedAt || null) : null,
    };
  });
}

function saveTodos() {
  const savedTodos = JSON.parse(localStorage.getItem(TODOS_KEY) || "{}");
  savedTodos[currentUser] = todos;
  localStorage.setItem(TODOS_KEY, JSON.stringify(savedTodos));
}

function loginUser(username) {
  currentUser = username.trim();
  if (!currentUser) return;
  localStorage.setItem(CURRENT_USER_KEY, currentUser);
  todos = getTodos(currentUser);
  saveTodos(); // Persist any added fields for tasks created by the earlier version.
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const isActive = button.dataset.filter === "all";
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelector("#section-kicker").textContent = "YOUR JOURNAL / QUEST BOARD";
  loginPanel.hidden = true;
  todoApp.hidden = false;
  document.querySelector("#active-username").textContent = currentUser;
  renderTodos();
}

function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  currentUser = "";
  todos = [];
  todoApp.hidden = true;
  loginPanel.hidden = false;
  usernameInput.value = "";
  usernameInput.focus();
}

function addTodo(todo) {
  todos.push(todo);
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) => {
    if (todo.id !== id) return todo;
    const completed = !todo.completed;
    return { ...todo, completed, completedAt: completed ? new Date().toISOString() : null };
  });
  saveTodos();
  renderTodos();
}

function requestDeleteTodo(id) {
  todoToDelete = id;
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  document.querySelector("#delete-task-name").textContent = todo.title;
  deleteDialog.showModal();
  document.querySelector("#cancel-delete").focus();
}

function confirmDeleteTodo() {
  if (!todoToDelete) return;
  todos = todos.filter((todo) => todo.id !== todoToDelete);
  todoToDelete = null;
  saveTodos();
  deleteDialog.close();
  renderTodos();
}

function formatDate(dateString) {
  if (!dateString) return "NO DATE";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "NOT RECORDED";
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(",", " ·").toUpperCase();
}

function createTaskCard(todo) {
  const item = document.createElement("li");
  item.className = `task-item classification-${todo.classification.toLowerCase()}${todo.completed ? " is-complete" : ""}`;

  const titleRow = document.createElement("div");
  titleRow.className = "task-title-row";

  const checkButton = document.createElement("button");
  checkButton.className = "task-check";
  checkButton.type = "button";
  checkButton.textContent = todo.completed ? "✓" : "";
  checkButton.setAttribute("aria-label", `${todo.completed ? "Mark pending" : "Mark complete"}: ${todo.title}`);
  checkButton.setAttribute("aria-pressed", String(todo.completed));
  checkButton.addEventListener("click", () => toggleTodo(todo.id));

  const title = document.createElement("span");
  title.className = "task-text";
  title.textContent = todo.title;
  titleRow.append(checkButton, title);

  const date = document.createElement("span");
  date.className = "task-time";
  date.textContent = todo.dueDate ? `DATE · ${formatDate(todo.dueDate)}` : "NO DATE SET";

  const level = document.createElement("span");
  level.className = `task-level level-${todo.level.toLowerCase()}`;
  level.textContent = `LEVEL · ${todo.level.toUpperCase()}`;

  const category = document.createElement("span");
  category.className = `task-tag tag-${todo.category.toLowerCase()}`;
  category.textContent = todo.category;

  const classification = document.createElement("span");
  classification.className = `classification-badge classification-${todo.classification.toLowerCase()}`;
  const classificationIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  classificationIcon.setAttribute("class", "classification-icon task-classification-icon");
  classificationIcon.setAttribute("viewBox", "0 0 48 48");
  classificationIcon.setAttribute("role", "img");
  classificationIcon.setAttribute("aria-label", `${todo.classification} classification icon`);
  const iconUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
  iconUse.setAttribute("href", `#icon-${todo.classification.toLowerCase()}`);
  classificationIcon.append(iconUse);
  classification.append(classificationIcon, document.createTextNode(todo.classification.toUpperCase()));

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.append(classification, date, level, category);
  if (todo.dueTime) {
    const time = document.createElement("span");
    time.className = "task-time";
    time.textContent = `TIME · ${todo.dueTime}`;
    meta.append(time);
  }

  const records = document.createElement("div");
  records.className = "task-records";
  const created = document.createElement("span");
  created.textContent = `CREATED · ${formatTimestamp(todo.createdAt)}`;
  records.append(created);
  if (todo.scope) {
    const scope = document.createElement("span");
    const scopeLabels = { "all-teams": "ALL TEAMS", "specific-team": "SPECIFIC TEAM", "specific-person": "SPECIFIC PERSON" };
    scope.textContent = `SCOPE · ${scopeLabels[todo.scope] || todo.scope.toUpperCase()}`;
    records.append(scope);
  }
  if (todo.scopeDetail) {
    const scopeDetail = document.createElement("span");
    scopeDetail.textContent = `ASSIGNED TO · ${todo.scopeDetail}`;
    records.append(scopeDetail);
  }
  if (todo.completed && todo.completedAt) {
    const completed = document.createElement("span");
    completed.textContent = `COMPLETED · ${formatTimestamp(todo.completedAt)}`;
    records.append(completed);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const toggleButton = document.createElement("button");
  toggleButton.className = "complete-button";
  toggleButton.type = "button";
  toggleButton.textContent = todo.completed ? "Uncomplete" : "Complete";
  toggleButton.addEventListener("click", () => toggleTodo(todo.id));

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${todo.title}`);
  deleteButton.addEventListener("click", () => requestDeleteTodo(todo.id));
  actions.append(toggleButton, deleteButton);
  item.append(titleRow, meta, records, actions);
  return item;
}

function renderTodos() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const visibleTodos = todos.filter((todo) => {
    const matchesCategory = activeFilter === "all" || todo.category === activeFilter;
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
  const activeTodos = visibleTodos.filter((todo) => !todo.completed);
  const completedTodos = visibleTodos.filter((todo) => todo.completed);
  inProgressList.replaceChildren(...activeTodos.map(createTaskCard));
  completedList.replaceChildren(...completedTodos.map(createTaskCard));
  document.querySelector("#active-section-count").textContent = String(activeTodos.length);
  document.querySelector("#completed-section-count").textContent = String(completedTodos.length);
  document.querySelector("#active-empty-state").hidden = activeTodos.length > 0;
  document.querySelector("#completed-empty-state").hidden = completedTodos.length > 0;
  document.querySelector("#task-count").textContent = String(todos.length);
  const completedCount = todos.filter((todo) => todo.completed).length;
  document.querySelector("#total-count").textContent = String(todos.length).padStart(2, "0");
  document.querySelector("#completed-count").textContent = String(completedCount).padStart(2, "0");
  document.querySelector("#remaining-count").textContent = String(todos.length - completedCount).padStart(2, "0");
  const progressLabel = document.querySelector("#progress-label");
  progressLabel.textContent = `${String(completedCount).padStart(2, "0")} / ${String(todos.length).padStart(2, "0")} DONE`;
  progressLabel.setAttribute("aria-label", `${completedCount} of ${todos.length} tasks complete`);
  document.querySelector("#progress-track").setAttribute("aria-valuemax", String(todos.length));
  document.querySelector("#progress-track").setAttribute("aria-valuenow", String(completedCount));
  document.querySelector("#progress-fill").style.width = todos.length ? `${(completedCount / todos.length) * 100}%` : "0%";
}

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(now);
  const dateParts = new Intl.DateTimeFormat(undefined, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).formatToParts(now);
  const dateValues = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const clockTime = document.querySelector("#clock-time");
  const clockDate = document.querySelector("#date-label");
  clockTime.textContent = time;
  clockDate.textContent = `${dateValues.weekday} · ${dateValues.day} ${dateValues.month} ${dateValues.year}`.toUpperCase();
  clockTime.dateTime = now.toISOString();
  clockDate.dateTime = now.toISOString();
}

updateClock();
window.setInterval(updateClock, 1000);

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginUser(usernameInput.value);
});

document.querySelector("#logout-button").addEventListener("click", logoutUser);

function updateFormContext() {
  const category = addTaskForm.querySelector('input[name="category"]:checked')?.value || "";
  const isWork = category === "Work";
  const isShopping = category === "Shopping";
  const shoppingHasContext = isShopping && shoppingContextToggle.checked;

  workScopeField.hidden = !isWork;
  workScopeField.disabled = !isWork;
  shoppingContextWrap.hidden = !isShopping;
  shoppingScopeField.hidden = !shoppingHasContext;
  shoppingScopeField.disabled = !shoppingHasContext;

  addTaskForm.querySelectorAll('input[name="scope"]').forEach((input) => {
    input.required = isWork || shoppingHasContext;
  });

  const selectedScope = addTaskForm.querySelector('input[name="scope"]:checked')?.value || "";
  const needsDetail = selectedScope === "specific-team" || selectedScope === "specific-person";
  scopeDetailInput.hidden = !needsDetail;
  scopeDetailInput.disabled = !needsDetail;
  scopeDetailInput.required = needsDetail;
  scopeDetailLabel.hidden = !needsDetail;
  if (needsDetail) {
    scopeDetailLabel.textContent = selectedScope === "specific-team" ? "Team name" : "Person name";
    scopeDetailInput.placeholder = selectedScope === "specific-team" ? "Enter team name" : "Enter person's name";
  } else {
    scopeDetailInput.value = "";
  }
}

function resetScopeChoices() {
  addTaskForm.querySelectorAll('input[name="scope"]').forEach((input) => { input.checked = false; });
  scopeDetailInput.value = "";
  shoppingContextToggle.checked = false;
}

addTaskForm.querySelectorAll('input[name="category"]').forEach((input) => {
  input.addEventListener("change", () => {
    resetScopeChoices();
    updateFormContext();
  });
});
addTaskForm.querySelectorAll('input[name="scope"]').forEach((input) => {
  input.addEventListener("change", updateFormContext);
});
shoppingContextToggle.addEventListener("change", () => {
  if (!shoppingContextToggle.checked) resetScopeChoices();
  updateFormContext();
});

document.querySelector("#open-add-modal").addEventListener("click", () => {
  addTaskForm.reset();
  if (activeFilter !== "all") {
    const categoryChoice = [...addTaskForm.querySelectorAll('input[name="category"]')]
      .find((input) => input.value === activeFilter);
    if (categoryChoice) categoryChoice.checked = true;
  }
  updateFormContext();
  addDialog.showModal();
  document.querySelector("#task-title").focus();
});

document.querySelector("#cancel-add").addEventListener("click", () => addDialog.close());
addDialog.addEventListener("click", (event) => {
  if (event.target === addDialog) addDialog.close();
});

addTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(addTaskForm);
  const title = String(formData.get("title")).trim();
  const scopeDetail = String(formData.get("scopeDetail") || "").trim();
  const level = formData.get("level");
  const category = formData.get("category");
  const scope = formData.get("scope") || null;
  const needsScope = category === "Work" || (category === "Shopping" && shoppingContextToggle.checked);
  const scopeDetailNeeded = scope === "specific-team" || scope === "specific-person";
  const classification = getTaskClassification(category, scope);
  const dueDate = String(formData.get("dueDate") || "") || null;
  const dueTime = String(formData.get("dueTime") || "") || null;
  if (!title || !categories.includes(category) || !["Low", "Medium", "High"].includes(level)) return;
  if (needsScope && !["all-teams", "specific-team", "specific-person"].includes(scope)) return;
  if (category === "Shopping" && shoppingContextToggle.checked && !["specific-team", "specific-person"].includes(scope)) return;
  if (scopeDetailNeeded && !scopeDetail) return;
  addTodo({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    scope,
    scopeDetail: scopeDetailNeeded ? scopeDetail : "",
    classification,
    level,
    category,
    createdAt: new Date().toISOString(),
    dueDate,
    dueTime,
    completed: false,
    completedAt: null,
  });
  addDialog.close();
});

document.querySelector("#cancel-delete").addEventListener("click", () => {
  todoToDelete = null;
  deleteDialog.close();
});
document.querySelector("#confirm-delete").addEventListener("click", confirmDeleteTodo);
deleteDialog.addEventListener("click", (event) => {
  if (event.target === deleteDialog) {
    todoToDelete = null;
    deleteDialog.close();
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelector("#section-kicker").textContent = activeFilter === "all" ? "YOUR JOURNAL / QUEST BOARD" : `${activeFilter.toUpperCase()} / QUESTS`;
    renderTodos();
  });
});

searchInput.addEventListener("input", renderTodos);

const savedUser = getCurrentUser();
if (savedUser) loginUser(savedUser);
else loginPanel.hidden = false;
