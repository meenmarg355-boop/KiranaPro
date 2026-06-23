// Global State Storage
let items = JSON.parse(localStorage.getItem('kiranaItems')) || [];
let history = JSON.parse(localStorage.getItem('kiranaHistory')) || [];
let customers = JSON.parse(localStorage.getItem('kiranaCustomers')) || [];
let currentTheme = localStorage.getItem('kiranaTheme') || 'light';
let currentUser = JSON.parse(localStorage.getItem('kiranaCurrentUser')) || null;

const defaultAvatar = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150";

window.onload = function() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    
    if (currentUser) {
        unlockDashboard();
    } else {
        lockDashboard();
    }
};

// --- AUTH SYSTEM LOGICS ---
function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabSignUp').classList.remove('active');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
    } else {
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('tabSignUp').classList.add('active');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
    }
}

function generateUsername() {
    let name = document.getElementById('signUpName').value.trim().toLowerCase().replace(/\s+/g, '');
    let phone = document.getElementById('signUpPhone').value.trim();
    if (name.length > 0) {
        let lastFour = phone.length >= 4 ? phone.slice(-4) : phone;
        document.getElementById('signUpUser').value = `${name}${lastFour}`;
    } else {
        document.getElementById('signUpUser').value = "";
    }
}

function handleSignUp(e) {
    e.preventDefault();
    let name = document.getElementById('signUpName').value.trim();
    let phone = document.getElementById('signUpPhone').value.trim();
    let username = document.getElementById('signUpUser').value;
    let pass = document.getElementById('signUpPass').value;
    let passConf = document.getElementById('signUpPassConf').value;

    if (pass !== passConf) { alert("🚨 Passwords match nahi kar rahe hain!"); return; }

    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    let userExists = usersList.find(u => u.username === username || u.phone === phone);
    if (userExists) { alert("🚨 Details registered hain!"); return; }

    usersList.push({ name, phone, username, pass, profilePic: defaultAvatar });
    localStorage.setItem('kiranaUsersList', JSON.stringify(usersList));
    alert(`🎉 Created! Username: ${username}`);
    switchAuthTab('login');
}

function handleLogin(e) {
    e.preventDefault();
    let userInput = document.getElementById('loginUser').value.trim();
    let passInput = document.getElementById('loginPass').value;
    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    let matchedUser = usersList.find(u => (u.username === userInput || u.phone === userInput) && u.pass === passInput);

    if (matchedUser) {
        currentUser = matchedUser;
        localStorage.setItem('kiranaCurrentUser', JSON.stringify(currentUser));
        unlockDashboard();
    } else { alert("🚨 Galat details!"); }
}

function handleLogout() { currentUser = null; localStorage.removeItem('kiranaCurrentUser'); lockDashboard(); }

function unlockDashboard() {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('dashboard-blurred');
    document.getElementById('welcomeUser').innerText = currentUser.name;
    document.getElementById('headerProfileImg').src = currentUser.profilePic || defaultAvatar;
    document.getElementById('logoutBtn').classList.remove('hidden');
    
    calculateStats(); displayItems(); displayHistory(); populateBillingDropdown(); displayCustomers(); checkLowStockAlerts();
}

function lockDashboard() {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('mainDashboard').classList.add('dashboard-blurred');
}

// --- PROFILE EDIT ---
function openProfileModal() { document.getElementById('profileOverlay').classList.remove('hidden'); document.getElementById('editName').value = currentUser.name; document.getElementById('editPhone').value = currentUser.phone; document.getElementById('editUsername').value = currentUser.username; }
function closeProfileModal() { document.getElementById('profileOverlay').classList.add('hidden'); }
function previewUserPhoto(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) { document.getElementById('profilePreviewModal').src = e.target.result; currentUser.profilePic = e.target.result; };
        reader.readAsDataURL(file);
    }
}
function saveProfileUpdate(e) {
    e.preventDefault();
    let usersList = JSON.parse(localStorage.getItem('kiranaUsersList')) || [];
    usersList = usersList.map(user => {
        if (user.username === currentUser.username) {
            user.name = document.getElementById('editName').value.trim();
            user.phone = document.getElementById('editPhone').value.trim();
            user.profilePic = currentUser.profilePic || defaultAvatar;
            currentUser = user;
        }
        return user;
    });
    localStorage.setItem('kiranaUsersList', JSON.stringify(usersList));
    localStorage.setItem('kiranaCurrentUser', JSON.stringify(currentUser));
    unlockDashboard(); closeProfileModal(); alert("✨ Profile Saved!");
}

