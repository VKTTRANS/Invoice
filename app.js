const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";
let allInvoiceData = [];

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    
    if(pageId === 'dashboard') document.getElementById('btn-dashboard').classList.add('active');
    if(pageId === 'add-invoice') document.getElementById('btn-add').classList.add('active');
    if(pageId === 'history') {
        document.getElementById('btn-history').classList.add('active');
        renderHistory();
    }
}

function toggleCancelReason() {
    const status = document.getElementById('status').value;
    const cancelGroup = document.getElementById('cancelGroup');
    const cancelInput = document.getElementById('cancelReason');
    if (status === 'ยกเลิก') {
        cancelGroup.style.display = 'block';
        cancelInput.required = true;
    } else {
        cancelGroup.style.display = 'none';
        cancelInput.required = false;
        cancelInput.value = '';
    }
}

window.onload = async function() {
    try {
        fetch(`${SCRIPT_URL}?action=getDropdowns`)
            .then(res => res.json())
            .then(data => {
                const usedByList = document.getElementById('usedByList');
                if(data.users) data.users.forEach(name => usedByList.innerHTML += `<option value="${name}">`);
                const checkerList = document.getElementById('checkerList');
                if(data.checkers) data.checkers.forEach(name => checkerList.innerHTML += `<option value="${name}">`);
            }).catch(e => console.error("Dropdown error:", e));

        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        allInvoiceData = await response.json();
        
        setupYearFilter();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-body').innerHTML = `<tr><td colspan="11" class="text-center text-red">โหลดข้อมูลล้มเหลว โปรดตรวจสอบการ Deploy หรือรีเฟรชหน้าเว็บ</td></tr>`;
    }
};

function setupYearFilter() {
    const filter = document.getElementById('yearFilter');
    const years = new Set();
    
    allInvoiceData.forEach(row => {
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if (!isNaN(d)) years.add(d.getFullYear());
        }
    });

    filter.innerHTML = '';
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    if (sortedYears.length === 0) {
        filter.innerHTML = '<option value="all">ไม่มีข้อมูล</option>';
        return;
    }

    sortedYears.forEach(y => {
        filter.innerHTML += `<option value="${y}">${y}</option>`;
    });
}

function renderDashboard() {
    const selectedYear = document.getElementById('yearFilter').value;
    const tbody = document.getElementById('dashboard-body');
    const tfoot = document.getElementById('dashboard-foot');
    
    if (allInvoiceData.length === 0) return;

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
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
                
                let f1 = Number(row["ค่าตู้"]) || 0;
                let f2 = Number(row["ค่าเที่ยว"]) || 0;
                let f3 = Number(row["ค่าบริการ"]) || 0;
                let income = f1 + f2 + f3;
                let w1 = Number(row["WH1%"]) || 0;
                let w3 = Number(row["WH3%"]) || 0;
                let toPay = income - w1 - w3;
                
                // --- ส่วนที่แก้ไขให้ดึงข้อมูลเก่าได้อัตโนมัติ ---
                // เช็คว่าช่อง "วันที่ได้รับชำระ" มีข้อมูลหรือไม่
                let hasPayDate = row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "";
                // ถือว่าจ่ายแล้ว ถ้าสถานะคือ "รับชำระแล้ว" หรือ มีการใส่วันที่รับเงิน
                let isPaid = (row["สถานะ"] === "รับชำระแล้ว" || hasPayDate);
                
                // ถ้ารับเงินแล้วให้ดึงยอดจากคอลัมน์ยอดชำระ
                let paid = isPaid ? (Number(row["ยอดชำระ"]) || 0) : 0;
                // ----------------------------------------

                let bal = toPay - paid;

                mData[m].invCount++;
                mData[m].boxFee += f1;
                mData[m].transFee += f2;
                mData[m].servFee += f3;
                mData[m].totalIncome += income;
                mData[m].wh1 += w1;
                mData[m].wh3 += w3;
                mData[m].totalToPay += toPay;
                mData[m].paid += paid;
                mData[m].balance += bal;

                t.invCount++;
                t.boxFee += f1; t.transFee += f2; t.servFee += f3;
                t.totalIncome += income; t.wh1 += w1; t.wh3 += w3;
                t.totalToPay += toPay; t.paid += paid; t.balance += bal;
            }
        }
    });

    const fmt = (num) => num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    tbody.innerHTML = '';
    mData.forEach(m => {
        let isZero = m.invCount === 0;
        // ถ้าคงเหลือน้อยกว่า 1 บาท (เช่น 0.00) ให้แสดงเป็นสีปกติ, ถ้าเหลือเยอะให้เป็นสีแดง
        let balClass = isZero ? 'text-gray' : (m.balance > 0.01 ? 'text-red' : '');
        
        tbody.innerHTML += `
            <tr class="${isZero ? 'text-gray' : ''}">
                <td class="text-center">${m.month}</td>
                <td class="text-center">${m.invCount}</td>
                <td>${fmt(m.boxFee)}</td>
                <td>${fmt(m.transFee)}</td>
                <td>${fmt(m.servFee)}</td>
                <td>${fmt(m.totalIncome)}</td>
                <td>${fmt(m.wh1)}</td>
                <td>${fmt(m.wh3)}</td>
                <td>${fmt(m.totalToPay)}</td>
                <td class="${isZero ? '' : 'text-green'}">${isZero ? '' : fmt(m.paid)}</td>
                <td class="${balClass}">${isZero ? '' : fmt(m.balance)}</td>
            </tr>
        `;
    });

    tfoot.innerHTML = `
        <tr>
            <td class="text-center">รวม</td>
            <td class="text-center">${t.invCount}</td>
            <td>${fmt(t.boxFee)}</td>
            <td>${fmt(t.transFee)}</td>
            <td>${fmt(t.servFee)}</td>
            <td>${fmt(t.totalIncome)}</td>
            <td>${fmt(t.wh1)}</td>
            <td>${fmt(t.wh3)}</td>
            <td>${fmt(t.totalToPay)}</td>
            <td class="text-green">${fmt(t.paid)}</td>
            <td class="text-red">${fmt(t.balance)}</td>
        </tr>
    `;
}

