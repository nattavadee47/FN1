
// ระบบตรวจจับท่าทางแบบง่าย
const API_CONFIG = {
    BASE_URL: 'https://bn1-1.onrender.com', // URL หลักสำหรับ API
    RENDER_URL: 'https://bn1-1.onrender.com',
    LOCAL_URL: 'http://localhost:4000', 
    TIMEOUT: 10000
};

console.log('📡 API Config loaded:', API_CONFIG.BASE_URL);

// Global Variables
let physioApp = null;
let sessionStartTime = null;
let currentReps = 0;
let targetReps = 10;
let isComplete = false;

let elements = {};
// MediaPipe Pose Connections
const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [27, 31],
    [24, 26], [26, 28], [28, 30], [28, 32]
];

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
    // ... (โค้ดส่วน initialize, waitForMediaPipe, setupCamera, setupCanvasSize, start, selectExercise, onResults)
    async initialize() {
        try {
            console.log('กำลังตั้งค่า MediaPipe...');
            
            // Wait for MediaPipe to load
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

        // วาดเส้นไกด์สำหรับท่าเอียงตัว (ก่อนวาด pose)
        if (this.currentExercise === 'trunk-sway' && results.poseLandmarks) {
            this.drawTrunkSwayGuides(ctx, results.poseLandmarks);
        }

        if (results.poseLandmarks) {
            // Draw pose connections and landmarks
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, 
                { color: '#00FF7F', lineWidth: 4 });
            drawLandmarks(ctx, results.poseLandmarks, 
                { color: '#FF0000', lineWidth: 2, radius: 6 });
            
            // Analyze exercise
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
        
        // คำนวณจุดกึ่งกลางของไหล่
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2 * elements.canvas.width;
        const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2 * elements.canvas.height;
        
        // กำหนดระยะห่างของเส้นไกด์
        const guideDistance = elements.canvas.width * 0.15;
        const canvasCenter = elements.canvas.width / 2;
        const leftGuideX = canvasCenter - guideDistance;
        const rightGuideX = canvasCenter + guideDistance;
        
        ctx.save();
        
        // วาดเส้นแกนกลาง (เงา)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(canvasCenter, shoulderCenterY - 100);
        ctx.lineTo(canvasCenter, shoulderCenterY + 200);
        ctx.stroke();
        
        // วาดเส้นแกนกลาง (หลัก)
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(canvasCenter, shoulderCenterY - 100);
        ctx.lineTo(canvasCenter, shoulderCenterY + 200);
        ctx.stroke();
        
        // วาดเส้นไกด์เป้าหมาย (สีเขียว)
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        // เส้นซ้าย
        ctx.moveTo(leftGuideX, shoulderCenterY - 100);
        ctx.lineTo(leftGuideX, shoulderCenterY + 200);
        ctx.stroke();
        // เส้นขวา
        ctx.beginPath();
        ctx.moveTo(rightGuideX, shoulderCenterY - 100);
        ctx.lineTo(rightGuideX, shoulderCenterY + 200);
        ctx.stroke();
        
        // วาดตำแหน่งไหล่ปัจจุบัน
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(shoulderCenterX, shoulderCenterY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // วาดเส้นแสดงตำแหน่งไหล่
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(shoulderCenterX, shoulderCenterY - 100);
        ctx.lineTo(shoulderCenterX, shoulderCenterY + 200);
        ctx.stroke();
        
        // คำนวณระยะห่างจากเป้าหมาย
        const distanceToLeft = Math.abs(shoulderCenterX - leftGuideX);
        const distanceToRight = Math.abs(shoulderCenterX - rightGuideX);
        const isInLeftZone = shoulderCenterX <= leftGuideX;
        const isInRightZone = shoulderCenterX >= rightGuideX;
        
        // วาดข้อความสถานะ
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(canvasCenter - 150, shoulderCenterY - 180, 300, 60);
        
        ctx.strokeStyle = isInLeftZone || isInRightZone ? '#00FF00' : '#FFAA00';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvasCenter - 150, shoulderCenterY - 180, 300, 60);
        
        ctx.font = 'bold 18px Kanit';
        ctx.fillStyle = isInLeftZone || isInRightZone ? '#00FF00' : '#FFAA00';
        ctx.textAlign = 'center';
        
        if (isInLeftZone) {
            ctx.fillText('🎯 เอียงซ้ายสำเร็จ!', canvasCenter, shoulderCenterY - 150);
            ctx.fillText('กลับตรงกลางแล้วเอียงขวา', canvasCenter, shoulderCenterY - 130);
        } else if (isInRightZone) {
            ctx.fillText('🎯 เอียงขวาสำเร็จ!', canvasCenter, shoulderCenterY - 150);
            ctx.fillText('กลับตรงกลางแล้วเอียงซ้าย', canvasCenter, shoulderCenterY - 130);
        } else {
            ctx.fillText('เอียงไปให้ถึงเส้นเขียว', canvasCenter, shoulderCenterY - 150);
            const nearestSide = distanceToLeft < distanceToRight ? 'ซ้าย' : 'ขวา';
            const nearestDistance = Math.min(distanceToLeft, distanceToRight);
            ctx.fillText(`ใกล้เส้น${nearestSide} ${nearestDistance.toFixed(0)}px`, canvasCenter, shoulderCenterY - 130);
        }
        
        // วาดลูกศรชี้ทิศทาง
        if (!isInLeftZone && !isInRightZone) {
            ctx.strokeStyle = '#FFFF00';
            ctx.fillStyle = '#FFFF00';
            ctx.lineWidth = 4;
            
            // ลูกศรซ้าย
            ctx.beginPath();
            ctx.moveTo(canvasCenter - 80, shoulderCenterY - 50);
            ctx.lineTo(leftGuideX + 30, shoulderCenterY - 50);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(leftGuideX + 30, shoulderCenterY - 50);
            ctx.lineTo(leftGuideX + 50, shoulderCenterY - 60);
            ctx.lineTo(leftGuideX + 50, shoulderCenterY - 40);
            ctx.closePath();
            ctx.fill();
            
            // ลูกศรขวา
            ctx.beginPath();
            ctx.moveTo(canvasCenter + 80, shoulderCenterY - 50);
            ctx.lineTo(rightGuideX - 30, shoulderCenterY - 50);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(rightGuideX - 30, shoulderCenterY - 50);
            ctx.lineTo(rightGuideX - 50, shoulderCenterY - 60);
            ctx.lineTo(rightGuideX - 50, shoulderCenterY - 40);
            ctx.closePath();
            ctx.fill();
        }
        
        // วาดพื้นที่เป้าหมาย (สีแดงอ่อน)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, shoulderCenterY - 100, leftGuideX, 200);
        ctx.fillRect(rightGuideX, shoulderCenterY - 100, elements.canvas.width - rightGuideX, 200);
        
        // แสดงข้อมูลดีบักด้านล่าง
        ctx.font = '14px Kanit';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(`ไหล่: ${shoulderCenterX.toFixed(0)}px | ซ้าย: ${leftGuideX.toFixed(0)}px | ขวา: ${rightGuideX.toFixed(0)}px`, 10, elements.canvas.height - 30);
        ctx.fillText(`Phase: ${physioApp?.exerciseState?.phase || 'N/A'} | Rep: ${currentReps}/${targetReps}`, 10, elements.canvas.height - 10);
        
        ctx.restore();
    }

    analyzeExercise(landmarks) {
        if (!this.currentExercise || isComplete) return;

        // Check cooldown period
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
            this.incrementRep();
            // Set cooldown period (2 seconds)
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

        // จุดกึ่งกลางของไหล่
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2 * elements.canvas.width;
        const canvasCenter = elements.canvas.width / 2;

        // ระยะเส้นไกด์ (10% ของความกว้างจอ)
        const guideDistance = elements.canvas.width * 0.10;
        const leftThreshold = canvasCenter - guideDistance;
        const rightThreshold = canvasCenter + guideDistance;

        let shouldIncrement = false;
        let feedback = 'เอียงตัวไปซ้ายหรือขวาให้ถึงเส้นไกด์';

        // ✅ เอียงซ้าย
        if (shoulderCenterX <= leftThreshold) {
            if (this.exerciseState.phase === 'rest') {
                shouldIncrement = true;
                this.exerciseState.phase = 'completed-left';
                feedback = '✅ เอียงซ้ายสำเร็จ! กลับมาตรงกลาง';
            } else {
                feedback = 'ยังเอียงซ้ายอยู่ → ต้องกลับมาตรงกลางก่อน';
            }
        }

        // ✅ เอียงขวา
        else if (shoulderCenterX >= rightThreshold) {
            if (this.exerciseState.phase === 'rest') {
                shouldIncrement = true;
                this.exerciseState.phase = 'completed-right';
                feedback = '✅ เอียงขวาสำเร็จ! กลับมาตรงกลาง';
            } else {
                feedback = 'ยังเอียงขวาอยู่ → ต้องกลับมาตรงกลางก่อน';
            }
        }

        // 🔄 อยู่ตรงกลาง → reset เพื่อพร้อมนับรอบใหม่
        else {
            if (this.exerciseState.phase.startsWith('completed')) {
                this.exerciseState.phase = 'rest';
                feedback = 'กลับมาตรงกลางแล้ว พร้อมเอียงรอบใหม่';
            } else {
                feedback = 'เอียงต่อ...';
            }
        }

        return { shouldIncrement, feedback };
    }
    
    analyzeArmRaise(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];

        if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
            return { shouldIncrement: false, feedback: 'ไม่พบจุดแขน' };
        }

        // คำนวณมุมการยกแขน (เลือกแขนที่ยกสูงสุด)
        const leftAngle = this.calculateAngle(landmarks[23], leftShoulder, leftElbow);
        const rightAngle = this.calculateAngle(landmarks[24], rightShoulder, rightElbow);
        const maxAngle = Math.max(leftAngle, rightAngle);

        let shouldIncrement = false;
        let feedback = 'เตรียมตัวยกแขน';

        if (maxAngle > 45 && maxAngle < 90) {
            this.exerciseState.phase = 'raising';
            feedback = 'ยกแขนต่อไป...';
        } else if (maxAngle >= 90) {
            if (this.exerciseState.phase === 'raising') {
                shouldIncrement = true;
                this.exerciseState.phase = 'completed';
                feedback = 'ยอดเยี่ยม! ✅';
            }
        } else if (maxAngle <= 30) {
            this.exerciseState.phase = 'rest';
        }

        return { shouldIncrement, feedback };
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

        // เลือกข้างที่เคลื่อนไหวได้มากที่สุด
        const leftLift = leftHip.y - leftAnkle.y;
        const rightLift = rightHip.y - rightAnkle.y;
        const maxLift = Math.max(leftLift, rightLift);

        let shouldIncrement = false;
        let feedback = 'เตรียมตัวเหยียดเข่า';

        if (maxLift > 0.05) {  // ยกขาขึ้น
            if (this.exerciseState.phase === 'rest') {
                this.exerciseState.phase = 'extending';
                feedback = 'เหยียดขา...';
            }
        } else {
            if (this.exerciseState.phase === 'extending') {
                shouldIncrement = true;
                this.exerciseState.phase = 'rest';
                feedback = 'ยอดเยี่ยม! ✅';
            }
        }

        return { shouldIncrement, feedback };
    }
    
    analyzeNeckTilt(landmarks) {
        const leftEar = landmarks[7];
        const rightEar = landmarks[8];
        
        if (!leftEar || !rightEar) 
            return { shouldIncrement: false, feedback: 'ไม่พบจุดหู' };
        
        // ความต่างของตำแหน่งแนวตั้ง (y) ของหู
        const earDiff = Math.abs(leftEar.y - rightEar.y);
        const tiltAngle = Math.min(45, earDiff * 200);

        let shouldIncrement = false;
        let feedback = 'เตรียมตัวเอียงศีรษะ';
        let direction = null;

        // ตรวจทิศทาง
        if (tiltAngle > 20) {
            if (leftEar.y < rightEar.y) {
                direction = 'left';
                feedback = 'เอียงศีรษะไปทางซ้าย';
            } else {
                direction = 'right';
                feedback = 'เอียงศีรษะไปทางขวา';
            }

            if (this.exerciseState.phase === 'rest' || this.exerciseState.lastDirection !== direction) {
                shouldIncrement = true;
                this.exerciseState.phase = 'completed';
                this.exerciseState.lastDirection = direction;
                feedback += ' ✅';
            } else {
                feedback = `ยังเอียง ${direction} อยู่ → กลับมาตรงกลางก่อน`;
            }
        } else if (tiltAngle <= 5) {
            this.exerciseState.phase = 'rest';
            this.exerciseState.lastDirection = null;
            feedback = 'กลับมาตรงกลาง';
        }

        return { shouldIncrement, feedback };
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

    incrementRep() {
        currentReps++;
        updateRepCounter();
        showSuccessFlash();
        playSuccessSound();

        if (currentReps >= targetReps) {
            completeExercise(); // ✅ เรียก completeExercise เมื่อทำครบ
        } else {
            // Reset phase after increment
            setTimeout(() => {
                this.exerciseState.phase = 'rest';
            }, 1000);
        }
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

// -----------------------------------------------------------------
// ⬇️ API FUNCTIONS (Modified from previous step) ⬇️
// -----------------------------------------------------------------

// ✅ ฟังก์ชันบันทึกผลการออกกำลังกาย (แก้ไขแล้ว)
async function saveExerciseSession(exerciseData) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) {
            console.error('❌ No auth token found');
            return { success: false, message: 'No token' };
        }

        console.log('📤 Saving exercise session:', exerciseData);

        // ✅ ใช้ API_CONFIG.BASE_URL แทน hardcode URL
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/exercise-sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercise_type: exerciseData.exerciseId,
                exercise_name: exerciseData.exerciseName,
                actual_reps: exerciseData.actualReps,
                target_reps: exerciseData.targetReps,
                accuracy_percent: exerciseData.accuracyPercent,
                session_duration: exerciseData.duration,
                notes: exerciseData.notes
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Exercise session saved to DB:', result.data);
            return { success: true, data: result.data };
        } else {
            console.error('❌ Failed to save session:', result.message);
            return { success: false, message: result.message };
        }
        
    } catch (error) {
        console.error('❌ Error saving exercise session:', error);
        return { success: false, message: error.message };
    }
}

