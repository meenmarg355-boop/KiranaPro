// Local Database States
let items = JSON.parse(localStorage.getItem('kiranaItems')) || [];
let history = JSON.parse(localStorage.getItem('kiranaHistory')) || [];
let customers = JSON.parse(localStorage.getItem('kiranaCustomers')) || [];
let salesLog = JSON.parse(localStorage.getItem('kiranaSalesLog')) || []; 
let currentTheme = localStorage.getItem('kiranaTheme') || 'light';
let currentUser = JSON.parse(localStorage.getItem('kiranaCurrentUser')) || null;

// Temporary Runtime Cart Array Structure
let currentCart = [];

const defaultAvatar = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150";

window.onload = function() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    if (currentUser) unlockDashboard(); else lockDashboard();
};

// --- SECURITY & ACCOUNT SYSTEMS ---
function switchAuthTab(tab) {
    let loginForm = document.getElementById('loginForm');
    let signupForm = document.getElementById('signupForm');
    let forgotForm = document.getElementById('forgotForm');
    let tabsHeader = document.getElementById('authTabsHeader');
    let tabLogin = document.getElementById('tabLogin');
    let tabSignUp = document.getElementById('tabSignUp');

    // Reset visibility
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    tabsHeader.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabSignUp.classList.remove('active');

    if (tab === 'login') {
        tabLogin.classList.add('active');
        loginForm.classList.remove('hidden');
    } else if (tab === 'signup') {
        tabSignUp.classList.add('active');
        signupForm.classList.remove('hidden');
    } else if (tab === 'forgot') {
        tabsHeader.classList.add('hidden'); // Forgot mode mein top tabs chipa do
        forgotForm.classList.remove('hidden');
    }
}

function generateUsername() {
    let name = document.getElementById('signUpName').value.trim().toLowerCase().replace(/\s+/g, '');
    let phone = document.getElementById('signUpPhone').value.trim();
    document.getElementById('signUpUser').value = name ? `${name}${phone.slice(-4)}` : "";
}

function handleSignUp(e) {
    e.preventDefault();
    let name = document.getElementById('signUpName').value.trim();
    let phone = document.getElementById('signUpPhone').value.trim();
    let username = document.getElementById('signUpUser').value;
    let pass = document.getElementById('signUpPass').value;
    if (pass !== document.getElementById('signUpPassConf').value) { alert("🚨 Passwords match nahi kar rahe!"); return; }

    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    if (usersList.find(u => u.username === username)) { alert("🚨 Account already exists!"); return; }

    usersList.push({ name, phone, username, pass, profilePic: defaultAvatar });
    localStorage.setItem('kiranaUsersList', JSON.stringify(usersList));
    alert("🎉 Account bana diya hai! Login karein.");
    switchAuthTab('login');
}

// 🔐 FORGOT PASSWORD UPDATE LOGIC
function handleForgotPassword(e) {
    e.preventDefault();
    let searchInput = document.getElementById('forgotUserOrMobile').value.trim();
    let newPass = document.getElementById('forgotNewPass').value;
    let reTypePass = document.getElementById('forgotReTypePass').value;

    if (newPass !== reTypePass) { alert("🚨 New Password aur Re-type Password match nahi ho rahe hain!"); return; }

    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    let userIndex = usersList.findIndex(u => u.username === searchInput || u.phone === searchInput);

    if (userIndex !== -1) {
        // Update Password in LocalStorage Database
        usersList[userIndex].pass = newPass;
        localStorage.setItem('kiranaUsersList', JSON.stringify(usersList));
        
        alert("🔒 Password successfully badal gaya hai! Naye password se login karein.");
        // Clear input values
        document.getElementById('forgotUserOrMobile').value = "";
        document.getElementById('forgotNewPass').value = "";
        document.getElementById('forgotReTypePass').value = "";
        
        switchAuthTab('login');
    } else {
        alert("🚨 Galat Username ya Mobile Number! Is naam ka koi account nahi mila.");
    }
}

function handleLogin(e) {
    e.preventDefault();
    let userInput = document.getElementById('loginUser').value.trim();
    let passInput = document.getElementById('loginPass').value;
    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    let match = usersList.find(u => (u.username === userInput || u.phone === userInput) && u.pass === passInput);

    if (match) {
        currentUser = match;
        localStorage.setItem('kiranaCurrentUser', JSON.stringify(currentUser));
        unlockDashboard();
    } else { alert("🚨 Galat password ya username!"); }
}

function handleLogout() { currentUser = null; localStorage.removeItem('kiranaCurrentUser'); lockDashboard(); }
function lockDashboard() { document.getElementById('authOverlay').classList.remove('hidden'); document.getElementById('mainDashboard').classList.add('dashboard-blurred'); }