function renderHistory() {
    const tbody = document.getElementById('history-body');
    if (allInvoiceData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray">ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    const historyData = [...allInvoiceData].reverse();
    
    historyData.forEach(row => {
        let dateStr = '-';
        if (row["วันที่ใช้งาน"]) {
            const d = new Date(row["วันที่ใช้งาน"]);
            if(!isNaN(d)) dateStr = d.toLocaleDateString('th-TH');
        }
        const total = Number(row["ยอดชำระ"]) ? Number(row["ยอดชำระ"]).toLocaleString('th-TH', {minimumFractionDigits: 2}) : '0.00';
        
        // ชดเชยกรณีข้อมูลเก่าไม่มีสถานะ แต่มีวันที่รับเงินแล้ว
        let hasPayDate = row["วันที่ได้รับชำระ"] && row["วันที่ได้รับชำระ"].toString().trim() !== "";
        let displayStatus = row["สถานะ"] || (hasPayDate ? 'รับชำระแล้ว' : 'ปกติ');
        
        let statusClass = displayStatus === 'ยกเลิก' ? 'text-red' : (displayStatus === 'รับชำระแล้ว' ? 'text-green' : '');
        
        tbody.innerHTML += `
            <tr>
                <td class="text-left">${row["Invoice No."]}</td>
                <td class="text-left">${row["ชื่อลูกค้า"]}</td>
                <td class="text-center">${dateStr}</td>
                <td>${total}</td>
                <td class="text-center"><span class="${statusClass}">${displayStatus}</span></td>
            </tr>
        `;
    });
}

document.getElementById('invoiceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('message');
    
    btn.disabled = true;
    btn.innerText = 'กำลังบันทึก...';
    msg.className = 'msg';
    msg.innerText = '';

    const payload = {
        invoiceNo: document.getElementById('invoiceNo').value,
        customer: document.getElementById('customer').value,
        useDate: document.getElementById('useDate').value,
        usedBy: document.getElementById('usedBy').value,
        details: document.getElementById('details').value,
        fee1: document.getElementById('fee1').value,
        fee2: document.getElementById('fee2').value,
        fee3: document.getElementById('fee3').value,
        csDate: document.getElementById('csDate').value,
        payDate: document.getElementById('payDate').value,
        wh1: document.getElementById('wh1').value,
        wh3: document.getElementById('wh3').value,
        totalPay: document.getElementById('totalPay').value,
        status: document.getElementById('status').value,
        cancelReason: document.getElementById('cancelReason').value,
        checker: document.getElementById('checker').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            msg.classList.add('success');
            msg.innerText = result.message;
            document.getElementById('invoiceForm').reset();
            toggleCancelReason(); 
            
            setTimeout(() => { window.onload(); }, 800);
        } else {
            msg.classList.add('error');
            msg.innerText = result.message;
        }
    } catch (error) {
        msg.classList.add('error');
        msg.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message;
    } finally {
        btn.disabled = false;
        btn.innerText = 'บันทึกข้อมูล';
    }
});
