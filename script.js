// Global App State
let state = {
  settings: {
    gymName: "PowerFit Gym & Fitness Club",
    phone: "+880 1700-000000",
    address: "Dhanmondi, Dhaka, Bangladesh",
    currency: "৳",
    plans: [
      { id: "monthly", name: "Monthly", durationMonths: 1, fee: 1500 },
      { id: "3months", name: "3 Months", durationMonths: 3, fee: 4000 },
      { id: "6months", name: "6 Months", durationMonths: 6, fee: 7500 },
      { id: "yearly", name: "Yearly", durationMonths: 12, fee: 14000 }
    ]
  },
  members: [],
  searchQuery: "",
  filterPlan: "all",
  filterStatus: "all"
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Set default start date to today
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    startDateInput.value = today;
  }

  await loadDatabase();
  recalculateBill();
});

// Load Database from JSON via Electron IPC
async function loadDatabase() {
  try {
    if (window.electronAPI) {
      const data = await window.electronAPI.getData();
      if (data) {
        if (data.settings) state.settings = data.settings;
        if (data.members) state.members = data.members;
      }
    } else {
      // Fallback for standalone browser testing
      const local = localStorage.getItem('gym_db_fallback');
      if (local) {
        const parsed = JSON.parse(local);
        state.settings = parsed.settings || state.settings;
        state.members = parsed.members || [];
      }
    }
  } catch (err) {
    console.error("Database load error:", err);
  }

  updateGymBrandDisplay();
  populateSettingsForm();
  renderDashboard();
}

// Update Gym Branding across DOM
function updateGymBrandDisplay() {
  const brandTitle = document.getElementById('brandGymName');
  if (brandTitle && state.settings.gymName) {
    brandTitle.textContent = state.settings.gymName;
  }

  // Update plan fee data attributes in form select
  const planSelect = document.getElementById('membershipPlan');
  if (planSelect && state.settings.plans) {
    const options = planSelect.options;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const match = state.settings.plans.find(p => p.name.toLowerCase() === opt.value.toLowerCase());
      if (match) {
        opt.setAttribute('data-fee', match.fee);
      }
    }
  }
}

// Tab Switching
function switchTab(tabId) {
  const tabs = ['dashboard', 'members', 'new-member', 'settings'];
  
  // Highlight sidebar
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  
  if (tabId === 'dashboard') {
    document.getElementById('tabDashboard').classList.add('active');
    document.getElementById('viewDashboard').classList.add('active');
    document.getElementById('viewNewMember').classList.remove('active');
    document.getElementById('viewSettings').classList.remove('active');
  } else if (tabId === 'members') {
    document.getElementById('tabMembers').classList.add('active');
    document.getElementById('viewDashboard').classList.add('active'); // Members directory is in table view
    document.getElementById('viewNewMember').classList.remove('active');
    document.getElementById('viewSettings').classList.remove('active');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  } else if (tabId === 'new-member') {
    document.getElementById('tabNewMember').classList.add('active');
    document.getElementById('viewDashboard').classList.remove('active');
    document.getElementById('viewNewMember').classList.add('active');
    document.getElementById('viewSettings').classList.remove('active');
  } else if (tabId === 'settings') {
    document.getElementById('tabSettings').classList.add('active');
    document.getElementById('viewDashboard').classList.remove('active');
    document.getElementById('viewNewMember').classList.remove('active');
    document.getElementById('viewSettings').classList.add('active');
  }
}

// Open Form in Create Mode
function openNewMemberForm() {
  document.getElementById('memberBillingForm').reset();
  document.getElementById('editMemberId').value = "";
  document.getElementById('formTitle').textContent = "Add Gym Member & Calculate Bill";
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').value = today;
  document.getElementById('membershipPlan').value = "Monthly";
  document.getElementById('discountType').value = "flat";
  document.getElementById('discountValue').value = 0;
  document.getElementById('taxPercent').value = 0;
  document.getElementById('admissionFee').value = 500;
  document.getElementById('addonFee').value = 0;
  
  handlePlanSelection();
  switchTab('new-member');
}

