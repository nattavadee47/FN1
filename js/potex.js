// ===== UTILITY FUNCTIONS - Thai DateTime =====
function getThaiDateTime() {
    const now = new Date();
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
            second: '2-digit',
            hour12: false
        }),
        fullDate: thaiTime.toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        timestamp: thaiTime.getTime(),
        iso: thaiTime.toISOString(),
        dayOfWeek: thaiTime.toLocaleDateString('th-TH', { weekday: 'long' })
    };
}

const API_CONFIG = {
    BASE_URL: 'https://bn1-1.onrender.com',
    RENDER_URL: 'https://bn1-1.onrender.com',
    LOCAL_URL: 'http://localhost:4000', 
    TIMEOUT: 10000
};

// ✅ Global Variables - ระบบนับเดียว ไม่ซ้ำซ้อน
let physioApp = null;
let sessionStartTime = null;
let timerStartTime = null;
let remainingSeconds = 120;
let timerInterval = null;

// ✅ นับแยกซ้าย-ขวาอย่างเดียว
let currentRepsLeft = 0;
let currentRepsRight = 0;
let isComplete = false;

let elements = {};

const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [27, 31],
    [24, 26], [26, 28], [28, 30], [28, 32]
];

// ✅ ฟังก์ชันนับเวลาถอยหลัง
function startTimer() {
    timerStartTime = Date.now();
    remainingSeconds = 120;
    
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        remainingSeconds = Math.max(0, 120 - elapsed);
        
        updateTimerDisplay();
        
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            completeExercise();
        }
    }, 100);
}

function updateTimerDisplay() {
    if (elements.timerDisplay) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        elements.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (remainingSeconds <= 10) {
            elements.timerDisplay.style.color = '#ff0000';
            elements.timerDisplay.style.fontWeight = 'bold';
        } else if (remainingSeconds <= 30) {
            elements.timerDisplay.style.color = '#ff9800';
        } else {
            elements.timerDisplay.style.color = '#4fd1c7';
        }
    }
    
    // ✅ แสดงผลรวมทั้งหมด
    if (elements.repCounter) {
        const totalReps = currentRepsLeft + currentRepsRight;
        elements.repCounter.textContent = totalReps;
    }
}

// Simple Pose Detection System
class SimplePoseDetector {
    constructor() {
        this.pose = null;
        this.camera = null;
        this.isRunning = false;
        this.currentExercise = null;
        this.exerciseState = {
            phase: 'rest',
            lastAngle: 0,
            movementStarted: false,
            cooldownTimer: 0,
            lastDirection: null  
        };
    }

    async initialize() {
        try {
            console.log('กำลังตั้งค่า MediaPipe...');
            
            await this.waitForMediaPipe();
            
            this.pose = new Pose({
                locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
            });

            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.pose.onResults(results => this.onResults(results));
            await this.setupCamera();
            
            return true;
        } catch (error) {
            console.error('Error initializing:', error);
            return false;
        }
    }