function unlockDashboard() {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('dashboard-blurred');
    document.getElementById('welcomeUser').innerText = currentUser.name;
    document.getElementById('headerProfileImg').src = currentUser.profilePic || defaultAvatar;
    document.getElementById('logoutBtn').classList.remove('hidden');
    
    saveAndRefresh();
}

// --- PROFILE ACTIONS ---
function openProfileModal() { document.getElementById('profileOverlay').classList.remove('hidden'); document.getElementById('editName').value = currentUser.name; document.getElementById('editPhone').value = currentUser.phone; }
function closeProfileModal() { document.getElementById('profileOverlay').classList.add('hidden'); }
function previewUserPhoto(e) {
    let file = e.target.files[0];
    if (file) {
        let r = new FileReader();
        r.onload = function(ev) { document.getElementById('profilePreviewModal').src = ev.target.result; currentUser.profilePic = ev.target.result; };
        r.readAsDataURL(file);
    }
}
function saveProfileUpdate(e) {
    e.preventDefault();
    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    usersList = usersList.map(u => {
        if (u.username === currentUser.username) {
            u.name = document.getElementById('editName').value.trim();
            u.phone = document.getElementById('editPhone').value.trim();
            u.profilePic = currentUser.profilePic || defaultAvatar;
            currentUser = u;
        }
        return u;
    });
    localStorage.setItem('kiranaUsersList', JSON.stringify(usersList));
    localStorage.setItem('kiranaCurrentUser', JSON.stringify(currentUser));
    unlockDashboard(); closeProfileModal(); alert("✨ Profile Update Ho Gayi!");
}

// --- 🛒 MULTI-ITEM CART LOGIC & COUNTER SYSTEM ---
function populateBillingDropdown() {
    let select = document.getElementById('billItemSelect'); if(!select) return;
    select.innerHTML = '<option value="">-- Choose Stock Item --</option>';
    items.forEach((item, index) => {
        if(item.qty > 0) select.innerHTML += `<option value="${index}">${item.name} (₹${item.price}) [Qty: ${item.qty}]</option>`;
    });
}

function addToCart() {
    let idx = document.getElementById('billItemSelect').value;
    let qty = parseInt(document.getElementById('billQty').value);
    if(idx === "" || isNaN(qty) || qty <= 0) { alert("Sahi item aur quantity select karein!"); return; }

    let stockItem = items[idx];
    let existingCartItem = currentCart.find(c => c.stockIndex === idx);
    let totalNeededQty = qty + (existingCartItem ? existingCartItem.qty : 0);

    if (totalNeededQty > stockItem.qty) { alert(`🚨 Out of stock! Sirf ${stockItem.qty} items bache hain.`); return; }

    if (existingCartItem) {
        existingCartItem.qty = totalNeededQty;
        existingCartItem.totalPrice = totalNeededQty * stockItem.price;
    } else {
        currentCart.push({
            stockIndex: idx,
            name: stockItem.name,
            price: parseFloat(stockItem.price),
            qty: qty,
            totalPrice: qty * parseFloat(stockItem.price)
        });
    }
    
    document.getElementById('billQty').value = 1;
    updateCartUIPreview();
}

function updateCartUIPreview() {
    let box = document.getElementById('cartPreviewBox');
    let list = document.getElementById('cartList');
    if(!box || !list) return;

    if(currentCart.length === 0) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    list.innerHTML = "";

    let totalQty = 0, subtotal = 0;
    currentCart.forEach((c, i) => {
        totalQty += c.qty;
        subtotal += c.totalPrice;
        list.innerHTML += `<li class="cart-item-row">
            <span>${c.name} (x${c.qty})</span>
            <span>₹${c.totalPrice.toFixed(2)} <i class="fa-solid fa-circle-xmark" style="color:var(--danger-color); cursor:pointer; margin-left:6px;" onclick="removeFromCart(${i})"></i></span>
        </li>`;
    });

    document.getElementById('cartCount').innerText = totalQty;
    document.getElementById('cartSubtotal').innerText = `₹${subtotal.toFixed(2)}`;
}

function removeFromCart(i) {
    currentCart.splice(i, 1);
    updateCartUIPreview();
}

