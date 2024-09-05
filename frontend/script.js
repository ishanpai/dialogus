// Voice Recognition part
const botImage = document.getElementById('botImage');

function playGif() {
    botImage.src = "robot_talk.gif";
}

function pauseGif() {
    botImage.src = "robot_talk.jpg";
}

let voices = [];

function populateVoiceList() {
    voices = speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.default) {
            option.textContent += ' -- DEFAULT';
        }
        option.value = index;
        voiceSelect.appendChild(option);
    });
}

speechSynthesis.onvoiceschanged = populateVoiceList;
populateVoiceList();

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

const recognition = new SpeechRecognition();
const speechRecognitionList = new SpeechGrammarList();
const websocket = new WebSocket("ws://localhost:8765/");

recognition.grammars = speechRecognitionList;
recognition.continuous = false;
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// SpeechSynthesis
let synthesis = null
if ('speechSynthesis' in window) {
    synthesis = window.speechSynthesis;
} else {
    console.log('Text-to-speech not supported.');
}
function speak(message) {
    if (synthesis) {
        synthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(message);
        const voiceSelect = document.getElementById('voiceSelect');
        const selectedVoice = voices[voiceSelect.value];
        utterance.voice = selectedVoice;
        utterance.rate = 1;
        synthesis.speak(utterance);
        utterance.onend = () => {
            recognition.start();
        }
    }
}

// Interrupt Dialogus
document.getElementById('interrupt').onclick = function() {
    if (synthesis) {
        synthesis.cancel();
        pauseGif()
    }
}

// Start recording
document.getElementById('record').onclick = function() {
    recognition.start();
}

// Stop recording
document.getElementById('stop').onclick = function() {
    recognition.stop();
    console.log('Stopped recording.');
}

// Output
recognition.onresult = async function(event) {
    const lastItem = event.results[event.results.length - 1]
    const transcript = lastItem[0].transcript
    // document.getElementById('user').textContent = transcript;
    recognition.stop();
    const messageToSend = {"topic": "speech_recognition", "message": transcript};
    websocket.send(JSON.stringify(messageToSend));
    const newText = "<p>" + transcript + "</p>";
    document.getElementById('output').insertAdjacentHTML("beforeend", newText);
    document.getElementById('output').scrollTop = document.getElementById('output').scrollHeight
}

recognition.onspeechend = function() {
    recognition.stop();
    pauseGif()
    console.log('Stopped recording.');
}

// Listen for incoming messages
websocket.addEventListener("message", ({ data }) => {
const event = JSON.parse(data);
if (event.topic == "chatbot") {
    speak(event.message);
    playGif()
    const newBotText = "<p>" + event.message + "</p>";
    document.getElementById('output').insertAdjacentHTML("beforeend", newBotText);
    document.getElementById('output').scrollTop = document.getElementById('output').scrollHeight
}
});