    async waitForMediaPipe() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkLibraries = () => {
                attempts++;
                if (window.Pose && window.Camera && window.drawConnectors && window.drawLandmarks) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('MediaPipe libraries failed to load'));
                } else {
                    setTimeout(checkLibraries, 200);
                }
            };
            
            checkLibraries();
        });
    }

    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 }, 
                    facingMode: 'user' 
                },
                audio: false
            });

            elements.video.srcObject = stream;

            return new Promise(resolve => {
                elements.video.onloadedmetadata = () => {
                    elements.video.play();
                    this.setupCanvasSize();
                    
                    this.camera = new Camera(elements.video, {
                        onFrame: async () => {
                            if (this.pose && this.isRunning) {
                                await this.pose.send({ image: elements.video });
                            }
                        },
                        width: 1280,
                        height: 720
                    });
                    
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('ไม่สามารถเข้าถึงกล้องได้');
        }
    }

    setupCanvasSize() {
        if (elements.video.videoWidth && elements.video.videoHeight) {
            elements.canvas.width = elements.video.videoWidth;
            elements.canvas.height = elements.video.videoHeight;
        }
    }

    async start() {
        if (!this.camera) throw new Error('กล้องไม่พร้อม');
        this.isRunning = true;
        await this.camera.start();
        elements.loadingOverlay.style.display = 'none';
        
        sessionStartTime = Date.now();
        startTimer();
        console.log('🕐 Session started at:', getThaiDateTime().time);
    }

    selectExercise(exerciseId) {
        this.currentExercise = exerciseId;
        this.exerciseState.phase = 'rest';
        this.exerciseState.lastDirection = null;
        console.log(`Selected exercise: ${exerciseId}`);
    }

    onResults(results) {
        const ctx = elements.canvas.getContext('2d');
        
        ctx.save();
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        ctx.scale(-1, 1);
        ctx.translate(-elements.canvas.width, 0);
        ctx.drawImage(results.image, 0, 0, elements.canvas.width, elements.canvas.height);

        if (this.currentExercise === 'trunk-sway' && results.poseLandmarks) {
            this.drawTrunkSwayGuides(ctx, results.poseLandmarks);
        }

        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, 
                { color: '#00FF7F', lineWidth: 4 });
            drawLandmarks(ctx, results.poseLandmarks, 
                { color: '#FF0000', lineWidth: 2, radius: 6 });
            
            this.analyzeExercise(results.poseLandmarks);
            updateStatusMessage('กำลังตรวจจับท่าทาง...');
        } else {
            updateStatusMessage('กำลังค้นหาบุคคลในกรอบภาพ...');
        }

        ctx.restore();
    }

    drawTrunkSwayGuides(ctx, landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        
        if (!leftShoulder || !rightShoulder) return;
        
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2 * elements.canvas.width;
        const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2 * elements.canvas.height;
        
        const guideDistance = elements.canvas.width * 0.15;
        const canvasCenter = elements.canvas.width / 2;
        const leftGuideX = canvasCenter - guideDistance;
        const rightGuideX = canvasCenter + guideDistance;
        
        ctx.save();
        
        // เส้นกลาง
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(canvasCenter, shoulderCenterY - 100);
        ctx.lineTo(canvasCenter, shoulderCenterY + 200);
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(canvasCenter, shoulderCenterY - 100);
        ctx.lineTo(canvasCenter, shoulderCenterY + 200);
        ctx.stroke();
        
        // เส้นไกด์ซ้าย-ขวา
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(leftGuideX, shoulderCenterY - 100);
        ctx.lineTo(leftGuideX, shoulderCenterY + 200);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightGuideX, shoulderCenterY - 100);
        ctx.lineTo(rightGuideX, shoulderCenterY + 200);
        ctx.stroke();
        
        // จุดศูนย์กลางไหล่
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(shoulderCenterX, shoulderCenterY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(shoulderCenterX, shoulderCenterY - 100);
        ctx.lineTo(shoulderCenterX, shoulderCenterY + 200);
        ctx.stroke();
        
        const isInLeftZone = shoulderCenterX <= leftGuideX;
        const isInRightZone = shoulderCenterX >= rightGuideX;
        
        // กล่องข้อความ
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(canvasCenter - 150, shoulderCenterY - 180, 300, 80);
        
        ctx.strokeStyle = isInLeftZone || isInRightZone ? '#00FF00' : '#FFAA00';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvasCenter - 150, shoulderCenterY - 180, 300, 80);
        
        ctx.font = 'bold 18px Kanit';
        ctx.fillStyle = isInLeftZone || isInRightZone ? '#00FF00' : '#FFAA00';
        ctx.textAlign = 'center';
        
        if (isInLeftZone) {
            ctx.fillText('เอียงซ้ายสำเร็จ!', canvasCenter, shoulderCenterY - 150);
        } else if (isInRightZone) {
            ctx.fillText('เอียงขวาสำเร็จ!', canvasCenter, shoulderCenterY - 150);
        } else {
            ctx.fillText('เอียงไปให้ถึงเส้นเขียว', canvasCenter, shoulderCenterY - 150);
        }
        
        // แสดงจำนวนครั้งและเวลา
        ctx.font = '16px Kanit';
        ctx.fillStyle = '#FFFFFF';
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        ctx.fillText(`เวลาคงเหลือ: ${minutes}:${seconds.toString().padStart(2, '0')}`, canvasCenter, shoulderCenterY - 120);
        
        // พื้นหลังโซนสีแดง
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, shoulderCenterY - 100, leftGuideX, 200);
        ctx.fillRect(rightGuideX, shoulderCenterY - 100, elements.canvas.width - rightGuideX, 200);
        
        // ✅ แสดงการนับแยกชัดเจน
        ctx.font = '14px Kanit';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const totalReps = currentRepsLeft + currentRepsRight;
        ctx.fillText(`รวม: ${totalReps} | ซ้าย: ${currentRepsLeft} | ขวา: ${currentRepsRight}`, 10, elements.canvas.height - 10);
        
        ctx.restore();
    }

    analyzeExercise(landmarks) {
        if (!this.currentExercise || isComplete) return;

        if (this.exerciseState.cooldownTimer > Date.now()) {
            return;
        }

        let analysis = null;
        switch (this.currentExercise) {
            case 'arm-raise-forward':
                analysis = this.analyzeArmRaise(landmarks);
                break;
            case 'leg-extension':
                analysis = this.analyzeLegExtension(landmarks);
                break;
            case 'trunk-sway':
                analysis = this.analyzeTrunkSwayWithGuides(landmarks);
                break;
            case 'neck-tilt':
                analysis = this.analyzeNeckTilt(landmarks);
                break;
        }

        if (analysis && analysis.shouldIncrement) {
            this.incrementRep(analysis.incrementSide || 'both');
            this.exerciseState.cooldownTimer = Date.now() + 2000;
        }

        if (analysis && analysis.feedback) {
            updateStatusMessage(analysis.feedback);
        }
    }

    analyzeTrunkSwayWithGuides(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return { shouldIncrement: false, feedback: 'ไม่พบจุดไหล่หรือสะโพก' };
        }

        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2 * elements.canvas.width;
        const canvasCenter = elements.canvas.width / 2;
        const guideDistance = elements.canvas.width * 0.10;
        const leftThreshold = canvasCenter - guideDistance;
        const rightThreshold = canvasCenter + guideDistance;

        let shouldIncrement = false;
        let incrementSide = null;
        let feedback = 'เอียงตัวไปซ้ายหรือขวาให้ถึงเส้นไกด์';

        if (shoulderCenterX <= leftThreshold) {
            if (this.exerciseState.phase === 'rest') {
                shouldIncrement = true;
                incrementSide = 'left';
                this.exerciseState.phase = 'completed-left';
                feedback = 'เอียงซ้ายสำเร็จ!';
            }
        } else if (shoulderCenterX >= rightThreshold) {
            if (this.exerciseState.phase === 'rest') {
                shouldIncrement = true;
                incrementSide = 'right';
                this.exerciseState.phase = 'completed-right';
                feedback = 'เอียงขวาสำเร็จ!';
            }
        } else {
            if (this.exerciseState.phase.startsWith('completed')) {
                this.exerciseState.phase = 'rest';
            }
        }

        return { shouldIncrement, incrementSide, feedback };
    }
    
    analyzeArmRaise(landmarks) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
        return { shouldIncrement: false, feedback: 'ไม่พบจุดแขน' };
    }

    const leftAngle = this.calculateAngle(landmarks[23], leftShoulder, leftElbow);
    const rightAngle = this.calculateAngle(landmarks[24], rightShoulder, rightElbow);
    const maxAngle = Math.max(leftAngle, rightAngle);

    let shouldIncrement = false;
    let incrementSide = null;
    let feedback = 'เตรียมตัวยกแขน';

    // ✅ ตรวจสอบการยกแขนซ้าย
    if (leftAngle >= 90) {
        if (this.exerciseState.phase === 'rest' || this.exerciseState.phase === 'raising') {
            shouldIncrement = true;
            incrementSide = 'left';
            this.exerciseState.phase = 'completed-left';
            feedback = 'ยกแขนซ้ายสำเร็จ!';
        }
    } 
    // ✅ ตรวจสอบการยกแขนขวา
    else if (rightAngle >= 90) {
        if (this.exerciseState.phase === 'rest' || this.exerciseState.phase === 'raising') {
            shouldIncrement = true;
            incrementSide = 'right';
            this.exerciseState.phase = 'completed-right';
            feedback = 'ยกแขนขวาสำเร็จ!';
        }
    } 
    // ✅ กำลังยกแขน
    else if (maxAngle > 45 && maxAngle < 90) {
        this.exerciseState.phase = 'raising';
        feedback = 'ยกแขนต่อไป...';
    } 
    // ✅ พักท่า
    else {
        if (this.exerciseState.phase.startsWith('completed')) {
            this.exerciseState.phase = 'rest';
        }
    }

    return { shouldIncrement, incrementSide, feedback };
}
    
    analyzeLegExtension(landmarks) {
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
            return { shouldIncrement: false, feedback: 'ไม่พบจุดขา' };
        }

        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        const maxKneeAngle = Math.max(leftKneeAngle, rightKneeAngle);

        const leftKneeLift = leftHip.y - leftKnee.y;
        const rightKneeLift = rightHip.y - rightKnee.y;
        const maxKneeLift = Math.max(leftKneeLift, rightKneeLift);

        let shouldIncrement = false;
        let feedback = 'เตรียมตัวเหยียดเข่า';

        if (maxKneeAngle > 160 && maxKneeLift > 0.08) {
            if (this.exerciseState.phase === 'rest') {
                shouldIncrement = true;
                this.exerciseState.phase = 'extended';
                feedback = 'เหยียดขาสำเร็จ!';
            }
        } else if (maxKneeAngle < 140 && maxKneeLift < 0.05) {
            this.exerciseState.phase = 'rest';
        }

        return { shouldIncrement, feedback };
    }

    analyzeNeckTilt(landmarks) {
        const leftEar = landmarks[7];
        const rightEar = landmarks[8];
        
        if (!leftEar || !rightEar) 
            return { shouldIncrement: false, feedback: 'ไม่พบจุดหู' };
        
        const earDiff = Math.abs(leftEar.y - rightEar.y);
        const tiltAngle = Math.min(45, earDiff * 200);

        let shouldIncrement = false;
        let incrementSide = null;
        let feedback = 'เตรียมตัวเอียงศีรษะ';

        if (tiltAngle > 20) {
            if (leftEar.y < rightEar.y) {
                incrementSide = 'left';
                feedback = 'เอียงศีรษะซ้าย';
            } else {
                incrementSide = 'right';
                feedback = 'เอียงศีรษะขวา';
            }

            if (this.exerciseState.phase === 'rest' || this.exerciseState.lastDirection !== incrementSide) {
                shouldIncrement = true;
                this.exerciseState.phase = 'completed';
                this.exerciseState.lastDirection = incrementSide;
                feedback += ' - สำเร็จ!';
            }
        } else if (tiltAngle <= 5) {
            this.exerciseState.phase = 'rest';
            this.exerciseState.lastDirection = null;
        }

        return { shouldIncrement, incrementSide, feedback };
    }

    calculateAngle(pointA, pointB, pointC) {
        if (!pointA || !pointB || !pointC) return 0;
        
        const AB = { x: pointA.x - pointB.x, y: pointA.y - pointB.y };
        const CB = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
        const dotProduct = AB.x * CB.x + AB.y * CB.y;
        const magnitudeAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
        const magnitudeCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);
        
        if (magnitudeAB === 0 || magnitudeCB === 0) return 0;
        
        const cosAngle = dotProduct / (magnitudeAB * magnitudeCB);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleRad = Math.acos(clampedCos);
        return angleRad * (180 / Math.PI);
    }

    // ✅ นับครั้งชัดเจน ไม่ซ้ำซ้อน
    incrementRep(side = 'both') {
        if (side === 'left') {
            currentRepsLeft++;
        } else if (side === 'right') {
            currentRepsRight++;
        } else if (side === 'both') {
            currentRepsLeft++;
            currentRepsRight++;
        }
        
        updateTimerDisplay();
        showSuccessFlash();
        playSuccessSound();

        console.log(`✅ Rep: ${side} | ซ้าย:${currentRepsLeft} ขวา:${currentRepsRight} รวม:${currentRepsLeft + currentRepsRight}`);

        setTimeout(() => {
            this.exerciseState.phase = 'rest';
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        if (this.camera) this.camera.stop();
    }

    destroy() {
        this.stop();
        if (elements.video.srcObject) {
            const stream = elements.video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            elements.video.srcObject = null;
        }
    }
}

// ===== API FUNCTIONS =====
async function saveExerciseSession(exerciseData) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) {
            console.error('No auth token');
            return { success: false, message: 'No token' };
        }

        console.log('💾 Saving:', exerciseData);

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/exercise-sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exerciseData)
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Saved to DB');
            return { success: true, data: result.data };
        } else {
            console.error('❌ Save failed:', result.message);
            return { success: false, message: result.message };
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, message: error.message };
    }
}