// --- 🧾 CHECKOUT AND GENERATE AUTOMATIC INVOICE ---
function checkoutCart() {
    if(currentCart.length === 0) return;

    let invoiceSubtotal = 0;
    let invoiceBody = document.getElementById('invoiceItemsBody');
    invoiceBody.innerHTML = "";

    currentCart.forEach(c => {
        items[c.stockIndex].qty -= c.qty;
        invoiceSubtotal += c.totalPrice;
        invoiceBody.innerHTML += `<tr>
            <td>${c.name}</td>
            <td>${c.qty}</td>
            <td>₹${c.price.toFixed(2)}</td>
            <td>₹${c.totalPrice.toFixed(2)}</td>
        </tr>`;
    });

    let timestamp = new Date().toLocaleDateString();
    salesLog.push({ date: timestamp, amount: invoiceSubtotal });
    localStorage.setItem('kiranaSalesLog', JSON.stringify(salesLog));

    let now = new Date();
    document.getElementById('invDateTime').innerText = now.toLocaleString();
    document.getElementById('invNum').innerText = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('invBilledBy').innerText = currentUser.name;
    document.getElementById('invGrandTotal').innerText = `₹${invoiceSubtotal.toFixed(2)}`;

    history.push({ 
        type: 'history-delete-single', 
        message: `💸 Multi-Item Sale Checked out! Total Bill: <strong>₹${invoiceSubtotal.toFixed(2)}</strong>`, 
        time: now.toLocaleString() 
    });

    currentCart = [];
    updateCartUIPreview();
    saveAndRefresh();

    document.getElementById('invoiceOverlay').classList.remove('hidden');
}

function closeInvoiceModal() { document.getElementById('invoiceOverlay').classList.add('hidden'); }

// --- 📊 BUSINESS ANALYTICS & STATS LOGIC ---
function calculateDashboardAnalytics() {
    let totalItems = items.length, totalValue = 0;
    items.forEach(item => totalValue += (parseFloat(item.price) * parseInt(item.qty)));
    document.getElementById('statTotalItems').innerText = totalItems;
    document.getElementById('statStockValue').innerText = `₹${totalValue.toFixed(2)}`;

    let todayStr = new Date().toLocaleDateString();
    let todaySalesAmt = 0;
    salesLog.forEach(sale => { if(sale.date === todayStr) todaySalesAmt += sale.amount; });

    let netProfitAmt = todaySalesAmt * 0.20;

    document.getElementById('statTodaySales').innerText = `₹${todaySalesAmt.toFixed(2)}`;
    document.getElementById('statNetProfit').innerText = `₹${netProfitAmt.toFixed(2)}`;
}

// --- 👤 KHAATA LEDGER SYSTEM ---
function openCustomerModal() { document.getElementById('customerOverlay').classList.remove('hidden'); displayCustomers(); }
function closeCustomerModal() { document.getElementById('customerOverlay').classList.add('hidden'); }

function addCustomer() {
    let name = document.getElementById('custName').value.trim();
    let phone = document.getElementById('custPhone').value.trim() || "N/A";
    if(!name) { alert("Customer Name jaruri h!"); return; }

    customers.push({ name, phone, balance: 0, boughtItems: [] });
    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    document.getElementById('custName').value = ""; document.getElementById('custPhone').value = "";
    displayCustomers();
}

function addProductToCustomer(idx) {
    let name = prompt("Samaan ka naam (e.g., Surf Excel, Rice):"); if(!name) return;
    let price = prompt("Keemat (Price):"); if(!price || isNaN(price)) return;
    
    price = parseFloat(price);
    let dt = new Date().toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});
    
    customers[idx].boughtItems.push({ name, price, date: dt });
    customers[idx].balance += price;
    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    displayCustomers();
}

function updateBalance(idx, type) {
    let amt = prompt(`Enter Cash Payment Amount:`); if(!amt || isNaN(amt) || parseFloat(amt) <= 0) return;
    amt = parseFloat(amt);
    let dt = new Date().toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});

    if(type === 'add') {
        customers[idx].balance += amt;
        customers[idx].boughtItems.push({ name: "Extra Udhaar (+)", price: amt, date: dt });
    } else {
        customers[idx].balance -= amt;
        customers[idx].boughtItems.push({ name: "Cash Collected (-)", price: amt, date: dt });
    }
    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    displayCustomers();
}

function deleteCustomer(idx) { if(confirm("Account delete karein?")) { customers.splice(idx, 1); localStorage.setItem('kiranaCustomers', JSON.stringify(customers)); displayCustomers(); } }

