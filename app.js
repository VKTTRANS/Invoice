const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";
let allInvoiceData = [];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// สถานะการเรียงลำดับและแบ่งหน้า
let sortCol = 'No.';
let sortAsc = false; // ค่า Default: มากไปน้อย (ล่าสุดอยู่บน)
let currentPage = 1;

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    if(pageId === 'dashboard') { document.getElementById('btn-dashboard').classList.add('active'); renderDashboard(); }
    if(pageId === 'manage') { document.getElementById('btn-manage').classList.add('active'); resetPageAndRender(); }
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
    } catch(e) { console.error("Dropdown Fetch Note:", e); }
}

async function fetchAllData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getData`);
        allInvoiceData = await res.json();
        setupFilters();
        renderDashboard();
        resetPageAndRender();
    } catch (error) {
        const dBody = document.getElementById('dashboard-body');
        if(dBody) dBody.innerHTML = `<tr><td colspan="11" class="text-center text-red">โหลดข้อมูลล้มเหลว ตรวจสอบการ Deploy Google Script</td></tr>`;
    }
}

function setupFilters() {
    const yFilter = document.getElementById('yearFilter'); const fltY = document.getElementById('flt-year');
    const fltM = document.getElementById('flt-month'); const fltD = document.getElementById('flt-day');
    const fltU = document.getElementById('flt-user'); const fltS = document.getElementById('flt-status');
    if(!yFilter || !fltY) return; 

    const years = new Set(), months = new Set(), days = new Set(), users = new Set(), statuses = new Set();
    
    allInvoiceData.forEach(row => {
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) { years.add(d.getFullYear()); months.add(d.getMonth()); days.add(d.getDate()); }
        }
        if (row["ใช้โดย"]) users.add(row["ใช้โดย"]);
        let displayStatus = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        statuses.add(displayStatus);
    });

    yFilter.innerHTML = fltY.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => { yFilter.innerHTML += `<option value="${y}">${y}</option>`; fltY.innerHTML += `<option value="${y}">${y}</option>`; });
    
    fltM.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(months).sort((a,b)=>a-b).forEach(m => fltM.innerHTML += `<option value="${m}">${thaiMonths[m]}</option>`);

    fltD.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(days).sort((a,b)=>a-b).forEach(d => fltD.innerHTML += `<option value="${d}">${d}</option>`);

    fltU.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(users).sort().forEach(u => fltU.innerHTML += `<option value="${u}">${u}</option>`);

    fltS.innerHTML = '<option value="all">ทั้งหมด</option>';
    Array.from(statuses).sort().forEach(s => fltS.innerHTML += `<option value="${s}">${s}</option>`);
    
    if(yFilter.options.length > 1) { yFilter.value = Array.from(years).sort((a, b) => b - a)[0]; }
}

function resetFilters() {
    document.getElementById('flt-year').value = 'all'; document.getElementById('flt-month').value = 'all';
    document.getElementById('flt-day').value = 'all'; document.getElementById('flt-user').value = 'all';
    document.getElementById('flt-status').value = 'all'; document.getElementById('flt-search').value = '';
    resetPageAndRender();
}

function calculateTaxes(prefix) {
    let f1 = Number(document.getElementById(`${prefix}-fee1`).value) || 0; // ไม่หัก
    let f2 = Number(document.getElementById(`${prefix}-fee2`).value) || 0; // หัก 1%
    let f3 = Number(document.getElementById(`${prefix}-fee3`).value) || 0; // หัก 3%
    let wh1 = f2 * 0.01; let wh3 = f3 * 0.03;
    let netPay = (f1 + f2 + f3) - wh1 - wh3;
    document.getElementById(`${prefix}-wh1`).value = wh1.toFixed(2);
    document.getElementById(`${prefix}-wh3`).value = wh3.toFixed(2);
    document.getElementById(`${prefix}-totalPay`).value = netPay.toFixed(2);
}
['add-fee1', 'add-fee2', 'add-fee3'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('input', () => calculateTaxes('add')); });
['det-fee1', 'det-fee2', 'det-fee3'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('input', () => calculateTaxes('det')); });


function renderDashboard() {
    const yFilterEl = document.getElementById('yearFilter');
    if(!yFilterEl) return;
    const selectedYear = yFilterEl.value;
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

// === ระบบเรียงลำดับและแบ่งหน้า ===
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

    // 1. ดึงค่าจาก Filter
    const fYear = document.getElementById('flt-year') ? document.getElementById('flt-year').value : 'all';
    const fMonth = document.getElementById('flt-month') ? document.getElementById('flt-month').value : 'all';
    const fDay = document.getElementById('flt-day') ? document.getElementById('flt-day').value : 'all';
    const fUser = document.getElementById('flt-user') ? document.getElementById('flt-user').value : 'all';
    const fSearch = document.getElementById('flt-search') ? document.getElementById('flt-search').value.toLowerCase() : '';
    const fStat = document.getElementById('flt-status') ? document.getElementById('flt-status').value : 'all';

    // 2. กรองข้อมูล (Filter)
    let filteredData = allInvoiceData.filter(row => {
        let match = true;
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) {
                if (fYear !== "all" && d.getFullYear().toString() !== fYear) match = false;
                if (fMonth !== "all" && d.getMonth().toString() !== fMonth) match = false;
                if (fDay !== "all" && d.getDate().toString() !== fDay) match = false;
            } else if (fYear !== "all" || fMonth !== "all" || fDay !== "all") { match = false; }
        } else if (fYear !== "all" || fMonth !== "all" || fDay !== "all") { match = false; }

        if (fUser !== "all" && row["ใช้โดย"] !== fUser) match = false;
        
        if (fSearch !== "") {
            let custMatch = (row["ชื่อลูกค้า"] && row["ชื่อลูกค้า"].toLowerCase().includes(fSearch));
            let invMatch = (row["Invoice No."] && String(row["Invoice No."]).toLowerCase().includes(fSearch));
            if (!custMatch && !invMatch) match = false;
        }
        
        let displayStatus = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        if (fStat !== "all" && displayStatus !== fStat) match = false;

        return match;
    });

    document.getElementById('total-records-count').innerText = `(พบ ${filteredData.length} รายการ)`;

    // 3. เรียงลำดับ (Sort)
    updateSortIcons();
    if (sortCol) {
        filteredData.sort((a, b) => {
            let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
            if (sortCol === 'วันที่ใช้งาน' || sortCol === 'วันที่รับยอด CS' || sortCol === 'วันที่ได้รับชำระ') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
                valA = Number(valA); valB = Number(valB);
            } else {
                valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
            }
            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }

    // 4. แบ่งหน้า (Pagination)
    const rowsPerPageVal = document.getElementById('rowsPerPage').value;
    const rpp = rowsPerPageVal === 'all' ? filteredData.length : Number(rowsPerPageVal);
    const totalPages = Math.ceil(filteredData.length / rpp) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIdx = (currentPage - 1) * rpp;
    const paginatedData = filteredData.slice(startIdx, startIdx + rpp);

    // ควบคุมปุ่ม Pagination
    const pageControl = document.getElementById('pagination-controls');
    if (rowsPerPageVal === 'all' || filteredData.length === 0) {
        pageControl.style.display = 'none';
    } else {
        pageControl.style.display = 'flex';
        document.getElementById('page-indicator').innerText = `หน้า ${currentPage} / ${totalPages}`;
        document.getElementById('btn-prev-page').disabled = (currentPage === 1);
        document.getElementById('btn-next-page').disabled = (currentPage === totalPages);
    }

    // 5. วาดตาราง (Render)
    tbody.innerHTML = '';
    if (paginatedData.length === 0) { tbody.innerHTML = '<tr><td colspan="17" class="text-center text-red">ไม่พบข้อมูลที่ค้นหา</td></tr>'; return; }
    const fmt = (n) => Number(n || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

    paginatedData.forEach(row => {
        let dateUseStr = row["วันที่ใช้งาน"] ? new Date(row["วันที่ใช้งาน"]).toLocaleDateString('th-TH') : '';
        let dateCsStr = row["วันที่รับยอด CS"] ? new Date(row["วันที่รับยอด CS"]).toLocaleDateString('th-TH') : '';
        let datePayStr = row["วันที่ได้รับชำระ"] ? new Date(row["วันที่ได้รับชำระ"]).toLocaleDateString('th-TH') : '';
        let displayStatus = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
        let statusClass = displayStatus === 'ยกเลิก' ? 'text-red' : (displayStatus === 'รับชำระแล้ว' ? 'text-green' : '');

        // เพิ่มคลาส clickable-row และ onclick เปิด Popup
        tbody.innerHTML += `<tr class="clickable-row" onclick="openDetailModal('${row["Invoice No."]}')">
            <td class="text-center">${row["No."]}</td>
            <td class="text-left" style="color:#2563eb; font-weight:bold;">${row["Invoice No."]}</td>
            <td class="text-left">${row["ชื่อลูกค้า"]}</td>
            <td class="text-center">${dateUseStr}</td>
            <td class="text-center">${row["ใช้โดย"]}</td>
            <td class="text-left">${row["รายละเอียด"] || ''}</td>
            <td>${fmt(row["ค่าตู้"])}</td>
            <td>${fmt(row["ค่าเที่ยว"])}</td>
            <td>${fmt(row["ค่าบริการ"])}</td>
            <td class="text-center">${dateCsStr}</td>
            <td class="text-center">${datePayStr}</td>
            <td>${fmt(row["WH1%"])}</td>
            <td>${fmt(row["WH3%"])}</td>
            <td style="font-weight:bold;">${fmt(row["ยอดชำระ"])}</td>
            <td class="text-center"><span class="${statusClass}">${displayStatus}</span></td>
            <td class="text-left text-red">${row["สาเหตุที่ยกเลิก"] || ''}</td>
            <td class="text-center">${row["ผู้บันทึกการรับยอด"] || ''}</td>
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
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') { msg.classList.add('success'); msg.innerText = result.message; document.getElementById('invoiceForm').reset(); setTimeout(() => { closeModal('addModal'); fetchAllData(); }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = "Error: " + err.message; } finally { btn.disabled = false; btn.innerText = 'สร้างบิลใหม่'; }
});