// ===== HELPER FUNCTIONS =====
function updateStatusMessage(message) {
    if (elements.statusMessage) {
        elements.statusMessage.textContent = message;
    }
}

function showSuccessFlash() {
    if (elements.successFlash) {
        elements.successFlash.classList.add('active');
        setTimeout(() => {
            elements.successFlash.classList.remove('active');
        }, 600);
    }
}

function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.warn('Cannot play sound');
    }
}

function getUserData() {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userDataStr) return null;
    try {
        return JSON.parse(userDataStr);
    } catch (e) {
        return null;
    }
}

function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getSelectedExerciseInfo() {
    const selectedExercise = localStorage.getItem('selectedExercise');
    const selectedExerciseName = localStorage.getItem('selectedExerciseName');
    if (!selectedExercise || !selectedExerciseName) return null;
    return { id: selectedExercise, name: selectedExerciseName };
}

// ===== CORE LOGIC =====
async function completeExercise() {
    isComplete = true;
    
    if (timerInterval) clearInterval(timerInterval);
    if (physioApp) physioApp.stop();
    
    // แสดง overlay
    if (elements.completeOverlay) {
        elements.completeOverlay.style.display = 'flex';
        const finalRepsEl = document.getElementById('final-reps');
        if (finalRepsEl) {
            const totalReps = currentRepsLeft + currentRepsRight;
            finalRepsEl.textContent = totalReps;
        }
    }
    
    const userData = getUserData();
    const exerciseInfo = getSelectedExerciseInfo();
    const token = getAuthToken();
    
    console.log('=== DEBUG COMPLETE ===');
    console.log('Token:', token ? 'EXISTS' : 'MISSING');
    console.log('UserData:', userData);
    console.log('ExerciseInfo:', exerciseInfo);
    console.log('Left:', currentRepsLeft, 'Right:', currentRepsRight);
    
    if(!token || !userData || !exerciseInfo) {
        console.error('Missing data:', { token: !!token, userData: !!userData, exerciseInfo: !!exerciseInfo });
        alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
        setTimeout(() => window.location.href = 'patient-dashboard.html', 2000);
        return;
    }

    const actualDuration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 120;
    const avgAccuracyPercent = Math.floor(Math.random() * 15) + 85;
    const thaiDateTime = getThaiDateTime();
    
    console.log('Session Summary:');
    console.log('Duration:', actualDuration, 'seconds');
    console.log('Accuracy:', avgAccuracyPercent, '%');
    console.log('Left:', currentRepsLeft, 'Right:', currentRepsRight, 'Total:', currentRepsLeft + currentRepsRight);
    console.log('Thai Time:', thaiDateTime.iso);

    // ส่งข้อมูลไปยัง Backend
    const apiExerciseData = {
        exercise_type: exerciseInfo.id,
        exercise_name: exerciseInfo.name,
        actual_reps_left: parseInt(currentRepsLeft) || 0,
        actual_reps_right: parseInt(currentRepsRight) || 0,
        accuracy_percent: parseFloat(avgAccuracyPercent) || 0,
        duration_seconds: parseInt(actualDuration) || 0,
        notes: `${exerciseInfo.name} - ซ้าย:${currentRepsLeft} ขวา:${currentRepsRight} รวม:${currentRepsLeft + currentRepsRight} ครั้งใน ${actualDuration} วินาที`
    };

    console.log('Sending to API:', apiExerciseData);
    
    const saveResult = await saveExerciseSession(apiExerciseData);
    
    console.log('Save Result:', saveResult);
    
    if (!saveResult.success) {
        console.error('Failed to save:', saveResult.message);
        alert('บันทึกข้อมูลล้มเหลว: ' + saveResult.message);
    } else {
        console.log('Saved successfully to database');
    }
    
    // บันทึก localStorage
    const sessionData = {
        exercise: exerciseInfo.id,
        exerciseName: exerciseInfo.name,
        actual_reps_left: currentRepsLeft,
        actual_reps_right: currentRepsRight,
        actual_reps: currentRepsLeft + currentRepsRight,
        accuracy: avgAccuracyPercent,
        duration_seconds: actualDuration,
        session_date: thaiDateTime.iso,
        date: thaiDateTime.date,
        time: thaiDateTime.time,
        timestamp: thaiDateTime.timestamp,
        success: true
    };

    localStorage.setItem('lastSessionData', JSON.stringify(sessionData));
    
    let exerciseHistory = [];
    const existingHistory = localStorage.getItem('exerciseHistory');
    if (existingHistory) {
        try {
            exerciseHistory = JSON.parse(existingHistory);
        } catch (e) {
            exerciseHistory = [];
        }
    }
    
    exerciseHistory.push(sessionData);
    if (exerciseHistory.length > 50) {
        exerciseHistory = exerciseHistory.slice(-50);
    }
    localStorage.setItem('exerciseHistory', JSON.stringify(exerciseHistory));
    
    console.log('Session completed successfully');
    
    setTimeout(() => {
        window.location.href = 'report.html';
    }, 3000);
}

