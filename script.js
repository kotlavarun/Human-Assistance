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

    if (transcript.includes('open the app')) {
        window.location.href = 'app.html';
    }
});

recognition.addEventListener('end', recognition.start);
recognition.start();
