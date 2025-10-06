// ===== ฟังก์ชันจัดการวันที่และเวลาไทย (แก้ไขแล้ว) =====

function getThaiDateTime() {
    const now = new Date();
    
    // แปลงเป็นเวลาไทย
    const thaiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    return {
        date: thaiTime.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }),
        time: thaiTime.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        }),
        fullDate: thaiTime.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        timestamp: now.toISOString(),
        dayOfWeek: thaiTime.toLocaleDateString('th-TH', { weekday: 'long' })
    };
}

// ✅ แก้ไขแล้ว - ใช้ toLocaleTimeString โดยตรง
// ฟังก์ชันแปลงเวลาให้แสดงเวลาไทยถูกต้อง
function formatThaiTime(dateString) {
    if (!dateString) return '-';
    
    try {
        // สร้าง Date object จาก string
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            console.error('Invalid time:', dateString);
            return dateString;
        }
        
        // แปลงเป็นเวลาไทย
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    } catch (e) {
        console.error('Time format error:', e);
        return dateString;
    }
}
// ✅ ฟังก์ชันแปลงวันที่เป็นภาษาไทย
function formatThaiDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return dateString;
        }
        
        // แปลงเป็นรูปแบบไทย พร้อม timezone Bangkok
        return date.toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        console.error('Date format error:', e);
        return dateString;
    }
}

// ✅ ฟังก์ชันแปลงวันที่และเวลาแบบเต็ม
function formatThaiDateTime(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const dateStr = date.toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const timeStr = date.toLocaleTimeString('th-TH', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        return `${dateStr} เวลา ${timeStr} น.`;
    } catch (e) {
        console.error('DateTime format error:', e);
        return dateString;
    }
}

// ✅ ทดสอบการทำงาน
function testDateTimeConversion() {
    console.log('=== ทดสอบการแปลงเวลา ===');
    
    // ตัวอย่างเวลา UTC จาก database
    const testDates = [
        '2025-01-06T13:28:00.000Z',  // เวลา UTC 13:28 = เวลาไทย 20:28
        '2025-01-06T06:30:00.000Z',  // เวลา UTC 06:30 = เวลาไทย 13:30
        '2025-01-05T17:00:00.000Z'   // เวลา UTC 17:00 = เวลาไทย 00:00 (วันถัดไป)
    ];
    
    testDates.forEach(utcDate => {
        console.log('---');
        console.log('UTC:', utcDate);
        console.log('วันที่ไทย:', formatThaiDate(utcDate));
        console.log('เวลาไทย:', formatThaiTime(utcDate));
        console.log('แบบเต็ม:', formatThaiDateTime(utcDate));
    });
}

// เรียกใช้ทดสอบ
testDateTimeConversion();
// ===== CONFIG =====
const API_CONFIG = {
    BASE_URL: 'https://bn1-1.onrender.com',
    RENDER_URL: 'https://bn1-1.onrender.com',
    LOCAL_URL: 'http://localhost:4000',
    TIMEOUT: 10000
};

// ===== GLOBAL VARIABLES =====
let exerciseHistory = [];
let currentPage = 1;
let itemsPerPage = 10;

// ===== AUTH & USER FUNCTIONS =====
function getAuthToken() {
    let token = localStorage.getItem('authToken');
    
    if (!token) {
        token = sessionStorage.getItem('authToken');
    }
    
    if (!token) {
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                token = parsed.token;
            } catch (e) {
                console.error('Error parsing userData:', e);
            }
        }
    }
    
    console.log('🔑 Token search result:', {
        found: !!token,
        source: token ? (localStorage.getItem('authToken') ? 'localStorage' : 'sessionStorage') : 'NOT FOUND',
        preview: token ? token.substring(0, 20) + '...' : 'NULL'
    });
    
    return token;
}