// เปิด Popup รายละเอียดบิล เมื่อคลิกแถว
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
    
    let useD = "", csD = "", payD = "";
    if(row["วันที่ใช้งาน"]){ let d = new Date(row["วันที่ใช้งาน"]); if(!isNaN(d)) useD = d.toISOString().split('T')[0]; }
    if(row["วันที่รับยอด CS"]){ let d = new Date(row["วันที่รับยอด CS"]); if(!isNaN(d)) csD = d.toISOString().split('T')[0]; }
    if(row["วันที่ได้รับชำระ"]){ let d = new Date(row["วันที่ได้รับชำระ"]); if(!isNaN(d)) payD = d.toISOString().split('T')[0]; }
    
    document.getElementById('det-useDate').value = useD;
    document.getElementById('det-csDate').value = csD;
    document.getElementById('det-payDate').value = payD;
    
    document.getElementById('det-checker').value = row["ผู้บันทึกการรับยอด"] || "";
    document.getElementById('det-status').value = row["สถานะ"] || ((row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "") ? 'รับชำระแล้ว' : 'ปกติ');
    document.getElementById('det-cancelReason').value = row["สาเหตุที่ยกเลิก"] || "";
    
    calculateTaxes('det'); 
    toggleDetCancel();
    
    document.getElementById('detailModal').style.display = 'flex';
}

