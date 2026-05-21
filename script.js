// ============================================================
//  SECTION 1: FIREBASE SETUP & AUTH
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBYJel4b02QXpbQU7tWc2dd1ns36hknUbY",
    authDomain: "equapay-52729.firebaseapp.com",
    projectId: "equapay-52729",
    storageBucket: "equapay-52729.firebasestorage.app",
    messagingSenderId: "100025932427",
    appId: "1:100025932427:web:53cae98e55b45ca4ae528e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.firebaseSignIn = function () {
    const email = document.querySelector('#login input[type=text]').value.trim();
    const pass = document.querySelector('#login input[type=password]').value.trim();
    if (!email || !pass) { alert('Please enter email and password'); return; }
    signInWithEmailAndPassword(auth, email, pass)
        .then((result) => {
            const name = result.user.displayName || email.split('@')[0];
            document.getElementById('sidebarName').textContent = name;
            showPage('dashboard');
        })
        .catch(() => alert('Wrong email or password!'));
};

window.firebaseSignUp = function () {
    const email = document.querySelector('#login input[type=text]').value.trim();
    const pass = document.querySelector('#login input[type=password]').value.trim();
    if (!email || !pass) { alert('Please enter email and password'); return; }
    createUserWithEmailAndPassword(auth, email, pass)
        .then((result) => {
            const name = result.user.displayName || email.split('@')[0];
            document.getElementById('sidebarName').textContent = name;
            showPage('dashboard');
        })
        .catch(err => alert(err.message));
};

window.googleSignIn = function () {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const name = result.user.displayName || 'User';
            document.getElementById('sidebarName').textContent = name;
            showPage('dashboard');
        })
        .catch(err => alert(err.message));
};

// ============================================================
//  SECTION 2: APP STATE
// ============================================================
let groups = [];
let currentGroup = null;
let currentCurrency = '₹';
let currentSplitType = 'Equal';
let currentLang = 'english';

// ============================================================
//  SECTION 3: PAGE NAVIGATION
// ============================================================
window.showPage = function (id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) toggleMenu();
};

window.toggleMenu = function () {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('overlay');
    s.classList.toggle('open');
    o.style.display = s.classList.contains('open') ? 'block' : 'none';
};

// ============================================================
//  SECTION 4: GROUP MANAGEMENT
// ============================================================
window.addNewGroup = function () {
    const groupName = document.getElementById('groupInput').value.trim();
    const membersInput = document.getElementById('groupMembers').value.trim();
    if (!groupName || !membersInput) { alert("Please enter group name and members"); return; }
    const membersArray = membersInput.split(',').map(m => m.trim());
    groups.push({ name: groupName, members: membersArray, expenses: [], settled: [] });
    document.getElementById('groupInput').value = "";
    document.getElementById('groupMembers').value = "";
    document.getElementById('groupDesc').value = "";
    renderDashboard();
    showPage('dashboard');
};

window.renderDashboard = function () {
    const list = document.getElementById('groupList');
    const noMsg = document.getElementById('noGroupsMsg');
    list.innerHTML = '';
    // Search functionality
document.querySelector('.search-bar').oninput = function() {
    const query = this.value.toLowerCase();
    const cards = list.querySelectorAll('.expense-card');
    cards.forEach(card => {
        const name = card.querySelector('strong').textContent.toLowerCase();
        card.style.display = name.includes(query) ? 'flex' : 'none';
    });
};
    if (groups.length === 0) { noMsg.style.display = 'block'; return; }
    noMsg.style.display = 'none';
    const t = translations[currentLang];
    groups.forEach(function (group, index) {
        const total = group.expenses.reduce((s, e) => s + e.amount, 0);
        const card = document.createElement('div');
        card.className = 'expense-card';
        card.innerHTML = `
            <div><strong>${group.name}</strong><br>
            <small>${group.members.length} ${t.members} • ${group.expenses.length} ${t.expenses}</small></div>
            <b class="${total > 0 ? 'red' : 'grey'}">${currentCurrency}${total}</b>`;
        card.onclick = () => openGroup(index);
        const isDark = document.querySelector('.phone').style.background === 'rgb(26, 26, 26)';
if (isDark) { card.style.background = '#2d2d2d'; card.style.color = 'white'; }
        list.appendChild(card);
    });
};

