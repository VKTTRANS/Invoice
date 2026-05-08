const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";
let allInvoiceData = [];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    
    if(pageId === 'dashboard') { document.getElementById('btn-dashboard').classList.add('active'); renderDashboard(); }
    if(pageId === 'add-invoice') document.getElementById('btn-add').classList.add('active');
    if(pageId === 'pending-invoice') { document.getElementById('btn-pending').classList.add('active'); renderPendingInvoices(); }
    if(pageId === 'history') { document.getElementById('btn-history').classList.add('active'); renderHistory(); }
}

window.onload = async function() {
    await fetchDropdowns();
    await fetchAllData();
};

async function fetchDropdowns() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getDropdowns`);
        const data = await res.json();
        const usedByList = document.getElementById('usedByList');
        if(data.users) { usedByList.innerHTML = ''; data.users.forEach(n => usedByList.innerHTML += `<option value="${n}">`); }
        const checkerList = document.getElementById('checkerList');
        if(data.checkers) { checkerList.innerHTML = ''; data.checkers.forEach(n => checkerList.innerHTML += `<option value="${n}">`); }
    } catch(e) { console.error("Dropdown error:", e); }
}

async function fetchAllData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getData`);
        allInvoiceData = await res.json();
        setupFilters();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-body').innerHTML = `<tr><td colspan="11" class="text-center text-red">โหลดข้อมูลล้มเหลว</td></tr>`;
    }
}

function setupFilters() {
    const yFilter = document.getElementById('yearFilter');
    const mFilter = document.getElementById('pendingMonthFilter');
    const years = new Set();
    const months = new Set();
    
    allInvoiceData.forEach(row => {
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) {
                years.add(d.getFullYear());
                // เก็บเดือนเฉพาะบิลที่ยังไม่จ่าย
                let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== ""));
                if(!isPaid && row["สถานะ"] !== "ยกเลิก") {
                    months.add(d.getMonth());
                }
            }
        }
    });

    // Year Filter
    yFilter.innerHTML = '';
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length === 0) yFilter.innerHTML = '<option value="all">ไม่มีข้อมูล</option>';
    else sortedYears.forEach(y => yFilter.innerHTML += `<option value="${y}">${y}</option>`);

    // Month Filter
    mFilter.innerHTML = '<option value="all">ทุกเดือนที่ค้าง</option>';
    Array.from(months).sort((a,b)=>a-b).forEach(m => mFilter.innerHTML += `<option value="${m}">${thaiMonths[m]}</option>`);
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const selectedYear = document.getElementById('yearFilter').value;
    const tbody = document.getElementById('dashboard-body');
    const tfoot = document.getElementById('dashboard-foot');
    if (allInvoiceData.length === 0) return;

    let mData = Array.from({length: 12}, (_, i) => ({
        month: thaiMonths[i], invCount: 0, boxFee: 0, transFee: 0, servFee: 0,
        totalIncome: 0, wh1: 0, wh3: 0, totalToPay: 0, paid: 0, balance: 0
    }));
    let t = { invCount: 0, boxFee: 0, transFee: 0, servFee: 0, totalIncome: 0, wh1: 0, wh3: 0, totalToPay: 0, paid: 0, balance: 0 };

    allInvoiceData.forEach(row => {
        if (row["สถานะ"] === "ยกเลิก") return;
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d) && d.getFullYear().toString() === selectedYear) {
                const m = d.getMonth();
                let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
                let income = f1 + f2 + f3;
                let w1 = Number(row["WH1%"]) || 0; let w3 = Number(row["WH3%"]) || 0;
                let toPay = income - w1 - w3;
                
                let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== ""));
                let paid = isPaid ? (Number(row["ยอดชำระ"]) || 0) : 0;
                let bal = toPay - paid;

                mData[m].invCount++; mData[m].boxFee += f1; mData[m].transFee += f2; mData[m].servFee += f3;
                mData[m].totalIncome += income; mData[m].wh1 += w1; mData[m].wh3 += w3;
                mData[m].totalToPay += toPay; mData[m].paid += paid; mData[m].balance += bal;

                t.invCount++; t.boxFee += f1; t.transFee += f2; t.servFee += f3;
                t.totalIncome += income; t.wh1 += w1; t.wh3 += w3;
                t.totalToPay += toPay; t.paid += paid; t.balance += bal;
            }
        }
    });

    const fmt = (num) => num.toLocaleString('en-US', {minimumFractionDigits: 2});
    tbody.innerHTML = '';
    mData.forEach(m => {
        let isZero = m.invCount === 0;
        let balClass = isZero ? 'text-gray' : (m.balance > 0.01 ? 'text-red' : '');
        tbody.innerHTML += `
            <tr class="${isZero ? 'text-gray' : ''}">
                <td class="text-center">${m.month}</td><td class="text-center">${m.invCount}</td>
                <td>${fmt(m.boxFee)}</td><td>${fmt(m.transFee)}</td><td>${fmt(m.servFee)}</td><td>${fmt(m.totalIncome)}</td>
                <td>${fmt(m.wh1)}</td><td>${fmt(m.wh3)}</td><td>${fmt(m.totalToPay)}</td>
                <td class="${isZero ? '' : 'text-green'}">${isZero ? '' : fmt(m.paid)}</td><td class="${balClass}">${isZero ? '' : fmt(m.balance)}</td>
            </tr>`;
    });
    tfoot.innerHTML = `<tr><td class="text-center">รวม</td><td class="text-center">${t.invCount}</td>
        <td>${fmt(t.boxFee)}</td><td>${fmt(t.transFee)}</td><td>${fmt(t.servFee)}</td><td>${fmt(t.totalIncome)}</td>
        <td>${fmt(t.wh1)}</td><td>${fmt(t.wh3)}</td><td>${fmt(t.totalToPay)}</td>
        <td class="text-green">${fmt(t.paid)}</td><td class="text-red">${fmt(t.balance)}</td></tr>`;
}

