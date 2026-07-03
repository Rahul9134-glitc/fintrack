let records = JSON.parse(localStorage.getItem("fintrack_logs")) || [];
let selectedCurrency = localStorage.getItem("fintrack_currency_code") || "INR";
let activeFilter = "all";
let flowChart = null;
let editingId = null;

let searchText = ""


const currencyMap = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

const balanceElement = document.getElementById("bal-value");
const incomeElement = document.getElementById("inc-value");
const expenseElement = document.getElementById("exp-value");
const countElement = document.getElementById("count-value"); //count element line no. 16 connected to line no 39

const tableBodyElement = document.getElementById("transaction-rows");

function processCardCalculations() {
  let incomeSum = 0;
  let expenseSum = 0;

  records.forEach((item) => {
    if (item.type === "income") {
      incomeSum += parseFloat(item.amount); //yaha mushe dikkat huyi like jab mai total income add kar rha tha to concating ho rha tha
    } else {
      expenseSum += parseFloat(item.amount);
    }
  });

  const netBalance = incomeSum - expenseSum;

  const currentSymbol = currencyMap[selectedCurrency] || "₹";

  balanceElement.innerText = `${currentSymbol}${netBalance.toFixed(2)}`;
  incomeElement.innerText = `${currentSymbol}${incomeSum.toFixed(2)}`;
  expenseElement.innerText = `${currentSymbol}${expenseSum.toFixed(2)}`; //yaha maine fixed method ka use kiya taki mera amount ek dum banking jaise amount lage
  countElement.innerText = records.length;
}