function displayCustomers() {
    let tbody = document.getElementById('customerTableBody'); if(!tbody) return; tbody.innerHTML = "";
    let searchQ = document.getElementById('customerSearch').value.toLowerCase().trim();
    let grandTotal = 0;

    customers.filter(c => c.name.toLowerCase().includes(searchQ) || c.phone.includes(searchQ)).forEach((c) => {
        let origIdx = customers.indexOf(c);
        grandTotal += c.balance;
        let itemsHtml = c.boughtItems.map(i => `<span class="cust-item-tag"><strong>${i.name}</strong> - ₹${i.price} <span class="cust-item-date">${i.date}</span></span>`).join('') || "No entries logged";

        tbody.innerHTML += `<tr>
            <td><strong>${c.name}</strong><br><small style="color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${c.phone}</small></td>
            <td style="max-width:300px; word-wrap:break-word;">${itemsHtml}</td>
            <td style="font-weight:700; color:${c.balance>0?'var(--danger-color)':'#10b981'};">₹${c.balance.toFixed(2)}</td>
            <td class="no-print" style="text-align:center;">
                <button onclick="addProductToCustomer(${origIdx})" class="btn-cust-action" style="background:#3b82f6;color:#fff;">+ Samaan</button>
                <button onclick="updateBalance(${origIdx}, 'add')" class="btn-cust-action" style="background:#f59e0b;color:#fff;">+ Udhaar</button>
                <button onclick="updateBalance(${origIdx}, 'sub')" class="btn-cust-action" style="background:#10b981;color:#fff;">- Jama Amt</button>
                <button onclick="deleteCustomer(${origIdx})" class="btn-action-delete" style="margin-top:5px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    document.getElementById('customerGrandTotal').innerText = `₹${grandTotal.toFixed(2)}`;
}

// --- 🔒 EXCEL/CSV DATA BACKUP SECURITY ---
function exportToCSV() {
    if(items.length === 0) { alert("Backup banane ke liye stock inventory khali hai!"); return; }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Item Name,Category,Price,Available Stock\n";

    items.forEach(i => {
        let row = `"${i.name}","${i.category}","${i.price}","${i.qty}"`;
        csvContent += row + "\n";
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kirana_Stock_Backup_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- CORE STOCK SYSTEMS ---
function addItem() {
    let name = document.getElementById('itemName').value.trim();
    let category = document.getElementById('itemCategory').value;
    let price = document.getElementById('itemPrice').value;
    let qty = document.getElementById('itemQty').value;
    if(!name || !price || !qty) { alert("Saari details bharein!"); return; }

    items.push({ name, category, price: parseFloat(price).toFixed(2), qty: parseInt(qty) });
    history.push({ type: 'history-add', message: `📥 Stock Restock: <strong>${name}</strong> (${qty} Pcs added)`, time: new Date().toLocaleString() });
    
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('itemQty').value = "";
    saveAndRefresh();
}

function deleteItem(idx) { items.splice(idx, 1); saveAndRefresh(); }

function displayItems() {
    let tbody = document.getElementById('inventoryTable'); if(!tbody) return; tbody.innerHTML = "";
    let q = document.getElementById('tableSearch').value.toLowerCase().trim();
    let cat = document.getElementById('tableFilter').value;

    items.filter(i => i.name.toLowerCase().includes(q) && (cat === 'All' || i.category === cat)).forEach((item, index) => {
        let origIdx = items.indexOf(item);
        tbody.innerHTML += `<tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>₹${item.price}</td>
            <td><span class="badge-stock ${item.qty<=5?'badge-warning':'badge-success'}">${item.qty} Pcs</span></td>
            <td style="text-align:center;"><button onclick="deleteItem(${origIdx})" class="btn-action-delete"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
}

function checkLowStockAlerts() {
    let bar = document.getElementById('lowStockAlertBar');
    let txt = document.getElementById('lowStockAlertText');
    let lowItems = items.filter(i => i.qty <= 5);

    if (lowItems.length > 0) {
        bar.classList.remove('hidden');
        txt.innerHTML = `<strong>Low Stock Alerts:</strong> Turant fill karein: ${lowItems.map(i => `${i.name} (${i.qty} bache)`).join(', ')}`;
    } else { bar.classList.add('hidden'); }
}

function displayHistory() {
    let hl = document.getElementById('historyLog'); if (!hl) return; hl.innerHTML = "";
    history.slice(-8).reverse().forEach(h => hl.innerHTML += `<li class="history-item ${h.type}"><span>${h.message}</span><span class="history-time">${h.time}</span></li>`);
}
function clearHistory() { history = []; localStorage.setItem('kiranaHistory', JSON.stringify(history)); displayHistory(); }

function saveAndRefresh() {
    localStorage.setItem('kiranaItems', JSON.stringify(items));
    localStorage.setItem('kiranaHistory', JSON.stringify(history));
    calculateDashboardAnalytics(); displayItems(); displayHistory(); populateBillingDropdown(); checkLowStockAlerts();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('kiranaTheme', currentTheme);
    updateThemeIcon();
}
function updateThemeIcon() {
    document.getElementById('themeBtn').innerHTML = currentTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}