// ==================== PENDING INVOICES (รายการค้างชำระ) ====================
function renderPendingInvoices() {
    const tbody = document.getElementById('pending-body');
    const selectedMonth = document.getElementById('pendingMonthFilter').value;
    tbody.innerHTML = '';

    let pendingData = allInvoiceData.filter(row => {
        let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== ""));
        if(isPaid || row["สถานะ"] === "ยกเลิก") return false;
        
        if (selectedMonth !== "all" && row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            return d.getMonth().toString() === selectedMonth;
        }
        return true;
    });

    if (pendingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-green">เย้! ไม่มีบิลค้างชำระ</td></tr>';
        return;
    }

    pendingData.forEach(row => {
        let dateStr = '-';
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if(!isNaN(d)) dateStr = d.toLocaleDateString('th-TH');
        }
        
        let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
        let income = f1 + f2 + f3;
        
        tbody.innerHTML += `
            <tr>
                <td class="text-left"><strong>${row["Invoice No."]}</strong></td>
                <td class="text-left">${row["ชื่อลูกค้า"]}</td>
                <td class="text-center">${dateStr}</td>
                <td>${income.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                <td class="text-center">
                    <button class="action-btn" onclick="openPaymentModal('${row["Invoice No."]}')">รับชำระเงิน</button>
                </td>
            </tr>`;
    });
}

// ==================== HISTORY ====================
function renderHistory() {
    const tbody = document.getElementById('history-body');
    if (allInvoiceData.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray">ไม่พบข้อมูล</td></tr>'; return; }
    tbody.innerHTML = '';
    [...allInvoiceData].reverse().forEach(row => {
        let dateStr = row["วันที่ใช้งาน"] ? new Date(row["วันที่ใช้งาน"]).toLocaleDateString('th-TH') : '-';
        let isPaid = row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "");
        let displayStatus = row["สถานะ"] || (isPaid ? 'รับชำระแล้ว' : 'ปกติ');
        let total = isPaid ? (Number(row["ยอดชำระ"]) || 0).toLocaleString('th-TH', {minimumFractionDigits: 2}) : '-';
        let statusClass = displayStatus === 'ยกเลิก' ? 'text-red' : (displayStatus === 'รับชำระแล้ว' ? 'text-green' : '');
        tbody.innerHTML += `<tr><td class="text-left">${row["Invoice No."]}</td><td class="text-left">${row["ชื่อลูกค้า"]}</td>
            <td class="text-center">${dateStr}</td><td>${total}</td><td class="text-center"><span class="${statusClass}">${displayStatus}</span></td></tr>`;
    });
}