function renderTransactionsTable() {
  tableBodyElement.innerHTML = "";
  const filteredRecords = records.filter((item) => {

        if (activeFilter !== "all" && item.type !== activeFilter) {
            return false;
        }

        if (searchText === "") {
            return true;
        }

        return (
            item.description.toLowerCase().includes(searchText) ||
            item.category.toLowerCase().includes(searchText) ||
            item.type.toLowerCase().includes(searchText) ||
            item.amount.toString().includes(searchText) ||
            item.date.includes(searchText)
        );
    });

  if (filteredRecords.length === 0) {
    tableBodyElement.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No records logged yet.</td></tr>`;
    return;
  }

  const symbol = currencyMap[selectedCurrency] || "₹";
  //for reversing array jab koi data new add hoga like trasaction then ye aaray ko reverse kar dega our new data upper dikhega
  filteredRecords
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((item) => {
      const tr = document.createElement("tr");

      // Income aur Expense ke hisab se CSS classes aur sign (+ ya -) choose karna
      const typeStyle = item.type === "income" ? "amt-income" : "amt-expense";
      const prefix = item.type === "income" ? "+" : "-";

      //ye maine chat gpt liya and maine research kiya ki hum table ko insert kaise kar sakte hai then copy code and paste here
      tr.innerHTML = `
            <td>${item.date}</td>
            <td style="font-weight: 500;">${item.description}</td>
            <td><span style="background: var(--bg-global); padding: 4px 8px; border-radius: 4px; font-size:12px;">${item.category}</span></td>
            <td class="${typeStyle}">${prefix}${symbol}${parseFloat(item.amount).toFixed(2)}</td>
           <td>
    <button
        class="row-edit-btn"
        onclick="editRecord('${item.id}')">
        Edit
    </button>

    <button
        class="row-delete-btn"
        onclick="eraseRecord('${item.id}')">
        Delete
    </button>
</td>
        `;

      tableBodyElement.appendChild(tr);
    });
}

function processForm(event) {
  event.preventDefault();
  const type = document.getElementById("form-type").value;
  const description = document.getElementById("form-desc").value.trim();
  const amount = document.getElementById("form-amount").value;
  const date = document.getElementById("form-date").value;
  const category = document.getElementById("form-category").value;

  if (editingId) {
    const record = records.find((value) => value.id === editingId);
    const index = records.findIndex((item) => item.id === editingId);
    if (index !== -1) {
      records[index] = {
        id: editingId,
        type,
        description,
        amount,
        date,
        category,
      };
      editingId = null;
      showToast("Edit Transaction Sucessfully!")
    }
    document.getElementById("modal-title").innerHTML = "Add Transaction";
  } else {
    const newLog = {
      id: "tx_uid_" + Date.now(),
      type,
      description,
      amount,
      date,
      category,
    };
    records.push(newLog);
    showToast("Add Transactions Sucessfully!")
  }
  localStorage.setItem("fintrack_logs", JSON.stringify(records));
  closeModal();
  masterRefresh();
}

function eraseRecord(targetId) {
  records = records.filter((item) => item.id !== targetId);

  localStorage.setItem("fintrack_logs", JSON.stringify(records));

  masterRefresh();
}

function generateAnalyticsChart() {
  const canvas = document.getElementById("cashFlowChart");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let income = 0;
  let expense = 0;

  records.forEach((item) => {
    if (item.type === "income") {
      income += Number(item.amount);
    } else {
      expense += Number(item.amount);
    }
  });

  if (flowChart) {
    flowChart.destroy();
  }

  flowChart = new Chart(ctx, {
    type: "bar",

    data: {
      labels: ["Income", "Expense"],

      datasets: [
        {
          label: "Cash Flow",

          data: [income, expense],

          backgroundColor: ["green", "red"],
        },
      ],
    },
  });
}

function openModal() {
  const modal = document.getElementById("transaction-modal");

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal() {
  const modal = document.getElementById("transaction-modal");

  if (modal) {
    modal.classList.add("hidden");
  }

  const form = document.getElementById("modal-form");

  if (form) {
    form.reset();
  }

  editingId = null;
}

function handleFilterChange(value) {
  activeFilter = value;

  renderTransactionsTable();
}

function triggerReset() {
  if (confirm("Delete all records?")) {
    records = [];

    localStorage.removeItem("fintrack_logs");

    masterRefresh();
  }
}

function saveSystemSettings() {
  const username = document.getElementById("settings-name-input").value.trim();

  const currency = document.getElementById("settings-currency-select").value;

  localStorage.setItem("fintrack_username", username);

  localStorage.setItem("fintrack_currency_code", currency);

  document.getElementById("display-username").innerText = username;

  selectedCurrency = currency;

  masterRefresh();

  showToast("Settings Saved Successfully");

  changePage("dashboard")
}

function masterRefresh() {
  processCardCalculations();
  renderTransactionsTable();
  generateAnalyticsChart();
}

function changePage(targetPage) {
  const dashPage = document.getElementById("page-dashboard");
  const settPage = document.getElementById("page-settings");
  const btnDash = document.getElementById("nav-dashboard");
  const btnSett = document.getElementById("nav-settings");

  if (targetPage === "dashboard") {
    dashPage.classList.remove("hidden");
    settPage.classList.add("hidden");
    btnDash.classList.add("active");
    btnSett.classList.remove("active");
  } else {
    dashPage.classList.add("hidden");
    settPage.classList.remove("hidden");
    btnDash.classList.remove("active");
    btnSett.classList.add("active");
  }
}

function handleThemeToggle(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    localStorage.setItem("fintrack_dark", "true");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("fintrack_dark", "false");
  }

  if (flowChart) {
    generateAnalyticsChart();
  }
}

function showRegister() {
  document.getElementById("login-form").classList.add("hidden");

  document.getElementById("register-form").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("register-form").classList.add("hidden");

  document.getElementById("login-form").classList.remove("hidden");
}

function registerUser(event) {
  event.preventDefault();

  const name = document.getElementById("register-name").value.trim();

  const email = document.getElementById("register-email").value.trim();

  const password = document.getElementById("register-password").value;

  const user = {
    name,
    email,
    password,
  };

  localStorage.setItem("fintrack_user", JSON.stringify(user));

  showToast("Register Sucesfully!")

  document.getElementById("register-form").reset();

  showLogin();
}

function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();

  const password = document.getElementById("login-password").value;

  const savedUser = JSON.parse(localStorage.getItem("fintrack_user"));

  document.getElementById("settings-name-input").value = savedUser.name;

  if (!savedUser) {
    showToast("Please Register First");

    return;
  }

  if (savedUser.email === email && savedUser.password === password) {
    showToast("Login Successful");
    document.getElementById("auth-container").classList.add("hidden");

    document.querySelector(".app-container").classList.remove("hidden");

    const username = (document.getElementById("display-username").innerText =
      savedUser.name);
    console.log(username);
    document.getElementById("settings-name-input").value = savedUser.name;

    localStorage.setItem("fintrack_loggedIn", "true");
  } else {
    alert("Invalid Email or Password");
  }
}

function logoutUser() {
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  document.getElementById("auth-container").classList.remove("hidden");

  document.querySelector(".app-container").classList.add("hidden");

  document.getElementById("login-form").reset();

  localStorage.removeItem("fintrack_loggedIn");
}

window.onload = function () {
  const isLoggedIn = localStorage.getItem("fintrack_loggedIn");
  const user = JSON.parse(localStorage.getItem("fintrack_user"));

  if (isLoggedIn === "true" && user) {
    document.getElementById("auth-container").classList.add("hidden");
    document.querySelector(".app-container").classList.remove("hidden");
    document.getElementById("display-username").innerText = user.name;
  } else {
    document.getElementById("auth-container").classList.remove("hidden");
    document.querySelector(".app-container").classList.add("hidden");
  }

  const savedName = localStorage.getItem("fintrack_username");

  if (savedName) {
    document.getElementById("display-username").innerText = savedName;

    document.getElementById("settings-name-input").value = savedName;
  }

  const savedCurrency = localStorage.getItem("fintrack_currency_code");

  if (savedCurrency) {
    selectedCurrency = savedCurrency;

    document.getElementById("settings-currency-select").value = savedCurrency;
  }

  const dark = localStorage.getItem("fintrack_dark");

  if (dark === "true") {
    document.body.classList.add("dark");

    document.getElementById("dark-mode-toggle").checked = true;
  }
  masterRefresh();
};

function editRecord(targetId) {
  const record = records.find((item) => item.id === targetId);
  ;

  if (!record) return;

  editingId = targetId;
  document.getElementById("modal-title").innerText = "Edit Transaction"

  document.getElementById("form-type").value = record.type;

  document.getElementById("form-desc").value = record.description;

  document.getElementById("form-amount").value = record.amount;

  document.getElementById("form-date").value = record.date;

  document.getElementById("form-category").value = record.category;

  openModal();
}

function showToast(message, color = "#16a34a") {

    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        stopOnFocus: true,
        style: {
            background: color,
            borderRadius: "8px"
        }
    }).showToast();

}

function handleSearch(value){
  searchText = value.toLowerCase();
  renderTransactionsTable()
}