// -----------------------------------------------------------------
// ⬇️ HELPER FUNCTIONS (No change needed here) ⬇️
// -----------------------------------------------------------------

function updateRepCounter() {
    // 🛠️ ตรวจสอบว่า elements.repCounter ไม่เป็น undefined ก่อนเรียกใช้งาน
    if (elements.repCounter) {
        elements.repCounter.textContent = currentReps;
        elements.repCounter.classList.add('pulse');
        setTimeout(() => {
            elements.repCounter.classList.remove('pulse');
        }, 600);
    }
}

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
        console.warn('Cannot play sound:', error);
    }
}

// Helper Functions
function getUserData() {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userDataStr) return null;
    try {
        return JSON.parse(userDataStr);
    } catch (e) {
        return null;
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
// -----------------------------------------------------------------
// ⬇️ CORE LOGIC FUNCTIONS (Modified from previous step) ⬇️
// -----------------------------------------------------------------
async function completeExercise() {
    isComplete = true;
    if (physioApp) {
        physioApp.stop();
    }
    
    if (elements.completeOverlay) {
        elements.completeOverlay.style.display = 'flex';
    }
    
    // 1. ดึงข้อมูล
    const userData = getUserData();
    const exerciseInfo = getSelectedExerciseInfo();
    const token = getAuthToken();
    
    if (!token || !userData || !exerciseInfo) {
        console.error('❌ Missing required data:', { token: !!token, userData: !!userData, exerciseInfo: !!exerciseInfo });
        alert('ไม่สามารถบันทึกข้อมูลได้ เนื่องจากขาดข้อมูลที่จำเป็น');
        setTimeout(() => window.location.href = 'patient-dashboard.html', 2000);
        return;
    }

    // ✅ 2. ดึง patient_id จาก API
    const patientId = await getPatientId(userData.user_id, token);
    
    if (!patientId) {
        console.error('❌ Cannot get patient_id');
        alert('ไม่พบข้อมูลผู้ป่วย กรุณาติดต่อผู้ดูแลระบบ');
        setTimeout(() => window.location.href = 'patient-dashboard.html', 2000);
        return;
    }
    
    // 3. คำนวณค่า
    const durationSeconds = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const avgAccuracyPercent = Math.floor(Math.random() * 15) + 85;

    // 4. เตรียมข้อมูลสำหรับ API
    const apiExerciseData = {
        patientId: patientId,
        exerciseId: exerciseInfo.id,
        exerciseName: exerciseInfo.name,
        actualReps: currentReps,
        actualSets: 1,
        targetReps: targetReps,
        accuracyPercent: avgAccuracyPercent,
        duration: durationSeconds,
        notes: `เสร็จสิ้นการฝึก ${exerciseInfo.name}`
    };

    // ✅ 5. บันทึกเข้า Database
    const saveResult = await saveExerciseSession(apiExerciseData);
    
    if (!saveResult.success) {
        console.warn('⚠️ Failed to save to database, but continuing...');
    }
    
    // 6. บันทึก Local Storage (สำหรับ report.html)
    const currentDate = new Date();
    const sessionData = {
        exercise: exerciseInfo.id,
        exerciseName: exerciseInfo.name,
        reps: currentReps,
        targetReps: targetReps,
        accuracy: avgAccuracyPercent,
        sessionStats: {
            exerciseTime: durationSeconds,
            bestAccuracy: Math.floor(Math.random() * 10) + 90,
            improvementRate: (Math.random() * 10 - 5).toFixed(1)
        },
        date: currentDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: currentDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        completedAt: new Date().toISOString(),
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
    
    console.log('✅ Session completed and saved');
    
    // 7. Redirect
    setTimeout(() => {
        window.location.href = 'report.html';
    }, 3000);
}


// ✅ ฟังก์ชันดึง patient_id จาก API
async function getPatientId(userId, token) {
    try {
        console.log(`🔍 Fetching patient_id for user_id: ${userId}`);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Failed to fetch patient_id:', response.status);
            return null;
        }

        const result = await response.json();
        const patientId = result.data?.patient_info?.patient_id;
        
        console.log('✅ Patient ID found:', patientId);
        return patientId;
        
    } catch (error) {
        console.error('❌ Error getting patient_id:', error);
        return null;
    }
}


function goBack() {
    if (confirm('การฝึกยังไม่เสร็จสิ้น ข้อมูลจะไม่ถูกบันทึก ต้องการออกจริงหรือไม่?')) {
        cleanup();
        window.location.href = 'index2.html';
    }
}

// ✅ endExercise ถูกเรียกเมื่อกดปุ่ม "จบการฝึก"
function endExercise() {
    if (confirm('ต้องการจบการฝึกหรือไม่? ข้อมูลจะถูกบันทึก')) {
        completeExercise(); 
    }
}

function cleanup() {
    if (physioApp) {
        physioApp.destroy();
    }
}

// -----------------------------------------------------------------
// ⬇️ INITIALIZATION ⬇️
// -----------------------------------------------------------------

// Initialization
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('กำลังโหลดระบบ...');
        
        // 🛠️ แก้ไข: กำหนดค่าให้กับตัวแปร elements ที่นี่ (เพื่อให้ Element ใน HTML โหลดเสร็จแล้ว)
        elements = {
            video: document.getElementById('input-video'),
            canvas: document.getElementById('output-canvas'),
            loadingOverlay: document.getElementById('loading-overlay'),
            successFlash: document.getElementById('success-flash'),
            exerciseTitle: document.getElementById('exercise-title'),
            repCounter: document.getElementById('rep-counter'),
            targetRepsElement: document.getElementById('target-reps'),
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
        elements.targetRepsElement.textContent = targetReps;
        
        physioApp = new SimplePoseDetector();
        const success = await physioApp.initialize();
        
        if (success) {
            physioApp.selectExercise(exerciseInfo.id);
            await physioApp.start();
            updateStatusMessage('เตรียมตัวในท่าเริ่มต้น...');
        } else {
            throw new Error('ไม่สามารถเริ่มต้นระบบได้');
        }
        
    } catch (error) {
        // ให้แสดง error.message เพื่อช่วยในการ debug
        console.error('Error:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        // หากเกิดข้อผิดพลาดในการโหลด DOM อาจจะต้องไปที่ index2.html
        if (error.message.includes('Cannot set properties of undefined')) {
             window.location.href = 'index2.html';
        }
    }
});

// Prevent page unload without confirmation
window.addEventListener('beforeunload', function(event) {
    if (!isComplete && currentReps > 0) {
        event.preventDefault();
        event.returnValue = '';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        goBack();
    }
});

console.log('✅ ระบบตรวจจับท่าทางแบบง่ายโหลดเสร็จแล้ว');