// ==================== CREATE NEW INVOICE ====================
document.getElementById('invoiceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('message');
    btn.disabled = true; btn.innerText = 'กำลังบันทึก...'; msg.className = 'msg'; msg.innerText = '';

    const payload = {
        action: 'add',
        invoiceNo: document.getElementById('invoiceNo').value, customer: document.getElementById('customer').value,
        useDate: document.getElementById('useDate').value, usedBy: document.getElementById('usedBy').value,
        details: document.getElementById('details').value, fee1: document.getElementById('fee1').value,
        fee2: document.getElementById('fee2').value, fee3: document.getElementById('fee3').value,
        status: 'ปกติ'
    };

    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') {
            msg.classList.add('success'); msg.innerText = result.message;
            document.getElementById('invoiceForm').reset();
            fetchAllData(); // โหลดข้อมูลใหม่
        } else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (error) { msg.classList.add('error'); msg.innerText = "Error: " + error.message; } 
    finally { btn.disabled = false; btn.innerText = 'สร้างบิลใหม่'; }
});

// ==================== PAYMENT MODAL (อัปเดตชำระเงิน) ====================
function openPaymentModal(invNo) {
    const row = allInvoiceData.find(r => r["Invoice No."] === invNo);
    if(!row) return;
    
    document.getElementById('modal-invNo').innerText = row["Invoice No."];
    document.getElementById('modal-customer').innerText = row["ชื่อลูกค้า"];
    document.getElementById('pay-invNo').value = row["Invoice No."];
    
    // ตั้งค่า Default ยอดเงินให้ตรงกับที่ลงไว้ตอนแรก
    let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
    let income = f1 + f2 + f3;
    document.getElementById('pay-totalPay').value = income.toFixed(2);
    
    // Set Today for dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pay-payDate').value = today;
    document.getElementById('pay-csDate').value = today;

    document.getElementById('paymentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('paymentForm').reset();
    document.getElementById('modal-message').className = 'msg';
    document.getElementById('modal-message').innerText = '';
    document.getElementById('pay-cancelGroup').style.display = 'none';
}

function toggleModalCancel() {
    const status = document.getElementById('pay-status').value;
    const group = document.getElementById('pay-cancelGroup');
    const input = document.getElementById('pay-cancelReason');
    if (status === 'ยกเลิก') { group.style.display = 'block'; input.required = true; } 
    else { group.style.display = 'none'; input.required = false; input.value = ''; }
}

document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-paySubmit');
    const msg = document.getElementById('modal-message');
    btn.disabled = true; btn.innerText = 'กำลังบันทึก...'; msg.className = 'msg'; msg.innerText = '';

    const payload = {
        action: 'update',
        invoiceNo: document.getElementById('pay-invNo').value,
        csDate: document.getElementById('pay-csDate').value,
        payDate: document.getElementById('pay-payDate').value,
        wh1: document.getElementById('pay-wh1').value,
        wh3: document.getElementById('pay-wh3').value,
        totalPay: document.getElementById('pay-totalPay').value,
        checker: document.getElementById('pay-checker').value,
        status: document.getElementById('pay-status').value,
        cancelReason: document.getElementById('pay-cancelReason').value
    };

    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') {
            msg.classList.add('success'); msg.innerText = result.message;
            setTimeout(() => { closeModal(); fetchAllData(); showPage('pending-invoice'); }, 1000);
        } else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (error) { msg.classList.add('error'); msg.innerText = "Error: " + error.message; } 
    finally { btn.disabled = false; btn.innerText = 'บันทึกชำระเงิน'; }
});
