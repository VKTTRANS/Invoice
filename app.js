// ใส่ Web App URL ของคุณเรียบร้อยแล้ว
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active-page');
    
    if(pageId === 'dashboard') {
        document.getElementById('btn-dashboard').classList.add('active');
        fetchDashboardData();
    }
    if(pageId === 'add-invoice') {
        document.getElementById('btn-add').classList.add('active');
    }
    if(pageId === 'history') {
        document.getElementById('btn-history').classList.add('active');
        fetchHistoryData();
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
        const response = await fetch(`${SCRIPT_URL}?action=getDropdowns`);
        const data = await response.json();
        
        const usedByList = document.getElementById('usedByList');
        usedByList.innerHTML = '';
        if(data.users) data.users.forEach(name => usedByList.innerHTML += `<option value="${name}">`);

        const checkerList = document.getElementById('checkerList');
        checkerList.innerHTML = '';
        if(data.checkers) data.checkers.forEach(name => checkerList.innerHTML += `<option value="${name}">`);
        
        fetchDashboardData();
    } catch (error) {
        console.error("Error loading dropdowns:", error);
    }
};

// ==========================================
// ฟังก์ชันคำนวณและแสดงผล Dashboard แยกรายเดือน
// ==========================================
async function fetchDashboardData() {
    const tbody = document.getElementById('dashboard-body');
    const tfoot = document.getElementById('dashboard-foot');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';
    tfoot.innerHTML = '';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const data = await response.json();

        const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

        // สร้างโครงสร้างเก็บข้อมูล 12 เดือน
        let monthlyData = Array.from({length: 12}, (_, i) => ({
            monthName: thaiMonths[i],
            count: 0,
            boxFee: 0,
            transportFee: 0,
            serviceFee: 0,
            totalIncome: 0,
            paidAmount: 0
        }));

        // ตัวแปรเก็บผลรวมทั้งปี
        let total = { count: 0, boxFee: 0, transportFee: 0, serviceFee: 0, income: 0, paid: 0 };

        // คำนวณข้อมูลทีละบรรทัด
        data.forEach(row => {
            // ไม่นำบิลที่ "ยกเลิก" มาคำนวณเป็นรายได้
            if (row["สถานะ"] === "ยกเลิก") return;

            let dateVal = row["วันที่ใช้งาน"]; // ใช้วันที่ใช้งานเป็นเกณฑ์แยกเดือน
            if (dateVal) {
                let d = new Date(dateVal);
                if (!isNaN(d)) {
                    let m = d.getMonth(); // ได้เลข 0-11
                    
                    let f1 = Number(row["ค่าตู้"]) || 0;
                    let f2 = Number(row["ค่าเที่ยว"]) || 0;
                    let f3 = Number(row["ค่าบริการ"]) || 0;
                    let income = f1 + f2 + f3;
                    let paid = row["สถานะ"] === "รับชำระแล้ว" ? (Number(row["ยอดชำระ"]) || 0) : 0;

                    monthlyData[m].count++;
                    monthlyData[m].boxFee += f1;
                    monthlyData[m].transportFee += f2;
                    monthlyData[m].serviceFee += f3;
                    monthlyData[m].totalIncome += income;
                    monthlyData[m].paidAmount += paid;

                    // บวกเข้าผลรวมทั้งปี
                    total.count++;
                    total.boxFee += f1;
                    total.transportFee += f2;
                    total.serviceFee += f3;
                    total.income += income;
                    total.paid += paid;
                }
            }
        });

        // นำข้อมูลไปแสดงผลในตาราง
        tbody.innerHTML = '';
        monthlyData.forEach(m => {
            tbody.innerHTML += `
                <tr>
                    <td style="text-align:center;">${m.monthName}</td>
                    <td style="text-align:center;">${m.count}</td>
                    <td style="text-align:right;">${m.boxFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    <td style="text-align:right;">${m.transportFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    <td style="text-align:right;">${m.serviceFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    <td style="text-align:right;">${m.totalIncome.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                    <td style="text-align:right; color:#27ae60; font-weight:bold;">${m.paidAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });

        // แสดงผลรวมด้านล่างสุด
        tfoot.innerHTML = `
            <tr>
                <td style="text-align:center;">รวมทั้งสิ้น</td>
                <td style="text-align:center;">${total.count}</td>
                <td style="text-align:right;">${total.boxFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                <td style="text-align:right;">${total.transportFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                <td style="text-align:right;">${total.serviceFee.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                <td style="text-align:right;">${total.income.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                <td style="text-align:right; color:#27ae60;">${total.paid.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
            </tr>
        `;

    } catch (error) {
        console.error("Error fetching dashboard:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว โปรดรีเฟรช</td></tr>';
    }
}

async function fetchHistoryData() {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const data = await response.json();
        tbody.innerHTML = '';
        
        data.reverse().forEach(row => {
            let dateStr = '-';
            if (row["วันที่ใช้งาน"]) {
                const d = new Date(row["วันที่ใช้งาน"]);
                if(!isNaN(d)) dateStr = d.toLocaleDateString('th-TH');
            }
            const total = Number(row["ยอดชำระ"]) ? Number(row["ยอดชำระ"]).toLocaleString('th-TH', {minimumFractionDigits: 2}) : '0.00';
            
            tbody.innerHTML += `
                <tr>
                    <td>${row["Invoice No."]}</td>
                    <td>${row["ชื่อลูกค้า"]}</td>
                    <td>${dateStr}</td>
                    <td>${total}</td>
                    <td><span style="color: ${row["สถานะ"] === 'ยกเลิก' ? 'red' : (row["สถานะ"] === 'รับชำระแล้ว' ? 'green' : 'black')}">${row["สถานะ"]}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว</td></tr>';
    }
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
            
            setTimeout(() => {
                window.onload();
            }, 500);
            
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