// --- 👤 CUSTOMER KHAATA SYSTEM LOGICS ---
function openCustomerModal() { document.getElementById('customerOverlay').classList.remove('hidden'); displayCustomers(); }
function closeCustomerModal() { document.getElementById('customerOverlay').classList.add('hidden'); }

function addCustomer() {
    let name = document.getElementById('custName').value.trim();
    let phone = document.getElementById('custPhone').value.trim() || "N/A";
    if(!name) { alert("Customer ka naam likhna zaroori hai!"); return; }

    customers.push({ name, phone, balance: 0, boughtItems: [] });
    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    document.getElementById('custName').value = ""; document.getElementById('custPhone').value = "";
    displayCustomers();
}

function addProductToCustomer(index) {
    let pName = prompt("Samaan/Item ka naam likhein (e.g., Sugar 2kg, Soap):");
    if(!pName) return;
    let pPrice = prompt("Samaan ki Keemat (Price) dalein:");
    if(!pPrice || isNaN(pPrice)) return;

    pPrice = parseFloat(pPrice);
    let currentDateTime = new Date().toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});
    
    customers[index].boughtItems.push({ name: pName, price: pPrice, date: currentDateTime });
    customers[index].balance += pPrice;

    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    displayCustomers();
}

function updateBalance(index, type) {
    let amt = prompt(`Enter Amount to ${type === 'add' ? 'Add Extra Udhaar (+)' : 'Receive Cash Payments (-)'}:`);
    if(!amt || isNaN(amt) || parseFloat(amt) <= 0) return;
    
    amt = parseFloat(amt);
    let currentDateTime = new Date().toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});

    if(type === 'add') {
        customers[index].balance += amt;
        customers[index].boughtItems.push({ name: "Extra Udhaar (+)", price: amt, date: currentDateTime });
    } else {
        customers[index].balance -= amt;
        customers[index].boughtItems.push({ name: "Cash Received (-)", price: amt, date: currentDateTime });
    }

    localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
    displayCustomers();
}

function printCustomerReport() { window.print(); }

function deleteCustomer(index) {
    if(confirm("Kya aap is customer ka record delete karna chahte hain?")) {
        customers.splice(index, 1);
        localStorage.setItem('kiranaCustomers', JSON.stringify(customers));
        displayCustomers();
    }
}

