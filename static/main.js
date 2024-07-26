const player = document.getElementById('audioPlayer');

const textContainer = document.querySelector('.textContainer');



var playheadInterval;

var audioDuration;

function movePlayhead(audioPlayer) {
    const playhead = document.getElementById('playhead');
    const containerWidth = document.getElementById('beatContainer').offsetWidth; // Width of the container
    const duration = audioDuration;// Duration of the audio in seconds

    console.log(containerWidth, duration);

    // Calculate pixels per second
    const pixelsPerSecond = containerWidth / duration;

    clearInterval(playheadInterval);
    playhead.style.left = '0px'; // Reset position at the start

    playheadInterval = setInterval(function () {
        if (!audioPlayer.paused && !audioPlayer.ended) {
            // Calculate new position based on pixels per second
            let newPosition = parseFloat(playhead.style.left, 10) + (pixelsPerSecond * 0.1); // Multiply by 0.05 because the interval is 50 milliseconds
            playhead.style.left = `${newPosition}px`;
        }
    }, 100); // Update every 50 milliseconds
}


// Ensure you have a function to clear the interval when the audio stops or ends
document.getElementById('audioPlayer').addEventListener('ended', function () {
    clearInterval(playheadInterval);
    document.getElementById('playhead').style.left = '0px'; // Optionally reset the playhead
});

document.getElementById('audioPlayer').addEventListener('pause', function () {
    clearInterval(playheadInterval);
});

function playAudio() {
    var file = document.getElementById("audioFile").files[0];
    if (file) {
        var audioPlayer = document.getElementById("audioPlayer");
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.style.display = "block";
        audioPlayer.addEventListener('loadedmetadata', function () {
            audioDuration = audioPlayer.duration; // Set the duration once metadata is loaded
            console.log("Audio Duration: " + audioDuration + " seconds"); // Optional: Log duration to console
            movePlayhead(audioPlayer);
        });
        audioPlayer.play();
    } else {
        alert("Please upload an MP3 file first.");
    }
}


function processAudio() {
    const fileInput = document.getElementById('audioFile');
    const thresholdInput = document.getElementById('threshold');
    const beatContainer = document.getElementById('beatContainer');
    const waveformCanvas = document.getElementById('waveformCanvas');
    const audioPlayer = document.getElementById('audioPlayer');

    if (fileInput.files.length === 0) {
        alert("Please select an audio file first.");
        return;
    }

    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = function (event) {
        audioContext.decodeAudioData(event.target.result, function (buffer) {
            const channelData = buffer.getChannelData(0); // Assume mono or just use the first channel
            const sampleRate = buffer.sampleRate;
            displayBeats(channelData, beatContainer, audioPlayer, event.target.result, buffer);
            const beats = detectBeats(channelData, sampleRate, thresholdInput.value);

            drawBeats(beats, beatContainer, buffer.duration);
        }, function (error) {
            console.error("Error decoding audio data: " + error);
        });
    };

    reader.readAsArrayBuffer(fileInput.files[0]);
}


function detectBeats(data, sampleRate, threshold) {
    const beats = [];
    let minSamplesBetweenBeats = sampleRate / 2; // Minimum half-second between beats
    let lastBeatIndex = -minSamplesBetweenBeats;

    threshold = threshold / 100; // Convert threshold to match amplitude range of audio data

    for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) {
            if (i - lastBeatIndex > minSamplesBetweenBeats) {
                beats.push(i / sampleRate); // Store beat time in seconds
                lastBeatIndex = i;
            }
        }
    }
    return beats;
}

function displayBeats(data, beatContainer, audioPlayer, audioData, buffer) {
    const canvas = document.getElementById('waveformCanvas');
    const durationInSeconds = buffer.duration;
    canvas.width = durationInSeconds * 20; // 20 pixels per second
    drawWaveform(data, canvas, durationInSeconds);

    const blob = new Blob([audioData], { type: 'audio/mp3' });
    audioPlayer.src = URL.createObjectURL(blob);
    audioPlayer.hidden = false;
}

function drawWaveform(data, canvas, duration) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height); // Clear previous drawings
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    const step = Math.ceil(data.length / width);
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        const yLow = ((min + 1) / 2) * height;
        const yHigh = ((max + 1) / 2) * height;
        ctx.lineTo(i, yLow);
        ctx.lineTo(i, yHigh);
    }
    ctx.stroke();
}


function drawBeats(beats, beatContainer, duration) {
    beats.forEach(beat => {
        const beatLine = document.createElement('div');
        beatLine.className = 'beat';
        beatLine.style.left = `${(beat / duration) * beatContainer.offsetWidth}px`; // Position in pixels
        beatContainer.appendChild(beatLine);
    });
}


function getLyrics() {
    const fileInput = document.getElementById('audioFile');
    if (fileInput.files.length === 0) {
        alert("Please select an audio file first.");
        return;
    }

    const formData = new FormData();
    formData.append('audioFile', fileInput.files[0]);

    fetch('/upload_audio', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('outputContainer').textContent = JSON.stringify(data.output, null, 2);
        } else {
            document.getElementById('outputContainer').textContent = 'Error: ' + data.error;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('outputContainer').textContent = 'Failed to fetch data.';
    });
}