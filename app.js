// ใส่ Web App URL ของคุณเรียบร้อยแล้ว
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3eRovQMOuKuwK3m0zDheFJOYqkreQMDmXfMlk-_8_43Fwr5z9HV8hULsQkJr4BRdP/exec";

// ฟังก์ชันสลับหน้าต่าง
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

// ควบคุมการแสดงผลช่อง 'สาเหตุที่ยกเลิก'
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

// โหลดข้อมูลรายชื่อ (Datalist) ทันทีที่เปิดเว็บ
window.onload = async function() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDropdowns`);
        const data = await response.json();
        
        const usedByList = document.getElementById('usedByList');
        usedByList.innerHTML = '';
        if(data.users) {
            data.users.forEach(name => {
                usedByList.innerHTML += `<option value="${name}">`;
            });
        }

        const checkerList = document.getElementById('checkerList');
        checkerList.innerHTML = '';
        if(data.checkers) {
            data.checkers.forEach(name => {
                checkerList.innerHTML += `<option value="${name}">`;
            });
        }
        
        fetchDashboardData();
    } catch (error) {
        console.error("Error loading dropdowns:", error);
    }
};

// ดึงข้อมูล Dashboard
async function fetchDashboardData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const data = await response.json();
        
        document.getElementById('dash-count').innerText = data.length;
        
        const totalPaid = data
            .filter(row => row["สถานะ"] === "รับชำระแล้ว")
            .reduce((sum, row) => sum + (Number(row["ยอดชำระ"]) || 0), 0);
            
        document.getElementById('dash-total').innerText = totalPaid.toLocaleString('th-TH', {minimumFractionDigits: 2});
    } catch (error) {
        console.error("Error fetching dashboard:", error);
    }
}

// ดึงข้อมูลหน้าประวัติย้อนหลัง
async function fetchHistoryData() {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getData`);
        const data = await response.json();
        tbody.innerHTML = '';
        
        // แสดงจากข้อมูลล่าสุดไปเก่าสุด
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

// ส่งข้อมูลเมื่อกดปุ่ม Submit (POST)
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
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } // ใช้ text/plain เลี่ยงปัญหา CORS ของ Google
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            msg.classList.add('success');
            msg.innerText = result.message;
            document.getElementById('invoiceForm').reset();
            toggleCancelReason(); 
            
            // สั่งโหลดรายชื่อ Datalist ใหม่ กรณีที่มีคนพิมพ์ชื่อใหม่เข้ามา
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