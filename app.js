const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let model;
let lastWarningTime = 0;
let warningRepeatCount = 0;

// Load the COCO-SSD model
cocoSsd.load().then(loadedModel => {
    model = loadedModel;
    startVideo();
});

// Start the video stream
function startVideo() {
    const constraints = {
        video: {
            facingMode: isMobileDevice() ? { exact: "environment" } : "user"
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        video.srcObject = stream;
        video.addEventListener('loadeddata', detectObjects);
    }).catch(err => {
        console.error("Error accessing webcam: " + err);
    });
}

// Function to detect if the device is mobile
function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

// Detect objects in the video stream
function detectObjects() {
    model.detect(video).then(predictions => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        let objectPositions = { 'left': 0, 'right': 0, 'center': 0 };

        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            context.strokeStyle = 'green';
            context.lineWidth = 4;
            context.strokeRect(x, y, width, height);
            context.font = '18px Arial';
            context.fillStyle = 'green';
            context.fillText(prediction.class, x, y > 10 ? y - 5 : 10);

            // Update object positions
            const centerX = x + width / 2;
            if (centerX < canvas.width / 3) {
                objectPositions['left'] += 1;
            } else if (centerX > 2 * canvas.width / 3) {
                objectPositions['right'] += 1;
            } else {
                objectPositions['center'] += 1;
            }
        });

        // Determine warning message based on object positions
        let warningMessage = "";
        if (objectPositions['left'] > 0) {
            warningMessage = "Move to the right to avoid collision.";
        } else if (objectPositions['right'] > 0) {
            warningMessage = "Move to the left to avoid collision.";
        } else if (objectPositions['center'] > 0) {
            warningMessage = "Object detected in front. Move to left or right to avoid collision.";
        }

        // Manage warning repetition and waiting time
        const currentTime = Date.now();
        if (warningMessage) {
            if (currentTime - lastWarningTime > 10000) {  // Wait for 10 seconds before repeating the warning
                warningRepeatCount = 0;
            }
            if (warningRepeatCount < 2) {  // Repeat warning maximum twice
                speak(warningMessage);
                lastWarningTime = currentTime;
                warningRepeatCount += 1;
            }
        }

        requestAnimationFrame(detectObjects);
    });
}

// Text-to-Speech
function speak(message) {
    const utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utterance);
}

// Voice Command "exit"
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.interimResults = true;

recognition.addEventListener('result', e => {
    const transcript = Array.from(e.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('')
        .toLowerCase();

    if (transcript.includes('exit')) {
        window.location.href = 'index.html';
    }
});

recognition.addEventListener('end', recognition.start);
recognition.start();