function getUserData() {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userDataStr) return null;
    
    try {
        return JSON.parse(userDataStr);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

async function loadUserProfile() {
    try {
        const token = getAuthToken();
        const userData = getUserData();
        
        console.log('=== DEBUG TOKEN ===');
        console.log('Token exists:', !!token);
        console.log('Token value:', token ? token.substring(0, 30) + '...' : 'NULL');
        console.log('UserData:', userData);
        
        if (!token || token === 'null' || token === 'undefined') {
            console.error('❌ Invalid token detected');
            alert('ไม่พบ token หรือ token ไม่ถูกต้อง กรุณา login ใหม่');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        
        if (!userData || !userData.user_id) {
            console.error('❌ Invalid user data');
            alert('ไม่พบข้อมูลผู้ใช้ กรุณา login ใหม่');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }

        const userNameEl = document.getElementById('userName');
        const patientNameEl = document.getElementById('patientName');
        
        if (userNameEl && userData.full_name) {
            userNameEl.textContent = userData.full_name;
        }
        
        if (patientNameEl && userData.full_name) {
            patientNameEl.textContent = `คุณ ${userData.full_name}`;
        }

        console.log('🔒 Fetching user profile with token:', token.substring(0, 20) + '...');
        console.log('📋 User ID:', userData.user_id);

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userData.user_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Profile API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Profile API error:', errorData);
            
            if (response.status === 401 || response.status === 403) {
                alert('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
            return;
        }

        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('✅ User profile loaded:', result.data);
            
            if (result.data.patient_info) {
                updatePatientInfo(result.data.patient_info);
            }
        }

    } catch (error) {
        console.error('❌ Error loading user profile:', error);
    }
}

function updatePatientInfo(patientInfo) {
    console.log('📋 Updating patient info:', patientInfo);
    
    if (patientInfo.birth_date) {
        try {
            const birthDate = new Date(patientInfo.birth_date);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            const ageEl = document.querySelector('.info-grid .info-item:nth-child(2) .value');
            if (ageEl) {
                ageEl.textContent = `${age} ปี`;
                console.log('✅ Age updated:', age);
            }
        } catch (e) {
            console.error('Error calculating age:', e);
        }
    }
    
    if (patientInfo.gender) {
        const genderMap = {
            'Male': 'ชาย',
            'Female': 'หญิง',
            'Other': 'อื่นๆ'
        };
        const genderEl = document.querySelector('.info-grid .info-item:nth-child(3) .value');
        if (genderEl) {
            genderEl.textContent = genderMap[patientInfo.gender] || patientInfo.gender;
            console.log('✅ Gender updated:', patientInfo.gender);
        }
    }
    
    if (patientInfo.injured_side) {
        const sideMap = {
            'Left': 'ด้านซ้าย',
            'Right': 'ด้านขวา',
            'Both': 'ทั้งสองข้าง'
        };
        const sideEl = document.querySelector('.info-grid .info-item:nth-child(6) .value');
        if (sideEl) {
            sideEl.textContent = sideMap[patientInfo.injured_side] || patientInfo.injured_side;
            console.log('✅ Injured side updated:', patientInfo.injured_side);
        }
    }
    
    console.log('✅ Patient info update completed');
}

// ===== DATA LOADING FUNCTIONS =====
async function loadExerciseData() {
    console.log('📊 Loading exercise data from API...');
    
    try {
        const token = getAuthToken();
        
        if (!token) {
            console.warn('❌ No auth token found');
            alert('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        console.log('🔑 Using token:', token.substring(0, 20) + '...');

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/exercise-sessions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 API Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ API Result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            console.log(`✅ Loaded ${result.data.length} sessions from database`);
            
            // ✅ แปลงข้อมูลให้ตรงกับโครงสร้าง
            exerciseHistory = result.data.map(session => {
                const leftReps = parseInt(session.actual_reps_left) || 0;
                const rightReps = parseInt(session.actual_reps_right) || 0;
                const totalReps = leftReps + rightReps;
                
                console.log(`Session ${session.session_id}:`, {
                    left: leftReps,
                    right: rightReps,
                    total: totalReps,
                    date: session.session_date
                });
                
                return {
                    exercise: session.exercise_id,
                    exerciseName: session.exercise_name_th || session.exercise_name_en || session.description || 'ท่ากายภาพ',
                    actual_reps_left: leftReps,
                    actual_reps_right: rightReps,
                    actual_reps: totalReps,
                    accuracy: parseFloat(session.accuracy_percent) || 0,
                    duration_seconds: parseInt(session.duration_seconds) || 0,
                    session_date: session.session_date,
                    notes: session.notes || '',
                    timestamp: new Date(session.session_date).getTime()
                };
            });

            // เรียงตามเวลาล่าสุด
            exerciseHistory.sort((a, b) => b.timestamp - a.timestamp);

            console.log('✅ Processed history:', exerciseHistory.length, 'sessions');
            console.log('Sample data:', exerciseHistory[0]);

            updateTable();
            updateSummaryCards();
            updateChart();
            updateRecommendations();
            
        } else {
            console.log('⚠️ No exercise data found in database');
            createSampleData();
        }

    } catch (error) {
        console.error('❌ Error loading exercise data:', error);
        
        if (error.message.includes('token') || error.message.includes('401')) {
            alert('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        console.log('⚠️ Falling back to sample data...');
        createSampleData();
    }
}

async function loadExerciseStats() {
    try {
        const token = getAuthToken();
        
        if (!token) return;

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/exercise-stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('✅ Stats loaded:', result.data);
            
            if (result.data.weekly_progress && result.data.weekly_progress.length > 0) {
                updateChartWithData(result.data.weekly_progress);
            }
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateChartWithData(weeklyData) {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const data = weeklyData.map(day => Math.round(day.avg_accuracy || 0));
    const labels = weeklyData.map(day => {
        const date = new Date(day.session_date);
        return date.toLocaleDateString('th-TH', { weekday: 'short' });
    });
    
    drawChart(ctx, canvas, data.reverse(), labels.reverse());
}

// ===== SAMPLE DATA =====
function createSampleData() {
    const thaiDateTime = getThaiDateTime();
    
    const sampleData = [
        {
            exercise: 'arm-raise-forward',
            exerciseName: 'ท่ายกแขนไปข้างหน้า',
            actual_reps_left: 8,
            actual_reps_right: 7,
            actual_reps: 15,
            accuracy: 78,
            duration_seconds: 420,
            session_date: thaiDateTime.timestamp,
            date: thaiDateTime.date,
            time: thaiDateTime.time,
            timestamp: Date.now()
        },
        {
            exercise: 'leg-extension',
            exerciseName: 'ท่าเหยียดเข่าตรง',
            actual_reps_left: 6,
            actual_reps_right: 6,
            actual_reps: 12,
            accuracy: 82,
            duration_seconds: 380,
            session_date: thaiDateTime.timestamp,
            date: thaiDateTime.date,
            time: thaiDateTime.time,
            timestamp: Date.now()
        }
    ];
    
    if (exerciseHistory.length === 0) {
        exerciseHistory = sampleData;
        updateTable();
        updateSummaryCards();
        updateChart();
    }
}

// ===== TABLE FUNCTIONS =====
function updateTable() {
    const tbody = document.getElementById('therapyTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (exerciseHistory.length === 0) {
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="7" style="text-align: center; color: #718096; padding: 2rem;">ยังไม่มีข้อมูลการออกกำลังกาย</td>`;
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, exerciseHistory.length);

    for (let i = startIndex; i < endIndex; i++) {
        const session = exerciseHistory[i];
        const row = tbody.insertRow();
        
        const leftReps = parseInt(session.actual_reps_left) || 0;
        const rightReps = parseInt(session.actual_reps_right) || 0;
        const totalReps = leftReps + rightReps;
        
        // ✅ ใช้ฟังก์ชันแปลงวันที่และเวลาที่แก้ไขแล้ว
        const displayDate = formatThaiDate(session.session_date);
        const displayTime = formatThaiTime(session.session_date);
        
        // ✅ แสดงชื่อท่าภาษาไทย (ใช้ exercise_name_th ก่อน ถ้าไม่มีใช้ exerciseName)
        const exerciseName = session.exercise_name_th || session.exerciseName || 'ท่ากายภาพ';
        
        // ✅ เพิ่มคอลัมน์เกณฑ์ประเมิน
        const performanceLevel = getPerformanceLevel(totalReps, session.exercise_id);
        
        console.log(`📋 Row ${i}:`, {
            session_id: session.session_id,
            exercise_id: session.exercise_id,
            exercise_name: exerciseName,
            date: displayDate,
            time: displayTime,
            left: leftReps,
            right: rightReps,
            total: totalReps,
            performance: performanceLevel
        });
        
        row.innerHTML = `
            <td>${displayDate}</td>
            <td style="color: #718096;">${displayTime}</td>
            <td><strong>${exerciseName}</strong></td>
            <td style="text-align: center;">
                <span style="font-weight: 600; color: #3182ce;">
                    ${leftReps} ครั้ง
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-weight: 600; color: #38a169;">
                    ${rightReps} ครั้ง
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-weight: 700; color: #2563eb; font-size: 16px;">
                    ${totalReps} ครั้ง
                </span>
            </td>
            <td style="text-align: center;">
                ${performanceLevel}
            </td>
        `;
    }
    updateTableInfo();
    updatePagination();
}

function getAccuracyClass(accuracy) {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 80) return 'good';
    if (accuracy >= 70) return 'fair';
    return 'poor';
}


function updateTableInfo() {
    if (exerciseHistory.length === 0) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, exerciseHistory.length);
    
    const tableInfoText = document.getElementById('tableInfoText');
    if (tableInfoText) {
        tableInfoText.textContent = 
            `แสดง ${startIndex} ถึง ${endIndex} จาก ${exerciseHistory.length} รายการ`;
    }
}

function updatePagination() {
    const totalPages = Math.ceil(exerciseHistory.length / itemsPerPage);
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || exerciseHistory.length === 0;
    if (pageInfo) pageInfo.textContent = exerciseHistory.length === 0 ? '0' : currentPage;
}

// ===== SUMMARY & CHART =====
function updateSummaryCards() {
    if (exerciseHistory.length === 0) return;

    const totalAccuracy = exerciseHistory.reduce((sum, session) => sum + (session.accuracy || 0), 0);
    const averageAccuracy = Math.round(totalAccuracy / exerciseHistory.length);
    
    const bestAccuracy = Math.max(...exerciseHistory.map(session => session.accuracy || 0));
    
    const lastWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSessions = exerciseHistory.filter(session => 
        session.timestamp >= lastWeek
    );

    const bestEl = document.getElementById('bestSession');
    const consistencyEl = document.getElementById('consistencyScore');
    
    if (bestEl) {
        bestEl.textContent = `${bestAccuracy}%`;
        bestEl.style.color = bestAccuracy >= 90 ? '#4CAF50' : bestAccuracy >= 75 ? '#FF9800' : '#F44336';
    }
    
    if (consistencyEl) {
        consistencyEl.textContent = `${recentSessions.length} วัน`;
        consistencyEl.style.color = recentSessions.length >= 5 ? '#4CAF50' : recentSessions.length >= 3 ? '#FF9800' : '#F44336';
    }
}

// แก้ไขฟังก์ชัน updateRecommendations ที่บรรทัด 542
function updateRecommendations() {
    if (exerciseHistory.length === 0) return;

    // ✅ แก้ไขตรงนี้ - เปลี่ยนจาก session เป็น s
    const averageAccuracy = exerciseHistory.reduce((sum, s) => sum + (s.accuracy || 0), 0) / exerciseHistory.length;

    const exerciseRecs = document.getElementById('exerciseRecommendations');
    if (!exerciseRecs) return;
    
    exerciseRecs.innerHTML = '';

    if (averageAccuracy < 70) {
        exerciseRecs.innerHTML = `
            <li>ควรฝึกท่าทางพื้นฐานให้ชำนาญและถูกต้องก่อน</li>
            <li>เพิ่มเวลาการฝึกเป็น 2 ครั้งต่อวัน</li>
            <li>ขอคำแนะนำเพิ่มเติมจากผู้เชี่ยวชาญ</li>
        `;
    } else if (averageAccuracy < 85) {
        exerciseRecs.innerHTML = `
            <li>ออกกำลังกายแขนและขาด้านซ้าย 3 ครั้งต่อสัปดาห์</li>
            <li>ฝึกการทรงตัวโดยการยืนบนขาเดียว</li>
            <li>เพิ่มความเร็วในการทำท่าทางเมื่อทำได้ถูกต้องแล้ว</li>
        `;
    } else {
        exerciseRecs.innerHTML = `
            <li>ทำได้ดีมาก! คงความสม่ำเสมอต่อไป</li>
            <li>ลองท่าทางที่ท้าทายมากขึ้น</li>
            <li>ช่วยแนะนำผู้ป่วยรายอื่น</li>
        `;
    }
}

function updateChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (exerciseHistory.length === 0) {
        drawEmptyChart(ctx, canvas);
        return;
    }
    
    const recentData = exerciseHistory.slice(0, 7).reverse();
    const data = recentData.map(session => session.accuracy || 0);
    const labels = recentData.map(session => {
        try {
            const date = new Date(session.timestamp);
            return date.toLocaleDateString('th-TH', { weekday: 'short' });
        } catch (e) {
            return 'N/A';
        }
    });
    
    drawChart(ctx, canvas, data, labels);
}

function drawChart(ctx, canvas, data, labels) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const maxValue = 100;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        
        ctx.fillStyle = '#718096';
        ctx.font = '10px Kanit';
        ctx.textAlign = 'right';
        const value = maxValue - (maxValue / 5) * i;
        ctx.fillText(`${value}%`, padding - 10, y + 3);
    }
    
    if (data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            const x = padding + (chartWidth / Math.max(1, data.length - 1)) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
        }
    }
    
    if (data.length > 1) {
        ctx.strokeStyle = '#4fd1c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / Math.max(1, data.length - 1)) * index;
            const y = padding + chartHeight - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    data.forEach((value, index) => {
        const x = padding + (chartWidth / Math.max(1, data.length - 1)) * index;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;
        
        ctx.fillStyle = '#38b2ac';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#2d3748';
        ctx.font = '10px Kanit';
        ctx.textAlign = 'center';
        ctx.fillText(`${value}%`, x, y - 10);
    });
    
    ctx.fillStyle = '#718096';
    ctx.font = '10px Kanit';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + (chartWidth / Math.max(1, data.length - 1)) * index;
        ctx.fillText(label, x, canvas.height - 10);
    });
}

function drawEmptyChart(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#718096';
    ctx.font = '16px Kanit';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีข้อมูลการออกกำลังกาย', canvas.width / 2, canvas.height / 2);
}

// ===== NAVIGATION & UI =====
function refreshData() {
    console.log('Refreshing data...');
    exerciseHistory = [];
    currentPage = 1;
    loadExerciseData();
}

function addRefreshButton() {
    const tableControls = document.querySelector('.table-controls');
    if (tableControls && !document.getElementById('refreshBtn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshBtn';
        refreshBtn.className = 'nav-btn';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> รีเฟรช';
        refreshBtn.onclick = refreshData;
        tableControls.appendChild(refreshBtn);
    }
}

function initTableFunctions() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredHistory = exerciseHistory.filter(session => 
                session.exerciseName.toLowerCase().includes(searchTerm) ||
                session.date.includes(searchTerm)
            );
            
            displayFilteredResults(filteredHistory);
        });
    }

    const entriesSelect = document.getElementById('entriesSelect');
    if (entriesSelect) {
        entriesSelect.addEventListener('change', function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            updateTable();
        });
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(exerciseHistory.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateTable();
            }
        });
    }
}
function getPerformanceLevel(actualReps, exerciseName) {
    // เกณฑ์แต่ละท่า
    const criteria = {
        'shoulder-flexion': { good: 10, excellent: 15 },
        'lateral-trunk': { good: 5, excellent: 10 },
        'knee-extension': { good: 10, excellent: 15 }
    };
    
    const standard = criteria[exerciseName] || { good: 10, excellent: 15 };
    
    if (actualReps >= standard.excellent) {
        return '<span class="level-badge excellent">ดีเยี่ยม ⭐</span>';
    } else if (actualReps >= standard.good) {
        return '<span class="level-badge good">ดี ✓</span>';
    } else {
        return '<span class="level-badge needs-work">ควรพัฒนา</span>';
    }
}
function displayFilteredResults(filteredData) {
    const tbody = document.getElementById('therapyTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="8" style="text-align: center; color: #718096; padding: 2rem;">ไม่พบข้อมูลที่ค้นหา</td>`;
        return;
    }

    filteredData.forEach(session => {
        const row = tbody.insertRow();
        const hasLeftRight = (session.actual_reps_left > 0 || session.actual_reps_right > 0);
        const leftReps = session.actual_reps_left || 0;
        const rightReps = session.actual_reps_right || 0;
        const totalReps = session.actual_reps || (leftReps + rightReps);
        
        row.innerHTML = `
            <td>${formatThaiDate(session.session_date)}</td>
            <td style="color: #718096;">${formatThaiTime(session.session_date)}</td>
            <td><strong>${session.exerciseName}</strong></td>
            <td style="text-align: center;">
                <span style="font-weight: 600; color: #3182ce;">
                    ${hasLeftRight ? leftReps + ' ครั้ง' : '-'}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-weight: 600; color: #38a169;">
                    ${hasLeftRight ? rightReps + ' ครั้ง' : '-'}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-weight: 700; color: #2563eb; font-size: 16px;">
                    ${totalReps} ครั้ง
                </span>
            </td>
            <td style="text-align: center;">
                <span class="accuracy-badge ${getAccuracyClass(session.accuracy)}">
                    ${session.accuracy}%
                </span>
            </td>
        `;
    });

    const tableInfoText = document.getElementById('tableInfoText');
    if (tableInfoText) {
        tableInfoText.textContent = 
            `แสดง 1 ถึง ${filteredData.length} จาก ${filteredData.length} รายการ`;
    }
}

function goBack() {
    showLoading('กำลังกลับไปหน้าหลัก...');
    setTimeout(() => {
        window.location.href = 'patient-dashboard.html';
    }, 1000);
}

function exitSystem() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        showLoading('กำลังออกจากระบบ...');
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

function printReport() {
    showLoading('กำลังเตรียมรายงาน...');
    setTimeout(() => {
        window.print();
        hideLoading();
    }, 1000);
}

function continueExercise() {
    showLoading('กำลังเตรียมโปรแกรมการออกกำลังกาย...');
    setTimeout(() => {
        window.location.href = 'patient-dashboard.html';
    }, 1000);
}

function showLoading(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        const messageElement = loadingOverlay.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message || 'กำลังประมวลผล...';
        }
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// ===== INITIALIZATION =====
window.addEventListener('load', async function() {
    console.log('=== TIMEZONE DEBUG ===');
    
    // ทดสอบเวลาปัจจุบัน
    const now = new Date();
    console.log('🕐 Browser Local Time:', now.toString());
    console.log('🌍 UTC Time:', now.toISOString());
    console.log('🇹🇭 Bangkok Time:', now.toLocaleString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }));
    
    // ทดสอบการแปลงจาก database
    const testDBDate = '2025-01-06T13:28:00.000Z'; // ตัวอย่าง UTC
    const testDate = new Date(testDBDate);
    console.log('---');
    console.log('📅 DB Date (UTC):', testDBDate);
    console.log('🔄 Formatted Thai:', formatThaiDateTime(testDBDate));
    console.log('==================');
    
    const token = getAuthToken();
    if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        window.location.href = 'login.html';
        return;
    }
    
    const thaiDateTime = getThaiDateTime();
    
    const assessmentDateEl = document.getElementById('assessmentDate');
    if (assessmentDateEl) {
        assessmentDateEl.textContent = thaiDateTime.fullDate;
    }
    
    showLoading('กำลังโหลดข้อมูล...');
    
    try {
        await Promise.all([
            loadUserProfile(),
            loadExerciseData(),
            loadExerciseStats()
        ]);
        
        initTableFunctions();
        
        console.log('✅ Report initialized');
        console.log('📊 Sessions:', exerciseHistory.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('เกิดข้อผิดพลาด');
    } finally {
        hideLoading();
    }
});
// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        refreshData();
    }
    if (event.key === 'F5') {
        event.preventDefault();
        refreshData();
    }
});

console.log("✅ report.js loaded");

// ===== DEBUG UTILITIES =====
window.debugReport = {
    exerciseHistory: () => exerciseHistory,
    token: () => getAuthToken(),
    userData: () => getUserData(),
    refreshData: refreshData,
    getCurrentThaiTime: () => getThaiDateTime(),
    clearData: () => {
        localStorage.removeItem('exerciseHistory');
        localStorage.removeItem('lastSessionData');
        console.log('All data cleared');
        refreshData();
    }
};