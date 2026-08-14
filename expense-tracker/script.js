// --- Application State ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let isEditing = false;

// --- DOM References ---
const form = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');

const transactionList = document.getElementById('transaction-list');
const emptyState = document.getElementById('empty-state');
const filterCategory = document.getElementById('filter-category');
const notification = document.getElementById('notification');
const categoryProgressContainer = document.getElementById('category-progress-container');

// Set default form date input to today
dateInput.valueAsDate = new Date();

// --- Initialization ---
function init() {
  updateSummary();
  renderTransactions();
  renderProgressBars();
}

// --- Sync Data with LocalStorage ---
function syncLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// --- Display Notification Toast ---
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  setTimeout(() => {
    notification.className = 'notification hidden';
  }, 3000);
}

// --- Form Submission Handler (Add / Edit) ---
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = transactionIdInput.value;
  const type = typeInput.value;
  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  // Form Validation
  if (!description || isNaN(amount) || amount <= 0 || !date) {
    showNotification('Please fill out all fields with valid data.', 'error');
    return;
  }

  if (isEditing) {
    // Update existing transaction
    transactions = transactions.map((t) =>
      t.id === id ? { id, type, description, amount, category, date } : t
    );
    showNotification('Transaction updated successfully!');
  } else {
    // Add new transaction
    const newTransaction = {
      id: Date.now().toString(),
      type,
      description,
      amount,
      category,
      date
    };
    transactions.push(newTransaction);
    showNotification('Transaction added successfully!');
  }

  syncLocalStorage();
  init();
  resetForm();
});

// --- Render History Table ---
function renderTransactions() {
  const selectedFilter = filterCategory.value;
  
  // Filter logic
  const filtered = transactions.filter((t) => {
    if (selectedFilter === 'All') return true;
    return t.category === selectedFilter;
  });

  // Sort transactions by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    filtered.forEach((t) => {
      const row = document.createElement('tr');
      const isIncome = t.type === 'income';

      row.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td>${escapeHTML(t.description)}</td>
        <td><span class="type-badge ${isIncome ? 'type-income' : 'type-expense'}">${t.category}</span></td>
        <td style="font-weight: 600; color: ${isIncome ? 'var(--success-color)' : 'var(--danger-color)'}">
          ${isIncome ? '+' : '-'}${formatINR(t.amount)}
        </td>
        <td>
          <button class="action-btn edit-btn" onclick="editTransaction('${t.id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="action-btn delete-btn" onclick="deleteTransaction('${t.id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      transactionList.appendChild(row);
    });
  }
}

// --- Calculate Financial Totals ---
function updateSummary() {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = income - expense;

  totalBalanceEl.textContent = formatINR(balance);
  totalIncomeEl.textContent = formatINR(income);
  totalExpenseEl.textContent = formatINR(expense);
}

// --- Render Category Breakdown Bars ---
function renderProgressBars() {
  categoryProgressContainer.innerHTML = '';

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  if (totalExpense === 0) {
    categoryProgressContainer.innerHTML = `<p class="empty-state">No expense breakdown available.</p>`;
    return;
  }

  // Aggregate totals per expense category
  const categoryTotals = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  // Build progress bars
  for (const [cat, amount] of Object.entries(categoryTotals)) {
    const percentage = ((amount / totalExpense) * 100).toFixed(1);

    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `
      <div class="progress-info">
        <span>${cat}</span>
        <span>${formatINR(amount)} (${percentage}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    categoryProgressContainer.appendChild(item);
  }
}

// --- Edit Transaction Function ---
window.editTransaction = function (id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  isEditing = true;
  transactionIdInput.value = transaction.id;
  typeInput.value = transaction.type;
  descriptionInput.value = transaction.description;
  amountInput.value = transaction.amount;
  categoryInput.value = transaction.category;
  dateInput.value = transaction.date;

  formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Transaction`;
  submitBtn.textContent = 'Update Transaction';
  cancelBtn.classList.remove('hidden');

  form.scrollIntoView({ behavior: 'smooth' });
};

// --- Delete Transaction Function ---
window.deleteTransaction = function (id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    transactions = transactions.filter((t) => t.id !== id);
    syncLocalStorage();
    init();
    showNotification('Transaction deleted.', 'error');
  }
};

// --- Reset Form to Initial State ---
function resetForm() {
  isEditing = false;
  form.reset();
  transactionIdInput.value = '';
  dateInput.valueAsDate = new Date();
  
  formTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Add Transaction`;
  submitBtn.textContent = 'Add Transaction';
  cancelBtn.classList.add('hidden');
}

cancelBtn.addEventListener('click', resetForm);
filterCategory.addEventListener('change', renderTransactions);

// --- Format Utilities ---
function formatINR(number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(number);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Initialize Application
init();