window.openGroup = function (index) {
    currentGroup = groups[index];
    document.getElementById('groupTitle').innerText = currentGroup.name;
    const payerSelect = document.getElementById('payerSelect');
    payerSelect.innerHTML = currentGroup.members.map(m => `<option value="${m}">${m}</option>`).join('');
    renderChart();
    renderExpenseLog();
    showPage('apartment');
};

// ============================================================
//  SECTION 5: SPLIT TYPE UI
// ============================================================
window.selectSplitType = function (type) {
    currentSplitType = type;

    // Update button styles
    ['Equal', 'Percentage', 'Exact', 'Share'].forEach(t => {
        const btn = document.getElementById('splitBtn' + t);
        if (!btn) return;
        if (t === type) {
            btn.style.background = '#2d8cff';
            btn.style.color = 'white';
            btn.style.border = '2px solid #2d8cff';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#555';
            btn.style.border = '2px solid #eee';
        }
    });

    // Show/hide custom fields
    const customDiv = document.getElementById('splitCustomFields');
    if (customDiv) {
        customDiv.style.display = type === 'Equal' ? 'none' : 'block';
        updateSplitFields();
    }
};

window.updateSplitFields = function () {
    if (!currentGroup) return;
    const amt = parseFloat(document.getElementById('mainAmount').value) || 0;
    const container = document.getElementById('splitInputsContainer');
    const msg = document.getElementById('splitValidMsg');
    if (!container) return;
    container.innerHTML = '';
    msg.textContent = '';

    if (currentSplitType === 'Percentage') {
        const equalPct = (100 / currentGroup.members.length).toFixed(1);
        msg.textContent = 'Must add up to 100%';
        currentGroup.members.forEach(member => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:13px; width:80px;">${member}</span>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="number" id="input_${member}" value="${equalPct}"
                            style="width:70px; padding:8px; border:1px solid #eee; border-radius:8px; text-align:right;"
                            oninput="validateSplitInputs(${amt})">
                        <span style="font-size:13px;">%</span>
                    </div>
                </div>`;
        });

    } else if (currentSplitType === 'Exact') {
        const equalAmt = amt > 0 ? (amt / currentGroup.members.length).toFixed(2) : '0';
        msg.textContent = 'Must add up to ' + currentCurrency + amt;
        currentGroup.members.forEach(member => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:13px; width:80px;">${member}</span>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:13px;">${currentCurrency}</span>
                        <input type="number" id="input_${member}" value="${equalAmt}"
                            style="width:70px; padding:8px; border:1px solid #eee; border-radius:8px; text-align:right;"
                            oninput="validateSplitInputs(${amt})">
                    </div>
                </div>`;
        });

    } else if (currentSplitType === 'Share') {
        msg.textContent = 'Assign shares — more shares = more cost';
        currentGroup.members.forEach(member => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:13px; width:80px;">${member}</span>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="number" id="input_${member}" value="1" min="1"
                            style="width:70px; padding:8px; border:1px solid #eee; border-radius:8px; text-align:right;"
                            oninput="validateSplitInputs(${amt})">
                        <span style="font-size:13px;">shares</span>
                    </div>
                </div>`;
        });
    }
};

window.validateSplitInputs = function (amt) {
    const msg = document.getElementById('splitValidMsg');
    if (!currentGroup || !msg) return;

    if (currentSplitType === 'Percentage') {
        const total = currentGroup.members.reduce((s, m) => {
            return s + (parseFloat(document.getElementById('input_' + m)?.value) || 0);
        }, 0);
        msg.style.color = Math.abs(total - 100) < 1 ? '#5b8f67' : '#d46b82';
msg.textContent = Math.abs(total - 100) < 1 ? '✓ 100% allocated!' : total.toFixed(1) + '% of 100%';

    } else if (currentSplitType === 'Exact') {
        const total = currentGroup.members.reduce((s, m) => {
            return s + (parseFloat(document.getElementById('input_' + m)?.value) || 0);
        }, 0);
        const diff = (amt - total).toFixed(2);
        msg.style.color = Math.abs(diff) < 0.01 ? '#5b8f67' : '#d46b82';
        msg.textContent = Math.abs(diff) < 0.01 ? '✓ Total matches!' : currentCurrency + diff + ' remaining';

    } else if (currentSplitType === 'Share') {
        const totalShares = currentGroup.members.reduce((s, m) => {
            return s + (parseFloat(document.getElementById('input_' + m)?.value) || 1);
        }, 0);
        msg.style.color = '#5b8f67';
        msg.textContent = 'Total shares: ' + totalShares;
    }
};

// ============================================================
//  SECTION 6: EXPENSE MANAGEMENT
// ============================================================
window.calculateSplit = function () {
    const amt = parseFloat(document.getElementById('mainAmount').value);
    const name = document.getElementById('expName').value.trim();
    const payer = document.getElementById('payerSelect').value;
    if (!amt || !name || !currentGroup) { alert("Please enter item name and amount"); return; }

    let splits = {};

    if (currentSplitType === 'Equal') {
        const per = amt / currentGroup.members.length;
        currentGroup.members.forEach(m => splits[m] = per);

    } else if (currentSplitType === 'Percentage') {
        let total = 0;
        currentGroup.members.forEach(m => {
            const pct = parseFloat(document.getElementById('input_' + m)?.value) || 0;
            splits[m] = (pct / 100) * amt;
            total += pct;
        });
        if (Math.abs(total - 100) > 1) { alert("Percentages must add up to 100%"); return; }
    } else if (currentSplitType === 'Exact') {
        let total = 0;
        currentGroup.members.forEach(m => {
            splits[m] = parseFloat(document.getElementById('input_' + m)?.value) || 0;
            total += splits[m];
        });
        if (Math.abs(total - amt) > 0.01) { alert("Amounts don't add up to " + currentCurrency + amt); return; }

    } else if (currentSplitType === 'Share') {
        let totalShares = 0;
        currentGroup.members.forEach(m => {
            totalShares += parseFloat(document.getElementById('input_' + m)?.value) || 1;
        });
        currentGroup.members.forEach(m => {
            const s = parseFloat(document.getElementById('input_' + m)?.value) || 1;
            splits[m] = (s / totalShares) * amt;
        });
    }

    currentGroup.expenses.push({ name, amount: amt, payer, splits, splitType: currentSplitType });
    document.getElementById('expName').value = '';
    document.getElementById('mainAmount').value = '';
    selectSplitType('Equal');
    renderChart();
    renderExpenseLog();
    renderDashboard();
    showPage('apartment');
};

window.settleUp = function (member, amount) {
    if (!currentGroup.settled) currentGroup.settled = [];
    currentGroup.settled.push({ member, amount });
    renderChart();
    renderExpenseLog();
};

// ============================================================
//  SECTION 7: CHART & EXPENSE LOG
// ============================================================
window.renderChart = function () {
    const chart = document.getElementById('chartMembers');
    chart.innerHTML = '';
    const members = currentGroup.members;
    const owedMap = {};
    members.forEach(m => owedMap[m.trim()] = 0);

    (currentGroup.expenses || []).forEach(exp => {
        if (exp.splits) {
            members.forEach(m => {
                if (m !== exp.payer) owedMap[m.trim()] += exp.splits[m] || 0;
            });
        } else {
            const perPerson = exp.amount / members.length;
            members.forEach(m => { if (m.trim() !== exp.payer) owedMap[m.trim()] += perPerson; });
        }
    });

    (currentGroup.settled || []).forEach(s => {
        owedMap[s.member] = Math.max(0, (owedMap[s.member] || 0) - s.amount);
    });

    const maxOwed = Math.max(...Object.values(owedMap), 1);
    members.forEach(member => {
        const owed = owedMap[member.trim()];
        const barHeight = Math.max(20, (owed / maxOwed) * 110);
        const label = owed > 0 ? currentCurrency + Math.round(owed) : '';
        chart.innerHTML += `
            <div class="bar-wrapper">
                <div class="bar" style="height:${barHeight}px; color:#333;">
                    <span>${label}</span>
                    ${owed <= 0 ? '<div style="font-size:14px;">✓</div>' : ''}
                </div>
                <strong>${member.trim()}</strong>
            </div>`;
    });
};

window.renderExpenseLog = function () {
    const resultBox = document.getElementById('resultContainer');
    resultBox.innerHTML = '';
    const t = translations[currentLang];

    if (currentGroup.expenses.length === 0) {
        resultBox.innerHTML = `<div style="text-align:center; color:#aaa; padding:20px;">
            <div style="font-size:30px;">🧾</div>
            <p><b>${t.noExpenses}</b></p>
            <p style="font-size:12px;">${t.tapToAdd}</p>
        </div>`;
        return;
    }

    resultBox.innerHTML += `<p style="font-weight:bold; color:#555; font-size:13px; margin:10px 0 8px;">${t.expenseHistory}</p>`;

    [...currentGroup.expenses].reverse().forEach(exp => {
        const splits = currentGroup.members.map(m => {
            const amt = exp.splits ? exp.splits[m] : (exp.amount / currentGroup.members.length);
            if (m === exp.payer) {
                return `<span style="font-size:10px; background:#e6f4ea; color:#5b8f67; padding:2px 6px; border-radius:20px;">${m} ${t.paid}</span>`;
            }
            return `<span style="font-size:10px; background:#fde8ee; color:#d46b82; padding:2px 6px; border-radius:20px;">${m} ${t.owes} ${currentCurrency}${amt ? amt.toFixed(2) : '0.00'}</span>`;
        }).join(' ');

        const splitLabel = exp.splitType && exp.splitType !== 'Equal' ? `<span style="font-size:10px; background:#eef; color:#2d8cff; padding:2px 6px; border-radius:20px; margin-left:4px;">${exp.splitType}</span>` : '';

        resultBox.innerHTML += `
            <div style="background:white; padding:12px; border-radius:12px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold;">
                    <span>${exp.name} ${splitLabel}</span><span>${currentCurrency}${exp.amount}</span>
                </div>
                <div style="margin-top:5px;">${splits}</div>
            </div>`;
    });

    resultBox.innerHTML += `<p style="font-weight:bold; color:#555; font-size:13px; margin:15px 0 8px;">${t.settleUp}</p>`;

    const owedMap = {};
    currentGroup.members.forEach(m => owedMap[m] = 0);
    currentGroup.expenses.forEach(exp => {
        currentGroup.members.forEach(m => {
            if (m !== exp.payer) {
                const amt = exp.splits ? exp.splits[m] : (exp.amount / currentGroup.members.length);
                owedMap[m] += amt || 0;
            }
        });
    });
    (currentGroup.settled || []).forEach(s => {
        owedMap[s.member] = Math.max(0, owedMap[s.member] - s.amount);
    });

    let anyUnsettled = false;
    currentGroup.members.forEach(member => {
        const owed = owedMap[member];
        if (owed > 0.01) {
            anyUnsettled = true;
            resultBox.innerHTML += `
                <div style="background:white; padding:12px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
                    <div>
                        <span style="font-size:13px;">${member}</span><br>
                        <span style="color:#d46b82; font-size:12px;">${t.owes} ${currentCurrency}${owed.toFixed(2)}</span>
                    </div>
                    <button onclick="settleUp('${member}', ${owed})"
                        style="background:#5b8f67; color:white; border:none; padding:8px 12px; border-radius:10px; font-size:12px; cursor:pointer;">
                        ${t.settle}
                    </button>
                </div>`;
        }
    });

    if (!anyUnsettled) {
        resultBox.innerHTML += `<div style="text-align:center; color:#5b8f67; padding:15px; background:white; border-radius:12px;">🎉 <b>${t.allSettled}</b></div>`;
    }
};

// ============================================================
//  SECTION 8: THEME
// ============================================================
window.setTheme = function (mode) {
    const phone = document.querySelector('.phone');
    const sidebar = document.querySelector('.sidebar');
    if (mode === 'dark') {
        phone.style.background = '#1a1a1a';
        phone.style.color = 'white';
        sidebar.style.background = '#2d2d2d';
        sidebar.style.color = 'white';
    } else {
        phone.style.background = '';
        phone.style.color = '';
        sidebar.style.background = '';
        sidebar.style.color = '';
    }
    toggleMenu();
};

// ============================================================
//  SECTION 9: LANGUAGE
// ============================================================
const translations = {
    english: {
        hello: "Hello, User 👋", welcome: "Welcome to Equapay", getStarted: "Get Started",
        tagline: "Manage shared expenses without the stress.",
        emailPlaceholder: "Email or Phone Number", passwordPlaceholder: "Password",
        yourGroups: "Your Groups", searchGroups: "Search groups...",
        newGroup: "New Group", settings: "Settings", groups: "Groups",
        darkMode: "Dark mode", lightMode: "Light mode", language: "Language",
        notifications: "Notifications", logout: "Logout",
        addExpense: "Add Expense", itemName: "e.g. Electricity", whoPaid: "Who Paid?",
        amount: "Amount", confirmSplit: "Confirm Split",
        expenseHistory: "Expense History", settleUp: "Settle Up",
        noExpenses: "No expenses yet", tapToAdd: "Tap + to add one",
        allSettled: "All settled up!", settle: "Settle ✓", paid: "paid", owes: "owes",
        members: "members", expenses: "expenses",
        groupName: "e.g., Weekend Trip", groupMembers: "Add names (e.g. Sidra, Sania)",
        description: "What is this group for?", createGroup: "Create Group",
        noGroups: "No groups yet", tapToCreate: "Tap + to create your first group",
        groupNameLabel: "Group Name:", groupMembersLabel: "Group Members:",
        groupDescLabel: "Description (optional):", itemNameLabel: "Item Name:"
    },
    hindi: {
        hello: "नमस्ते, उपयोगकर्ता 👋", welcome: "Equapay में आपका स्वागत है", getStarted: "शुरू करें",
        tagline: "बिना तनाव के साझा खर्च प्रबंधित करें।",
        emailPlaceholder: "ईमेल या फोन नंबर", passwordPlaceholder: "पासवर्ड",
        yourGroups: "आपके समूह", searchGroups: "समूह खोजें...",
        newGroup: "नया समूह", settings: "सेटिंग्स", groups: "समूह",
        darkMode: "डार्क मोड", lightMode: "लाइट मोड", language: "भाषा",
        notifications: "सूचनाएं", logout: "लॉगआउट",
        addExpense: "खर्च जोड़ें", itemName: "जैसे बिजली", whoPaid: "किसने भुगतान किया?",
        amount: "राशि", confirmSplit: "विभाजन की पुष्टि करें",
        expenseHistory: "खर्च इतिहास", settleUp: "भुगतान करें",
        noExpenses: "अभी तक कोई खर्च नहीं", tapToAdd: "+ दबाएं जोड़ने के लिए",
        allSettled: "सब भुगतान हो गया!", settle: "भुगतान ✓", paid: "ने भुगतान किया", owes: "बकाया",
        members: "सदस्य", expenses: "खर्च",
        groupName: "जैसे, वीकेंड ट्रिप", groupMembers: "नाम जोड़ें",
        description: "यह समूह किसके लिए है?", createGroup: "समूह बनाएं",
        noGroups: "अभी कोई समूह नहीं", tapToCreate: "+ दबाएं पहला समूह बनाने के लिए",
        groupNameLabel: "समूह का नाम:", groupMembersLabel: "सदस्य:",
        groupDescLabel: "विवरण (वैकल्पिक):", itemNameLabel: "वस्तु का नाम:"
    },
    telugu: {
        hello: "హలో, వినియోగదారు 👋", welcome: "Equapay కి స్వాగతం", getStarted: "ప్రారంభించండి",
        tagline: "ఒత్తిడి లేకుండా భాగస్వామ్య ఖర్చులు నిర్వహించండి.",
        emailPlaceholder: "ఇమెయిల్ లేదా ఫోన్ నంబర్", passwordPlaceholder: "పాస్వర్డ్",
        yourGroups: "మీ గ్రూప్లు", searchGroups: "గ్రూప్లు వెతకండి...",
        newGroup: "కొత్త గ్రూప్", settings: "సెట్టింగులు", groups: "గ్రూప్లు",
        darkMode: "డార్క్ మోడ్", lightMode: "లైట్ మోడ్", language: "భాష",
        notifications: "నోటిఫికేషన్లు", logout: "లాగ్అవుట్",
        addExpense: "ఖర్చు జోడించండి", itemName: "ఉదా. విద్యుత్", whoPaid: "ఎవరు చెల్లించారు?",
        amount: "మొత్తం", confirmSplit: "విభజనను నిర్ధారించండి",
        expenseHistory: "ఖర్చుల చరిత్ర", settleUp: "సెటిల్ చేయండి",
        noExpenses: "ఇంకా ఖర్చులు లేవు", tapToAdd: "+ నొక్కి జోడించండి",
        allSettled: "అన్నీ చెల్లిపోయాయి!", settle: "సెటిల్ ✓", paid: "చెల్లించారు", owes: "బాకీ",
        members: "సభ్యులు", expenses: "ఖర్చులు",
        groupName: "ఉదా., వీకెండ్ ట్రిప్", groupMembers: "పేర్లు జోడించండి",
        description: "ఈ గ్రూప్ దేని కోసం?", createGroup: "గుంపును సృష్టించండి",
        noGroups: "ఇంకా గుంపులు లేవు", tapToCreate: "+ నొక్కి మీ మొదటి గుంపును సృష్టించండి",
        groupNameLabel: "గ్రూప్ పేరు:", groupMembersLabel: "గ్రూప్ సభ్యులు:",
        groupDescLabel: "వివరణ (ఐచ్ఛికం):", itemNameLabel: "వస్తువు పేరు:"
    },
    urdu: {
        hello: "ہیلو، صارف 👋", welcome: "Equapay میں خوش آمدید", getStarted: "شروع کریں",
        tagline: "بغیر تناؤ کے مشترکہ اخراجات کا انتظام کریں۔",
        emailPlaceholder: "ای میل یا فون نمبر", passwordPlaceholder: "پاس ورڈ",
        yourGroups: "آپ کے گروپ", searchGroups: "گروپ تلاش کریں...",
        newGroup: "نیا گروپ", settings: "ترتیبات", groups: "گروپ",
        darkMode: "ڈارک موڈ", lightMode: "لائٹ موڈ", language: "زبان",
        notifications: "اطلاعات", logout: "لاگ آؤٹ",
        addExpense: "خرچ شامل کریں", itemName: "مثلاً بجلی", whoPaid: "کس نے ادا کیا؟",
        amount: "رقم", confirmSplit: "تقسیم کی تصدیق کریں",
        expenseHistory: "خرچ کی تاریخ", settleUp: "ادائیگی کریں",
        noExpenses: "ابھی کوئی خرچ نہیں", tapToAdd: "+ دبائیں شامل کرنے کے لیے",
        allSettled: "سب ادا ہو گیا!", settle: "ادا کریں ✓", paid: "نے ادا کیا", owes: "مقروض",
        members: "اراکین", expenses: "اخراجات",
        groupName: "مثلاً، ویک اینڈ ٹرپ", groupMembers: "نام شامل کریں",
        description: "یہ گروپ کس لیے ہے?", createGroup: "گروپ بنائیں",
        noGroups: "ابھی کوئی گروپ نہیں", tapToCreate: "+ دبائیں پہلا گروپ بنانے کے لیے",
        groupNameLabel: "گروپ کا نام:", groupMembersLabel: "اراکین:",
        groupDescLabel: "تفصیل (اختیاری):", itemNameLabel: "چیز کا نام:"
    }
};

window.applyLanguage = function (lang) {
    currentLang = lang;
    const t = translations[lang];
    document.querySelector('.welcome-text h1').textContent = t.hello;
    document.querySelector('.welcome-text p').textContent = t.welcome;
    document.querySelector('.start-btn').textContent = t.getStarted;
    document.querySelector('.tagline').textContent = t.tagline;
    document.querySelector('#login input[type=text]').placeholder = t.emailPlaceholder;
    document.querySelector('#login input[type=password]').placeholder = t.passwordPlaceholder;
    document.querySelector('.section-title').textContent = t.yourGroups;
    document.querySelector('.search-bar').placeholder = t.searchGroups;
    document.querySelector('#addGroup h3').textContent = t.newGroup;
    document.querySelector('#groupInput').placeholder = t.groupName;
    document.querySelector('#groupMembers').placeholder = t.groupMembers;
    document.querySelector('#groupDesc').placeholder = t.description;
    document.querySelector('#addGroup .primary-btn').textContent = t.createGroup;
    document.querySelector('#addExpense h3').textContent = t.addExpense;
    document.querySelector('#expName').placeholder = t.itemName;
    document.querySelector('.amount-section p').textContent = t.amount;
    document.querySelector('#addExpense .primary-btn').textContent = t.confirmSplit;
    if (document.getElementById('whoPaidLabel')) document.getElementById('whoPaidLabel').textContent = t.whoPaid;
    if (document.getElementById('itemNameLabel')) document.getElementById('itemNameLabel').textContent = t.itemNameLabel;
    if (document.getElementById('groupNameLabel')) document.getElementById('groupNameLabel').textContent = t.groupNameLabel;
    if (document.getElementById('groupMembersLabel')) document.getElementById('groupMembersLabel').textContent = t.groupMembersLabel;
    if (document.getElementById('groupDescLabel')) document.getElementById('groupDescLabel').textContent = t.groupDescLabel;
    document.getElementById('sidebarSettings').textContent = t.settings;
    document.getElementById('sidebarGroups').textContent = t.groups;
    document.getElementById('sidebarDark').textContent = t.darkMode;
    document.getElementById('sidebarLight').textContent = t.lightMode;
    document.getElementById('sidebarLanguage').textContent = t.language;
    document.getElementById('sidebarNotif').innerHTML = t.notifications + ' <span class="float-right">ON</span>';
    document.getElementById('sidebarLogout').textContent = t.logout;
    document.querySelector('#noGroupsMsg p b').textContent = t.noGroups;
    document.querySelector('#noGroupsMsg .hint').textContent = t.tapToCreate;
    showLanguagePicker(false);
    renderDashboard();
    if (currentGroup) { renderChart(); renderExpenseLog(); }
    const splitLabels = {
    english: ['⚖️ Equal', '📊 Percent', '✏️ Exact', '🔢 Shares'],
    hindi: ['⚖️ बराबर', '📊 प्रतिशत', '✏️ सटीक', '🔢 हिस्से'],
    telugu: ['⚖️ సమాన', '📊 శాతం', '✏️ ఖచ్చితం', '🔢 వాటాలు'],
    urdu: ['⚖️ برابر', '📊 فیصد', '✏️ عین', '🔢 حصے']
};
const labels = splitLabels[lang] || splitLabels['english'];
['Equal','Percentage','Exact','Share'].forEach((type, i) => {
    const btn = document.getElementById('splitBtn' + type);
    if (btn) btn.textContent = labels[i];
    // Translate Split Type label in addExpense
if (document.getElementById('splitTypeLabel')) {
    const splitTypeNames = {
        english: 'Split Type', hindi: 'विभाजन प्रकार',
        telugu: 'విభజన రకం', urdu: 'تقسیم کی قسم'
    };
    document.getElementById('splitTypeLabel').textContent = splitTypeNames[lang] || 'Split Type';
}

// Translate Currency and Split type labels in sidebar
const currencyLabels = { english: 'Currency', hindi: 'मुद्रा', telugu: 'కరెన్సీ', urdu: 'کرنسی' };
const splitLabels2 = { english: 'Split type', hindi: 'विभाजन', telugu: 'విభజన', urdu: 'تقسیم' };
document.querySelector('#currencySelect').previousElementSibling.textContent = currencyLabels[lang] || 'Currency';
document.querySelector('#splitSelect').previousElementSibling.textContent = splitLabels2[lang] || 'Split type';
// Split dropdown options
const splitOptions = {
    english: ['Equal', 'Percentage', 'Exact Amount', 'By Shares'],
    hindi: ['बराबर', 'प्रतिशत', 'सटीक राशि', 'हिस्सों से'],
    telugu: ['సమాన', 'శాతం', 'ఖచ్చిత మొత్తం', 'వాటాల ద్వారా'],
    urdu: ['برابر', 'فیصد', 'عین رقم', 'حصوں سے']
};
const opts = splitOptions[lang] || splitOptions['english'];
['Equal','Percentage','Exact','Share'].forEach((id, i) => {
    const el = document.getElementById('opt' + id);
    if (el) el.textContent = opts[i];
});
});
};

// ============================================================
//  SECTION 10: UI HELPERS
// ============================================================
window.toggleNotifications = function () {
    const span = document.querySelector('#sidebarNotif span');
    span.textContent = span.textContent === 'ON' ? 'OFF' : 'ON';
};

window.showLanguagePicker = function (show) {
    document.getElementById('languagePicker').style.display = show ? 'block' : 'none';
};

window.changeCurrency = function (symbol) {
    currentCurrency = symbol;
    renderDashboard();
    if (currentGroup) { renderChart(); renderExpenseLog(); }
};

window.changeSplit = function (type) {
    currentSplitType = type;
};
// Search functionality
document.querySelector('.search-bar').oninput = function() {
    const query = this.value.toLowerCase();
    const cards = list.querySelectorAll('.expense-card');
    cards.forEach(card => {
        const name = card.querySelector('strong').textContent.toLowerCase();
        card.style.display = name.includes(query) ? 'flex' : 'none';
    });
};