function displayCustomers() {
    let tbody = document.getElementById('customerTableBody');
    if(!tbody) return; tbody.innerHTML = "";
    
    let searchQ = document.getElementById('customerSearch').value.toLowerCase().trim();
    let grandTotal = 0;

    let filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQ) || c.phone.includes(searchQ)
    );

    if(filteredCustomers.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Koi customer nahi mila.</td></tr>`; 
        document.getElementById('customerGrandTotal').innerText = "₹0.00";
        return; 
    }

    filteredCustomers.forEach((c) => {
        // Find main index from the original array for operations
        let index = customers.indexOf(c);
        let balColor = c.balance > 0 ? '#ef4444' : (c.balance < 0 ? '#10b981' : 'inherit');
        grandTotal += c.balance;
        
        let itemsHtml = "";
        if(c.boughtItems && c.boughtItems.length > 0) {
            c.boughtItems.forEach(item => {
                // Handling older structure strings vs newer object structure
                if (typeof item === 'object') {
                    itemsHtml += `<span class="cust-item-tag">
                        <strong>${item.name}</strong> - ₹${item.price}
                        <span class="cust-item-date"><i class="fa-solid fa-clock"></i> ${item.date}</span>
                     </span>`;
                } else {
                    itemsHtml += `<span class="cust-item-tag"><strong>${item}</strong></span>`;
                }
            });
        } else {
            itemsHtml = `<span style="color:var(--text-muted); font-size:12px;">No items logged</span>`;
        }

        tbody.innerHTML += `<tr>
            <td style="font-weight:600; width:28%;">
                <div>${c.name}</div>
                <div style="font-size:12px; color:var(--text-muted); font-weight:400; margin-top:2px;"><i class="fa-solid fa-phone"></i> ${c.phone}</div>
            </td>
            <td style="max-width: 340px; word-wrap: break-word; width:47%;">${itemsHtml}</td>
            <td style="font-weight:700; color:${balColor}; width:15%;">₹${c.balance.toFixed(2)}</td>
            <td class="no-print" style="text-align:center; width:10%;">
                <button onclick="addProductToCustomer(${index})" class="btn-cust-action" style="background:#3b82f6; color:#fff;">+ Samaan</button>
                <button onclick="updateBalance(${index}, 'add')" class="btn-cust-action" style="background:#f59e0b; color:#fff;">+ Udhaar</button>
                <button onclick="updateBalance(${index}, 'sub')" class="btn-cust-action" style="background:#10b981; color:#fff;">- Jama Pay</button>
                <button onclick="deleteCustomer(${index})" class="btn-action-delete" style="display:inline-block; margin-top:4px;"><i class="fa-solid fa-trash"></i> Delete</button>
            </td>
        </tr>`;
    });

    document.getElementById('customerGrandTotal').innerText = `₹${grandTotal.toFixed(2)}`;
}

// --- 🚨 LOW STOCK ALERT LOGIC ---
function checkLowStockAlerts() {
    let alertBar = document.getElementById('lowStockAlertBar');
    let alertText = document.getElementById('lowStockAlertText');
    if(!alertBar || !alertText) return;

    let lowStockItems = items.filter(item => item.qty <= 5);

    if (lowStockItems.length > 0) {
        alertBar.classList.remove('hidden');
        let names = lowStockItems.map(i => `${i.name} (${i.qty} bacha hai)`).join(', ');
        alertText.innerHTML = `<strong>Low Stock Warning:</strong> Ye items jald hi khatam hone wale hain: ${names}`;
    } else {
        alertBar.classList.add('hidden');
    }
}

// --- CORE STOCK CODES ---
function calculateStats() {
    let totalItems = items.length, totalValue = 0;
    items.forEach(item => totalValue += (parseFloat(item.price) * parseInt(item.qty)));
    document.getElementById('statTotalItems').innerText = totalItems;
    document.getElementById('statStockValue').innerText = `₹${totalValue.toFixed(2)}`;
}

function populateBillingDropdown() {
    let sm = document.getElementById('billItemSelect'); if (!sm) return;
    sm.innerHTML = `<option value="">-- Choose Product --</option>`;
    items.forEach((item, index) => sm.innerHTML += `<option value="${index}">${item.name} (${item.qty} left)</option>`);
}

function handleSellItem() {
    let idx = document.getElementById('billItemSelect').value;
    let qty = parseInt(document.getElementById('billQty').value);
    if (idx === "" || isNaN(qty) || qty <= 0) { alert("Sahi details dalein!"); return; }

    if (qty > items[idx].qty) { alert("Out of stock!"); return; }
    items[idx].qty -= qty;
    history.push({ type: 'history-delete-single', message: `💸 Sold: ${qty} Pcs of <strong>${items[idx].name}</strong>`, time: new Date().toLocaleString() });
    saveAndRefresh();
}

function addItem() {
    let name = document.getElementById('itemName').value.trim();
    let category = document.getElementById('itemCategory').value;
    let price = document.getElementById('itemPrice').value;
    let qty = document.getElementById('itemQty').value;
    if(!name || !price || !qty) return;

    items.push({ name, category, price: parseFloat(price).toFixed(2), qty: parseInt(qty) });
    history.push({ type: 'history-add', message: `📥 Added: <strong>${name}</strong>`, time: new Date().toLocaleString() });
    saveAndRefresh();
}

function deleteItem(index) { items.splice(index, 1); saveAndRefresh(); }

function displayItems() {
    let tbody = document.getElementById('inventoryTable'); if (!tbody) return; tbody.innerHTML = "";
    let q = document.getElementById('tableSearch').value.toLowerCase().trim();
    let cat = document.getElementById('tableFilter').value;

    items.filter(i => i.name.toLowerCase().includes(q) && (cat === 'All' || i.category === cat)).forEach((item, index) => {
        tbody.innerHTML += `<tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>₹${item.price}</td>
            <td><span class="badge-stock ${item.qty<=5?'badge-warning':'badge-success'}">${item.qty} Pcs</span></td>
            <td style="text-align:center;"><button onclick="deleteItem(${index})" class="btn-action-delete"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
}

function displayHistory() {
    let hl = document.getElementById('historyLog'); if (!hl) return; hl.innerHTML = "";
    history.slice(-10).reverse().forEach(h => hl.innerHTML += `<li class="history-item ${h.type}"><span>${h.message}</span><span class="history-time">${h.time}</span></li>`);
}

function clearHistory() { history = []; localStorage.setItem('kiranaHistory', JSON.stringify(history)); displayHistory(); }

function saveAndRefresh() {
    localStorage.setItem('kiranaItems', JSON.stringify(items));
    localStorage.setItem('kiranaHistory', JSON.stringify(history));
    calculateStats(); displayItems(); displayHistory(); populateBillingDropdown(); checkLowStockAlerts();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('kiranaTheme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById('themeBtn'); if(!btn) return;
    btn.innerHTML = currentTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function exportToPDF() { window.print(); }