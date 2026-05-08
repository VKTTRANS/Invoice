const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";
let allInvoiceData = [];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

let sortCol = 'Invoice No.';
let sortAsc = true; 
let currentPage = 1;

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    if(pageId === 'dashboard') { document.getElementById('btn-dashboard').classList.add('active'); renderDashboard(); }
    if(pageId === 'manage') { 
        document.getElementById('btn-manage').classList.add('active'); 
        setInitialFilter(); 
        renderManageInvoices(); 
    }
}

function setInitialFilter() {
    const fltM = document.getElementById('flt-month');
    const fltY = document.getElementById('flt-year');
    if(fltM && fltM.value === "" || fltM.value === "all") {
        const now = new Date();
        fltM.value = now.getMonth().toString();
        fltY.value = now.getFullYear().toString();
    }
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
        if(data.users && uList) { uList.innerHTML = ''; data.users.forEach(n => uList.innerHTML += `<option value="${n}">`); }
        const cList = document.getElementById('checkerList');
        if(data.checkers && cList) { cList.innerHTML = ''; data.checkers.forEach(n => cList.innerHTML += `<option value="${n}">`); }
    } catch(e) { console.error(e); }
}

async function fetchAllData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getData`);
        allInvoiceData = await res.json();
        setupFilters();
        renderDashboard();
        setInitialFilter();
        renderManageInvoices();
    } catch (error) {
        console.error(error);
    }
}

function setupFilters() {
    const yFilter = document.getElementById('yearFilter');
    const fltY = document.getElementById('flt-year');
    const fltM = document.getElementById('flt-month');
    const fltD = document.getElementById('flt-day');
    const fltU = document.getElementById('flt-user');
    const fltS = document.getElementById('flt-status');

    const years = new Set(), months = new Set(), days = new Set(), users = new Set(), statuses = new Set();
    allInvoiceData.forEach(row => {
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) { years.add(d.getFullYear()); days.add(d.getDate()); }
        }
        if (row["ใช้โดย"]) users.add(row["ใช้โดย"]);
        let ds = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        statuses.add(ds);
    });

    yFilter.innerHTML = fltY.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        yFilter.innerHTML += `<option value="${y}">${y}</option>`;
        fltY.innerHTML += `<option value="${y}">${y}</option>`;
    });

    fltM.innerHTML = '<option value="all">ทั้งหมด</option>';
    thaiMonths.forEach((m, i) => fltM.innerHTML += `<option value="${i}">${m}</option>`);

    fltD.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(days).sort((a,b)=>a-b).forEach(d => fltD.innerHTML += `<option value="${d}">${d}</option>`);

    fltU.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(users).sort().forEach(u => fltU.innerHTML += `<option value="${u}">${u}</option>`);

    fltS.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(statuses).sort().forEach(s => fltS.innerHTML += `<option value="${s}">${s}</option>`);
    
    const now = new Date();
    if(yFilter.options.length > 1) yFilter.value = now.getFullYear().toString();
}

function resetFilters() {
    document.getElementById('flt-year').value = 'all'; 
    document.getElementById('flt-month').value = 'all';
    document.getElementById('flt-day').value = 'all'; 
    document.getElementById('flt-user').value = 'all';
    document.getElementById('flt-status').value = 'all'; 
    document.getElementById('flt-search').value = '';
    resetPageAndRender();
}

function calculateTaxes(prefix) {
    let f1 = Number(document.getElementById(`${prefix}-fee1`).value) || 0; 
    let f2 = Number(document.getElementById(`${prefix}-fee2`).value) || 0; 
    let f3 = Number(document.getElementById(`${prefix}-fee3`).value) || 0; 
    let wh1 = f2 * 0.01; let wh3 = f3 * 0.03;
    let netPay = (f1 + f2 + f3) - wh1 - wh3;
    document.getElementById(`${prefix}-wh1`).value = wh1.toFixed(2);
    document.getElementById(`${prefix}-wh3`).value = wh3.toFixed(2);
    document.getElementById(`${prefix}-totalPay`).value = netPay.toFixed(2);
}
['add-fee1', 'add-fee2', 'add-fee3'].forEach(id => document.getElementById(id)?.addEventListener('input', () => calculateTaxes('add')));
['det-fee1', 'det-fee2', 'det-fee3'].forEach(id => document.getElementById(id)?.addEventListener('input', () => calculateTaxes('det')));

// ฟีเจอร์ใหม่: ถ้าใส่วันที่รับชำระ ให้ปรับสถานะเป็นรับชำระแล้วอัตโนมัติ
document.getElementById('det-payDate')?.addEventListener('change', function() {
    const statusField = document.getElementById('det-status');
    if (this.value !== "" && statusField.value === "ปกติ") {
        statusField.value = "รับชำระแล้ว";
    }
    toggleDetCancel();
});
document.getElementById('add-payDate')?.addEventListener('change', function() {
    const statusField = document.getElementById('add-status');
    if (this.value !== "" && statusField.value === "ปกติ") {
        statusField.value = "รับชำระแล้ว";
    }
});

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
            if (!isNaN(d) && (selectedYear === "all" || d.getFullYear().toString() === selectedYear)) {
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

function sortTable(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }
    resetPageAndRender();
}

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        let text = th.innerText.replace(/ ▲| ▼/g, '');
        if (th.id === `th-${sortCol}`) th.innerHTML = `${text} <span class="sort-icon">${sortAsc ? '▲' : '▼'}</span>`;
        else th.innerHTML = text;
    });
}

function resetPageAndRender() { currentPage = 1; renderManageInvoices(); }
function changePage(dir) { currentPage += dir; renderManageInvoices(); }

function renderManageInvoices() {
    const tbody = document.getElementById('manage-body');
    if(!tbody) return; 
    const fYear = document.getElementById('flt-year').value;
    const fMonth = document.getElementById('flt-month').value;
    const fDay = document.getElementById('flt-day').value;
    const fUser = document.getElementById('flt-user').value;
    const fSearch = document.getElementById('flt-search').value.toLowerCase();
    const fStat = document.getElementById('flt-status').value;

    let filteredData = allInvoiceData.filter(row => {
        let match = true;
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) {
                if (fYear !== "all" && d.getFullYear().toString() !== fYear) match = false;
                if (fMonth !== "all" && d.getMonth().toString() !== fMonth) match = false;
                if (fDay !== "all" && d.getDate().toString() !== fDay) match = false;
            } else if (fYear !== "all" || fMonth !== "all" || fDay !== "all") match = false;
        } else if (fYear !== "all" || fMonth !== "all" || fDay !== "all") match = false;
        if (fUser !== "all" && row["ใช้โดย"] !== fUser) match = false;
        if (fSearch !== "") {
            let cm = (row["ชื่อลูกค้า"] && row["ชื่อลูกค้า"].toLowerCase().includes(fSearch));
            let im = (row["Invoice No."] && String(row["Invoice No."]).toLowerCase().includes(fSearch));
            if (!cm && !im) match = false;
        }
        let ds = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        if (fStat !== "all" && ds !== fStat) match = false;
        return match;
    });

    document.getElementById('total-records-count').innerText = `(พบ ${filteredData.length} รายการ)`;
    updateSortIcons();

    filteredData.sort((a, b) => {
        let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
        if (['วันที่ใช้งาน', 'วันที่รับยอด CS', 'วันที่ได้รับชำระ'].includes(sortCol)) {
            valA = valA ? new Date(valA).getTime() : 0; valB = valB ? new Date(valB).getTime() : 0;
        } else if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            valA = Number(valA); valB = Number(valB);
        } else {
            valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    const rowsPerPageVal = document.getElementById('rowsPerPage').value;
    const rpp = rowsPerPageVal === 'all' ? filteredData.length : Number(rowsPerPageVal);
    const totalPages = Math.ceil(filteredData.length / rpp) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * rpp;
    const paginatedData = filteredData.slice(startIdx, startIdx + rpp);

    const pc = document.getElementById('pagination-controls');
    if (rowsPerPageVal === 'all' || filteredData.length === 0) pc.style.display = 'none';
    else {
        pc.style.display = 'flex';
        document.getElementById('page-indicator').innerText = `หน้า ${currentPage} / ${totalPages}`;
        document.getElementById('btn-prev-page').disabled = (currentPage === 1);
        document.getElementById('btn-next-page').disabled = (currentPage === totalPages);
    }

    tbody.innerHTML = '';
    if (paginatedData.length === 0) { tbody.innerHTML = '<tr><td colspan="15" class="text-center text-red">ไม่พบข้อมูล</td></tr>'; return; }
    const fmt = (n) => Number(n || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

    paginatedData.forEach(row => {
        let du = row["วันที่ใช้งาน"] ? new Date(row["วันที่ใช้งาน"]).toLocaleDateString('th-TH') : '';
        let dcs = row["วันที่รับยอด CS"] ? new Date(row["วันที่รับยอด CS"]).toLocaleDateString('th-TH') : '';
        let dp = row["วันที่ได้รับชำระ"] ? new Date(row["วันที่ได้รับชำระ"]).toLocaleDateString('th-TH') : '';
        let ds = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        let sc = ds === 'ยกเลิก' ? 'text-red' : (ds === 'รับชำระแล้ว' ? 'text-green' : '');

        tbody.innerHTML += `<tr class="clickable-row" onclick="openDetailModal('${row["Invoice No."]}')">
            <td class="text-center">${row["No."]}</td>
            <td class="text-left" style="color:#2563eb; font-weight:bold;">${row["Invoice No."]}</td>
            <td class="text-left">${row["ชื่อลูกค้า"]}</td>
            <td class="text-center">${du}</td>
            <td class="text-center">${row["ใช้โดย"]}</td>
            <td class="detail-col">${row["รายละเอียด"] || ''}</td>
            <td>${fmt(row["ค่าตู้"])}</td>
            <td>${fmt(row["ค่าเที่ยว"])}</td>
            <td>${fmt(row["ค่าบริการ"])}</td>
            <td class="text-center">${dcs}</td>
            <td class="text-center">${dp}</td>
            <td>${fmt(row["WH1%"])}</td>
            <td>${fmt(row["WH3%"])}</td>
            <td style="font-weight:bold;">${fmt(row["ยอดชำระ"])}</td>
            <td class="text-center"><span class="${sc}">${ds}</span></td>
        </tr>`;
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
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const data = await res.json();
        if (data.status === 'success') { 
            msg.classList.add('success'); msg.innerText = data.message; 
            document.getElementById('invoiceForm').reset(); 
            setTimeout(() => { closeModal('addModal'); fetchAllData(); msg.innerText='';}, 1000); 
        } else { msg.classList.add('error'); msg.innerText = data.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = err.message; } 
    finally { btn.disabled = false; btn.innerText = '💾 สร้างบิลใหม่'; }
});

function openDetailModal(invNo) {
    const row = allInvoiceData.find(r => String(r["Invoice No."]) === String(invNo));
    if(!row) return;
    document.getElementById('det-oldInvNo').value = row["Invoice No."];
    document.getElementById('det-invoiceNo').value = row["Invoice No."];
    document.getElementById('det-customer').value = row["ชื่อลูกค้า"];
    document.getElementById('det-usedBy').value = row["ใช้โดย"];
    document.getElementById('det-details').value = row["รายละเอียด"] || "";
    document.getElementById('det-fee1').value = Number(row["ค่าตู้"]) || 0;
    document.getElementById('det-fee2').value = Number(row["ค่าเที่ยว"]) || 0;
    document.getElementById('det-fee3').value = Number(row["ค่าบริการ"]) || 0;
    const sd = (v) => v ? new Date(v).toISOString().split('T')[0] : "";
    document.getElementById('det-useDate').value = sd(row["วันที่ใช้งาน"]);
    document.getElementById('det-csDate').value = sd(row["วันที่รับยอด CS"]);
    document.getElementById('det-payDate').value = sd(row["วันที่ได้รับชำระ"]);
    document.getElementById('det-checker').value = row["ผู้บันทึกการรับยอด"] || "";
    document.getElementById('det-status').value = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
    document.getElementById('det-cancelReason').value = row["สาเหตุที่ยกเลิก"] || "";
    calculateTaxes('det'); toggleDetCancel();
    document.getElementById('detailModal').style.display = 'flex';
}

function toggleDetCancel() {
    const s = document.getElementById('det-status').value; const g = document.getElementById('det-cancelGroup');
    if (s === 'ยกเลิก') { g.style.display = 'block'; document.getElementById('det-cancelReason').required = true; } 
    else { g.style.display = 'none'; document.getElementById('det-cancelReason').required = false; }
}

async function deleteInvoice() {
    if(!confirm("⚠️ ยืนยันการลบ Invoice?")) return;
    const invNo = document.getElementById('det-oldInvNo').value;
    const btn = document.getElementById('btn-detSubmit'); const msg = document.getElementById('det-message');
    btn.disabled = true; msg.className = 'msg'; msg.innerText = 'กำลังลบ...'; msg.style.display = 'block';
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({action: 'delete', invoiceNo: invNo}), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const data = await res.json();
        if (data.status === 'success') { msg.classList.add('success'); msg.innerText = data.message; setTimeout(() => { closeModal('detailModal'); fetchAllData(); msg.innerText='';}, 1000); } 
        else { msg.classList.add('error'); msg.innerText = data.message; btn.disabled = false;}
    } catch (err) { msg.classList.add('error'); msg.innerText = err.message; btn.disabled = false;}
}

document.getElementById('detailForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-detSubmit'); const msg = document.getElementById('det-message');
    btn.disabled = true; btn.innerText = 'กำลังบันทึก...'; msg.className = 'msg'; msg.innerText = '';
    const payload = {
        action: 'update', oldInvoiceNo: document.getElementById('det-oldInvNo').value,
        invoiceNo: document.getElementById('det-invoiceNo').value, customer: document.getElementById('det-customer').value,
        useDate: document.getElementById('det-useDate').value, usedBy: document.getElementById('det-usedBy').value, details: document.getElementById('det-details').value,
        fee1: document.getElementById('det-fee1').value, fee2: document.getElementById('det-fee2').value, fee3: document.getElementById('det-fee3').value,
        csDate: document.getElementById('det-csDate').value, payDate: document.getElementById('det-payDate').value,
        wh1: document.getElementById('det-wh1').value, wh3: document.getElementById('det-wh3').value, totalPay: document.getElementById('det-totalPay').value,
        checker: document.getElementById('det-checker').value, status: document.getElementById('det-status').value, cancelReason: document.getElementById('det-cancelReason').value
    };
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const data = await res.json();
        if (data.status === 'success') { msg.classList.add('success'); msg.innerText = data.message; setTimeout(() => { closeModal('detailModal'); fetchAllData(); msg.innerText=''; }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = data.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = err.message; } 
    finally { btn.disabled = false; btn.innerText = '💾 บันทึกแก้ไข'; }
});