// Handle Plan Selection Change
function handlePlanSelection() {
  const planSelect = document.getElementById('membershipPlan');
  const selectedOption = planSelect.options[planSelect.selectedIndex];
  const fee = parseFloat(selectedOption.getAttribute('data-fee')) || 1500;
  
  document.getElementById('baseFee').value = fee;
  recalculateBill();
}

// Fast & Accurate Bill Calculation Engine
function recalculateBill() {
  const planSelect = document.getElementById('membershipPlan');
  if (!planSelect) return;

  const selectedOption = planSelect.options[planSelect.selectedIndex];
  const durationMonths = parseInt(selectedOption.getAttribute('data-months')) || 1;

  // Calculate Expiry Date based on Start Date + Months
  const startDateVal = document.getElementById('startDate').value;
  if (startDateVal) {
    const sDate = new Date(startDateVal);
    sDate.setMonth(sDate.getMonth() + durationMonths);
    const expDateStr = sDate.toISOString().split('T')[0];
    document.getElementById('computedExpiryDate').value = expDateStr;
  }

  // Fees calculation
  const baseFee = parseFloat(document.getElementById('baseFee').value) || 0;
  const admissionFee = parseFloat(document.getElementById('admissionFee').value) || 0;
  const addonFee = parseFloat(document.getElementById('addonFee').value) || 0;

  const subtotal = Math.max(0, baseFee + admissionFee + addonFee);
  document.getElementById('displaySubtotal').textContent = `${state.settings.currency} ${subtotal.toLocaleString()}`;

  // Discount
  const discountType = document.getElementById('discountType').value;
  const discountRaw = parseFloat(document.getElementById('discountValue').value) || 0;
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * discountRaw) / 100;
  } else {
    discountAmount = discountRaw;
  }
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  // Tax
  const taxable = subtotal - discountAmount;
  const taxPercent = parseFloat(document.getElementById('taxPercent').value) || 0;
  const taxAmount = (taxable * taxPercent) / 100;

  // Grand Total
  const grandTotal = Math.round(taxable + taxAmount);
  document.getElementById('displayGrandTotal').textContent = `${state.settings.currency} ${grandTotal.toLocaleString()}`;

  // Amount Paid & Due
  const amountPaidInput = document.getElementById('amountPaid');
  const amountPaid = parseFloat(amountPaidInput.value) || 0;
  const dueAmount = Math.max(0, grandTotal - amountPaid);

  const dueEl = document.getElementById('displayDueAmount');
  dueEl.textContent = `${state.settings.currency} ${dueAmount.toLocaleString()}`;
  
  if (dueAmount > 0) {
    dueEl.className = 'badge-due';
  } else {
    dueEl.className = 'badge-paid';
    dueEl.textContent = "Fully Paid (৳ 0)";
  }

  return {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
    dueAmount,
    expiryDate: document.getElementById('computedExpiryDate').value
  };
}

// Form Submission (Create or Edit Member)
async function handleFormSubmit(e) {
  e.preventDefault();

  const calc = recalculateBill();
  const editId = document.getElementById('editMemberId').value;
  const memberId = editId ? editId : 'MEM-' + Date.now().toString().slice(-6);

  const memberData = {
    id: memberId,
    name: document.getElementById('memberName').value.trim(),
    phone: document.getElementById('memberPhone').value.trim(),
    email: document.getElementById('memberEmail').value.trim(),
    gender: document.getElementById('memberGender').value,
    startDate: document.getElementById('startDate').value,
    plan: document.getElementById('membershipPlan').value,
    expiryDate: calc.expiryDate,
    pricing: {
      baseFee: parseFloat(document.getElementById('baseFee').value) || 0,
      admissionFee: parseFloat(document.getElementById('admissionFee').value) || 0,
      addonFee: parseFloat(document.getElementById('addonFee').value) || 0,
      subtotal: calc.subtotal,
      discount: calc.discountAmount,
      tax: calc.taxAmount,
      grandTotal: calc.grandTotal,
      paid: parseFloat(document.getElementById('amountPaid').value) || 0,
      due: calc.dueAmount,
      paymentMethod: document.getElementById('paymentMethod').value
    },
    createdAt: new Date().toISOString()
  };

  try {
    if (window.electronAPI) {
      await window.electronAPI.saveMember(memberData);
    } else {
      const idx = state.members.findIndex(m => m.id === memberData.id);
      if (idx >= 0) state.members[idx] = memberData;
      else state.members.unshift(memberData);
      localStorage.setItem('gym_db_fallback', JSON.stringify(state));
    }

    showToast("Member and Bill saved successfully to JSON database!", "success");
    await loadDatabase();
    
    // Show printable invoice
    viewInvoice(memberData.id);
    switchTab('dashboard');
  } catch (err) {
    console.error("Save error:", err);
    showToast("Error saving data: " + err.message, "error");
  }
}

