const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";
let allInvoiceData = [];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    if(pageId === 'dashboard') { document.getElementById('btn-dashboard').classList.add('active'); renderDashboard(); }
    if(pageId === 'manage') { document.getElementById('btn-manage').classList.add('active'); renderManageInvoices(); }
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
        const uList = document.getElementById('usedByList');
        if(data.users) { uList.innerHTML = ''; data.users.forEach(n => uList.innerHTML += `<option value="${n}">`); }
        const cList = document.getElementById('checkerList');
        if(data.checkers) { cList.innerHTML = ''; data.checkers.forEach(n => cList.innerHTML += `<option value="${n}">`); }
    } catch(e) { console.error("CORS / Network Error:", e); }
}

async function fetchAllData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getData`);
        allInvoiceData = await res.json();
        setupFilters();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-body').innerHTML = `<tr><td colspan="11" class="text-center text-red">โหลดข้อมูลล้มเหลว ตรวจสอบการ Deploy Google Script</td></tr>`;
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
                let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== ""));
                if(!isPaid && row["สถานะ"] !== "ยกเลิก") months.add(d.getMonth());
            }
        }
    });

    yFilter.innerHTML = '';
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length === 0) yFilter.innerHTML = '<option value="all">ไม่มีข้อมูล</option>';
    else sortedYears.forEach(y => yFilter.innerHTML += `<option value="${y}">${y}</option>`);

    mFilter.innerHTML = '<option value="all">ทุกเดือนที่ค้าง</option>';
    Array.from(months).sort((a,b)=>a-b).forEach(m => mFilter.innerHTML += `<option value="${m}">${thaiMonths[m]}</option>`);
}

// ระบบคำนวณภาษีอัติโนมัติ
function calculateAddTaxes() {
    let f1 = Number(document.getElementById('add-fee1').value) || 0; // ไม่หัก
    let f2 = Number(document.getElementById('add-fee2').value) || 0; // หัก 1%
    let f3 = Number(document.getElementById('add-fee3').value) || 0; // หัก 3%
    
    let wh1 = f2 * 0.01;
    let wh3 = f3 * 0.03;
    let netPay = (f1 + f2 + f3) - wh1 - wh3;

    document.getElementById('add-wh1').value = wh1.toFixed(2);
    document.getElementById('add-wh3').value = wh3.toFixed(2);
    document.getElementById('add-totalPay').value = netPay.toFixed(2);
}
['add-fee1', 'add-fee2', 'add-fee3'].forEach(id => document.getElementById(id).addEventListener('input', calculateAddTaxes));

function renderDashboard() {
    const selectedYear = document.getElementById('yearFilter').value;
    const tbody = document.getElementById('dashboard-body');
    const tfoot = document.getElementById('dashboard-foot');
    if (allInvoiceData.length === 0) return;

    let mData = Array.from({length: 12}, (_, i) => ({ month: thaiMonths[i], count: 0, f1: 0, f2: 0, f3: 0, inc: 0, w1: 0, w3: 0, toPay: 0, paid: 0, bal: 0 }));
    let t = { count: 0, f1: 0, f2: 0, f3: 0, inc: 0, w1: 0, w3: 0, toPay: 0, paid: 0, bal: 0 };

    allInvoiceData.forEach(row => {
        if (row["สถานะ"] === "ยกเลิก") return;
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d) && d.getFullYear().toString() === selectedYear) {
                const m = d.getMonth();
                let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
                let inc = f1 + f2 + f3;
                let w1 = Number(row["WH1%"]) || 0; let w3 = Number(row["WH3%"]) || 0;
                let toPay = inc - w1 - w3;
                
                let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || (row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== ""));
                let paid = isPaid ? (Number(row["ยอดชำระ"]) || 0) : 0;
                let bal = toPay - paid;

                mData[m].count++; mData[m].f1 += f1; mData[m].f2 += f2; mData[m].f3 += f3; mData[m].inc += inc; mData[m].w1 += w1; mData[m].w3 += w3; mData[m].toPay += toPay; mData[m].paid += paid; mData[m].bal += bal;
                t.count++; t.f1 += f1; t.f2 += f2; t.f3 += f3; t.inc += inc; t.w1 += w1; t.w3 += w3; t.toPay += toPay; t.paid += paid; t.bal += bal;
            }
        }
    });

    const fmt = (n) => n.toLocaleString('en-US', {minimumFractionDigits: 2});
    tbody.innerHTML = '';
    mData.forEach(m => {
        let z = m.count === 0; let bc = z ? 'text-gray' : (m.bal > 0.01 ? 'text-red' : '');
        tbody.innerHTML += `<tr class="${z ? 'text-gray' : ''}"><td class="text-center">${m.month}</td><td class="text-center">${m.count}</td>
            <td>${fmt(m.f1)}</td><td>${fmt(m.f2)}</td><td>${fmt(m.f3)}</td><td>${fmt(m.inc)}</td><td>${fmt(m.w1)}</td><td>${fmt(m.w3)}</td><td>${fmt(m.toPay)}</td>
            <td class="${z ? '' : 'text-green'}">${z ? '' : fmt(m.paid)}</td><td class="${bc}">${z ? '' : fmt(m.bal)}</td></tr>`;
    });
    tfoot.innerHTML = `<tr><td class="text-center">รวม</td><td class="text-center">${t.count}</td><td>${fmt(t.f1)}</td><td>${fmt(t.f2)}</td><td>${fmt(t.f3)}</td><td>${fmt(t.inc)}</td><td>${fmt(t.w1)}</td><td>${fmt(t.w3)}</td><td>${fmt(t.toPay)}</td><td class="text-green">${fmt(t.paid)}</td><td class="text-red">${fmt(t.bal)}</td></tr>`;
}

function renderManageInvoices() {
    const tbody = document.getElementById('manage-body');
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

    if (pendingData.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-green">ไม่มีบิลค้างชำระ</td></tr>'; return; }

    pendingData.forEach(row => {
        let dateStr = row["วันที่ใช้งาน"] ? new Date(row["วันที่ใช้งาน"]).toLocaleDateString('th-TH') : '-';
        let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
        let w1 = Number(row["WH1%"]) || 0; let w3 = Number(row["WH3%"]) || 0;
        let net = (f1 + f2 + f3) - w1 - w3;
        
        tbody.innerHTML += `<tr>
            <td class="text-left"><strong>${row["Invoice No."]}</strong></td><td class="text-left">${row["ชื่อลูกค้า"]}</td><td class="text-center">${dateStr}</td><td class="text-center">${row["ใช้โดย"]}</td>
            <td>${f1.toLocaleString('en-US', {minimumFractionDigits: 2})}</td><td>${f2.toLocaleString('en-US', {minimumFractionDigits: 2})}</td><td>${f3.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="text-red" style="font-weight:bold;">${net.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="text-center"><button class="action-btn" onclick="openPaymentModal('${row["Invoice No."]}')">รับชำระ</button></td></tr>`;
    });
}

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

function openAddModal() { document.getElementById('addModal').style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

document.getElementById('invoiceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-addSubmit'); const msg = document.getElementById('add-message');
    btn.disabled = true; btn.innerText = 'กำลังบันทึก...'; msg.className = 'msg'; msg.innerText = '';
    const payload = {
        action: 'add', invoiceNo: document.getElementById('add-invoiceNo').value, customer: document.getElementById('add-customer').value,
        useDate: document.getElementById('add-useDate').value, usedBy: document.getElementById('add-usedBy').value, details: document.getElementById('add-details').value,
        fee1: document.getElementById('add-fee1').value, fee2: document.getElementById('add-fee2').value, fee3: document.getElementById('add-fee3').value,
        csDate: document.getElementById('add-csDate').value, payDate: document.getElementById('add-payDate').value,
        wh1: document.getElementById('add-wh1').value, wh3: document.getElementById('add-wh3').value, totalPay: document.getElementById('add-totalPay').value,
        status: document.getElementById('add-status').value
    };
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') { msg.classList.add('success'); msg.innerText = result.message; document.getElementById('invoiceForm').reset(); setTimeout(() => { closeModal('addModal'); fetchAllData(); }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = "Error: " + err.message; } finally { btn.disabled = false; btn.innerText = 'สร้างบิลใหม่'; }
});

function openPaymentModal(invNo) {
    const row = allInvoiceData.find(r => r["Invoice No."] === invNo);
    if(!row) return;
    document.getElementById('modal-invNo').innerText = row["Invoice No."]; document.getElementById('modal-customer').innerText = row["ชื่อลูกค้า"];
    document.getElementById('pay-invNo').value = row["Invoice No."];
    
    let f1 = Number(row["ค่าตู้"]) || 0; let f2 = Number(row["ค่าเที่ยว"]) || 0; let f3 = Number(row["ค่าบริการ"]) || 0;
    let wh1 = f2 * 0.01; let wh3 = f3 * 0.03; let total = (f1 + f2 + f3) - wh1 - wh3;
    
    document.getElementById('pay-wh1').value = wh1.toFixed(2); document.getElementById('pay-wh3').value = wh3.toFixed(2); document.getElementById('pay-totalPay').value = total.toFixed(2);
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pay-payDate').value = today; document.getElementById('pay-csDate').value = today;
    document.getElementById('paymentModal').style.display = 'flex';
}

function toggleModalCancel() {
    const status = document.getElementById('pay-status').value; const group = document.getElementById('pay-cancelGroup'); const input = document.getElementById('pay-cancelReason');
    if (status === 'ยกเลิก') { group.style.display = 'block'; input.required = true; } else { group.style.display = 'none'; input.required = false; input.value = ''; }
}

document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-paySubmit'); const msg = document.getElementById('modal-message');
    btn.disabled = true; btn.innerText = 'กำลังบันทึก...'; msg.className = 'msg'; msg.innerText = '';
    const payload = {
        action: 'update', invoiceNo: document.getElementById('pay-invNo').value, csDate: document.getElementById('pay-csDate').value, payDate: document.getElementById('pay-payDate').value,
        wh1: document.getElementById('pay-wh1').value, wh3: document.getElementById('pay-wh3').value, totalPay: document.getElementById('pay-totalPay').value,
        checker: document.getElementById('pay-checker').value, status: document.getElementById('pay-status').value, cancelReason: document.getElementById('pay-cancelReason').value
    };
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') { msg.classList.add('success'); msg.innerText = result.message; setTimeout(() => { closeModal('paymentModal'); fetchAllData(); showPage('manage'); }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = "Error: " + err.message; } finally { btn.disabled = false; btn.innerText = 'บันทึกชำระเงิน'; }
});