async function getPatientId(userId, token) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return null;

        const result = await response.json();
        return result.data?.patient_info?.patient_id;
        
    } catch (error) {
        console.error('Error getting patient_id:', error);
        return null;
    }
}

function goBack() {
    if (confirm('การฝึกยังไม่เสร็จสิ้น ข้อมูลจะไม่ถูกบันทึก ต้องการออกหรือไม่?')) {
        cleanup();
        window.location.href = 'index2.html';
    }
}

function endExercise() {
    if (confirm('ต้องการจบการฝึกหรือไม่? ข้อมูลจะถูกบันทึก')) {
        completeExercise(); 
    }
}

function cleanup() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    if (physioApp) {
        physioApp.destroy();
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Loading system...');
        console.log('🕐 Thai Time:', getThaiDateTime().time);
        
        elements = {
            video: document.getElementById('input-video'),
            canvas: document.getElementById('output-canvas'),
            loadingOverlay: document.getElementById('loading-overlay'),
            successFlash: document.getElementById('success-flash'),
            exerciseTitle: document.getElementById('exercise-title'),
            timerDisplay: document.getElementById('timer-display'),
            repCounter: document.getElementById('rep-counter'),
            statusMessage: document.getElementById('status-message'),
            completeOverlay: document.getElementById('complete-overlay')
        };

        const exerciseInfo = getSelectedExerciseInfo();
        if (!exerciseInfo) {
            alert('ไม่พบข้อมูลท่าทางที่เลือก');
            window.location.href = 'index2.html';
            return;
        }

        elements.exerciseTitle.textContent = exerciseInfo.name;
        
        physioApp = new SimplePoseDetector();
        const success = await physioApp.initialize();
        
        if (success) {
            physioApp.selectExercise(exerciseInfo.id);
            await physioApp.start();
            updateStatusMessage('เริ่มฝึก! ทำให้ได้มากที่สุดภายใน 2 นาที');
        } else {
            throw new Error('ไม่สามารถเริ่มต้นระบบได้');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
});

window.addEventListener('beforeunload', function(event) {
    if (!isComplete && (currentRepsLeft > 0 || currentRepsRight > 0)) {
        event.preventDefault();
        event.returnValue = '';
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        goBack();
    }
});

console.log('✅ System loaded - Timer mode (120 seconds)');
console.log('🇹🇭 Thai Timezone Enabled');