// Render Dashboard, Metrics & Table
function renderDashboard() {
  const members = state.members || [];

  // Calculate Metrics
  const totalMembers = members.length;
  let totalBilled = 0;
  let totalPaid = 0;
  let totalDue = 0;

  members.forEach(m => {
    if (m.pricing) {
      totalBilled += m.pricing.grandTotal || 0;
      totalPaid += m.pricing.paid || 0;
      totalDue += m.pricing.due || 0;
    }
  });

  document.getElementById('statTotalMembers').textContent = totalMembers;
  document.getElementById('statTotalRevenue').textContent = `${state.settings.currency} ${totalBilled.toLocaleString()}`;
  document.getElementById('statPaidRevenue').textContent = `${state.settings.currency} ${totalPaid.toLocaleString()}`;
  document.getElementById('statTotalDue').textContent = `${state.settings.currency} ${totalDue.toLocaleString()}`;

  // Filter and populate table
  renderMembersTable();
}

// Render Members Table with Filters & Search
function renderMembersTable() {
  const tbody = document.getElementById('memberTableBody');
  const emptyState = document.getElementById('emptyState');
  tbody.innerHTML = "";

  const query = state.searchQuery.toLowerCase().trim();
  const planFilter = state.filterPlan;
  const statusFilter = state.filterStatus;
  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = state.members.filter(m => {
    // Search match
    const matchSearch = !query || 
      m.name.toLowerCase().includes(query) || 
      m.phone.includes(query) || 
      m.id.toLowerCase().includes(query);

    // Plan filter
    const matchPlan = planFilter === 'all' || m.plan === planFilter;

    // Status filter
    const isExpired = m.expiryDate < todayStr;
    const isDue = (m.pricing && m.pricing.due > 0);
    let matchStatus = true;
    if (statusFilter === 'Active') matchStatus = !isExpired;
    else if (statusFilter === 'Expired') matchStatus = isExpired;
    else if (statusFilter === 'Due') matchStatus = isDue;

    return matchSearch && matchPlan && matchStatus;
  });

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  filtered.forEach(m => {
    const tr = document.createElement('tr');

    const isExpired = m.expiryDate < todayStr;
    const isDue = m.pricing && m.pricing.due > 0;

    let statusBadge = `<span class="badge badge-active">Active</span>`;
    if (isExpired) {
      statusBadge = `<span class="badge badge-expired">Expired</span>`;
    }

    let paymentBadge = `<span class="badge badge-paid">Paid</span>`;
    if (isDue) {
      paymentBadge = `<span class="badge badge-due">Due: ৳${m.pricing.due.toLocaleString()}</span>`;
    }

    tr.innerHTML = `
      <td><strong>${m.id}</strong></td>
      <td>
        <div style="font-weight: 600; color: #fff;">${m.name}</div>
        <small style="color: var(--text-muted); font-size: 11px;">${m.email || 'No Email'}</small>
      </td>
      <td>📞 ${m.phone}</td>
      <td>
        <div><strong>${m.plan}</strong></div>
        <small style="color: var(--text-muted); font-size: 11px;">Valid till: ${m.expiryDate || 'N/A'}</small>
      </td>
      <td><strong>${state.settings.currency} ${(m.pricing?.grandTotal || 0).toLocaleString()}</strong></td>
      <td>${paymentBadge}</td>
      <td>${statusBadge}</td>
      <td class="actions-cell">
        <button class="btn btn-secondary btn-sm" title="View & Print Bill" onclick="viewInvoice('${m.id}')">🧾 Receipt</button>
        <button class="btn btn-secondary btn-sm" title="Edit Member" onclick="editMember('${m.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" title="Delete Member" onclick="deleteMember('${m.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Global Search
function handleGlobalSearch(val) {
  state.searchQuery = val;
  renderMembersTable();
}

// Filter apply
function applyFilters() {
  state.filterPlan = document.getElementById('filterPlan').value;
  state.filterStatus = document.getElementById('filterStatus').value;
  renderMembersTable();
}

// Edit Member
function editMember(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;

  document.getElementById('editMemberId').value = member.id;
  document.getElementById('formTitle').textContent = `Edit Member & Bill (${member.id})`;

  document.getElementById('memberName').value = member.name;
  document.getElementById('memberPhone').value = member.phone;
  document.getElementById('memberEmail').value = member.email || '';
  document.getElementById('memberGender').value = member.gender || 'Male';
  document.getElementById('startDate').value = member.startDate;
  document.getElementById('membershipPlan').value = member.plan;

  if (member.pricing) {
    document.getElementById('baseFee').value = member.pricing.baseFee;
    document.getElementById('admissionFee').value = member.pricing.admissionFee;
    document.getElementById('addonFee').value = member.pricing.addonFee;
    document.getElementById('discountValue').value = member.pricing.discount || 0;
    document.getElementById('discountType').value = 'flat';
    document.getElementById('amountPaid').value = member.pricing.paid;
    document.getElementById('paymentMethod').value = member.pricing.paymentMethod || 'Cash';
  }

  recalculateBill();
  switchTab('new-member');
}

// Delete Member
async function deleteMember(id) {
  if (!confirm(`Are you sure you want to permanently delete member record [${id}]?`)) {
    return;
  }

  try {
    if (window.electronAPI) {
      await window.electronAPI.deleteMember(id);
    } else {
      state.members = state.members.filter(m => m.id !== id);
      localStorage.setItem('gym_db_fallback', JSON.stringify(state));
    }
    showToast("Member successfully removed from JSON database.", "info");
    await loadDatabase();
  } catch (err) {
    console.error("Delete error:", err);
    showToast("Failed to delete member.", "error");
  }
}

// View and Generate Invoice Receipt
function viewInvoice(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;

  const invoiceArea = document.getElementById('invoicePrintArea');
  const price = member.pricing || {};
  const currency = state.settings.currency || '৳';

  invoiceArea.innerHTML = `
    <div class="receipt-box">
      <div class="receipt-header">
        <h2>${state.settings.gymName}</h2>
        <p>${state.settings.address} | Tel: ${state.settings.phone}</p>
        <p style="margin-top: 6px; font-weight: 600;">MEMBERSHIP INVOICE & CASH RECEIPT</p>
      </div>

      <div class="receipt-meta">
        <div>
          <strong>Invoice #:</strong> ${member.id}<br>
          <strong>Member Name:</strong> ${member.name}<br>
          <strong>Phone:</strong> ${member.phone}
        </div>
        <div style="text-align: right;">
          <strong>Date:</strong> ${member.startDate}<br>
          <strong>Validity:</strong> ${member.startDate} to ${member.expiryDate}<br>
          <strong>Plan:</strong> ${member.plan}
        </div>
      </div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Membership Fee (${member.plan})</td>
            <td style="text-align: right;">${currency} ${(price.baseFee || 0).toLocaleString()}</td>
          </tr>
          ${price.admissionFee ? `
          <tr>
            <td>Admission / Registration Fee</td>
            <td style="text-align: right;">${currency} ${price.admissionFee.toLocaleString()}</td>
          </tr>` : ''}
          ${price.addonFee ? `
          <tr>
            <td>Locker / Trainer Add-on</td>
            <td style="text-align: right;">${currency} ${price.addonFee.toLocaleString()}</td>
          </tr>` : ''}
          ${price.discount ? `
          <tr>
            <td>Discount Applied</td>
            <td style="text-align: right; color: #16a34a;">- ${currency} ${price.discount.toLocaleString()}</td>
          </tr>` : ''}
          ${price.tax ? `
          <tr>
            <td>Tax / VAT</td>
            <td style="text-align: right;">+ ${currency} ${price.tax.toLocaleString()}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div class="receipt-summary">
        <div class="receipt-row bold">
          <span>Grand Total:</span>
          <span>${currency} ${(price.grandTotal || 0).toLocaleString()}</span>
        </div>
        <div class="receipt-row">
          <span>Paid (${price.paymentMethod || 'Cash'}):</span>
          <span>${currency} ${(price.paid || 0).toLocaleString()}</span>
        </div>
        <div class="receipt-row" style="color: ${price.due > 0 ? '#dc2626' : '#16a34a'}; font-weight: 600;">
          <span>Balance Due:</span>
          <span>${currency} ${(price.due || 0).toLocaleString()}</span>
        </div>
      </div>

      <div class="receipt-footer">
        <p>Thank you for choosing ${state.settings.gymName}!</p>
        <p>Stay fit, stay strong. System generated receipt.</p>
      </div>
    </div>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

function closeModal() {
  document.getElementById('invoiceModal').classList.remove('active');
}

// Settings Form Population & Submit
function populateSettingsForm() {
  document.getElementById('setGymName').value = state.settings.gymName || '';
  document.getElementById('setGymPhone').value = state.settings.phone || '';
  document.getElementById('setGymAddress').value = state.settings.address || '';
  document.getElementById('setCurrency').value = state.settings.currency || '৳';

  if (state.settings.plans) {
    const monthly = state.settings.plans.find(p => p.id === 'monthly');
    const q3 = state.settings.plans.find(p => p.id === '3months');
    const q6 = state.settings.plans.find(p => p.id === '6months');
    const yr = state.settings.plans.find(p => p.id === 'yearly');

    if (monthly) document.getElementById('planMonthly').value = monthly.fee;
    if (q3) document.getElementById('plan3Months').value = q3.fee;
    if (q6) document.getElementById('plan6Months').value = q6.fee;
    if (yr) document.getElementById('planYearly').value = yr.fee;
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();

  const updatedSettings = {
    gymName: document.getElementById('setGymName').value.trim(),
    phone: document.getElementById('setGymPhone').value.trim(),
    address: document.getElementById('setGymAddress').value.trim(),
    currency: document.getElementById('setCurrency').value.trim() || '৳',
    plans: [
      { id: "monthly", name: "Monthly", durationMonths: 1, fee: parseFloat(document.getElementById('planMonthly').value) || 1500 },
      { id: "3months", name: "3 Months", durationMonths: 3, fee: parseFloat(document.getElementById('plan3Months').value) || 4000 },
      { id: "6months", name: "6 Months", durationMonths: 6, fee: parseFloat(document.getElementById('plan6Months').value) || 7500 },
      { id: "yearly", name: "Yearly", durationMonths: 12, fee: parseFloat(document.getElementById('planYearly').value) || 14000 }
    ]
  };

  try {
    if (window.electronAPI) {
      await window.electronAPI.updateSettings(updatedSettings);
    } else {
      state.settings = updatedSettings;
      localStorage.setItem('gym_db_fallback', JSON.stringify(state));
    }
    showToast("Settings and Rates updated successfully in JSON!", "success");
    await loadDatabase();
    switchTab('dashboard');
  } catch (err) {
    console.error("Settings save error:", err);
    showToast("Failed to save settings: " + err.message, "error");
  }
}

// Toast Alert
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toastNotification');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}