function toggleDetCancel() {
    const status = document.getElementById('det-status').value; const group = document.getElementById('det-cancelGroup'); const input = document.getElementById('det-cancelReason');
    if (status === 'ยกเลิก') { group.style.display = 'block'; input.required = true; } else { group.style.display = 'none'; input.required = false; input.value = ''; }
}

// ลบ Invoice
async function deleteInvoice() {
    if(!confirm("⚠️ ยืนยันการลบ Invoice นี้?\nข้อมูลจะหายไปจากระบบอย่างถาวร!")) return;
    const invNo = document.getElementById('det-oldInvNo').value;
    const btn = document.getElementById('btn-detSubmit'); const msg = document.getElementById('det-message');
    btn.disabled = true; msg.className = 'msg'; msg.innerText = 'กำลังลบข้อมูล...'; msg.style.display = 'block';
    
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({action: 'delete', invoiceNo: invNo}), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') { msg.classList.add('success'); msg.innerText = result.message; setTimeout(() => { closeModal('detailModal'); fetchAllData(); }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = result.message; btn.disabled = false;}
    } catch (err) { msg.classList.add('error'); msg.innerText = "Error: " + err.message; btn.disabled = false;}
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
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.status === 'success') { msg.classList.add('success'); msg.innerText = result.message; setTimeout(() => { closeModal('detailModal'); fetchAllData(); }, 1000); } 
        else { msg.classList.add('error'); msg.innerText = result.message; }
    } catch (err) { msg.classList.add('error'); msg.innerText = "Error: " + err.message; } finally { btn.disabled = false; btn.innerText = '💾 บันทึกการแก้ไข'; }
});
