const player = document.getElementById('audioPlayer');

const textContainer = document.querySelector('.textContainer');


var playheadInterval;
let audioDuration;
let lowEnergyBeats = {};
let significantPoints = [];
let motion_mode = "3D";
let newsigPoints = [];
let lastClickedLabel = null; 
let transitionsAdded = false;
let draggingRegionId = null; 
let originalStartTime = null;
let waveform;
let deleteMode=false;
let deleteModeT = false;
let tablemade = false;
let updatedGreenRegions = [];
let updatedOrangeRegions = [];
let existingTransitionValues = {};
let existingValues = {};
let added = true;

const vibes = ['calm', 'epic', 'aggressive', 'chill', 'dark', 'energetic', 'ethereal', 'happy', 'romantic', 'sad', 'scary', 'sexy', 'uplifting'];
const textures = ['painting', 'calligraphy brush ink stroke', 'pastel watercolor on canvas', 'charcoal drawing', 'pencil drawing', 'impasto palette knife painting', 'mosaic', 'jagged/irregular', 'rubbed graphite on paper','digital glitch', 'splattered paint', 'graffiti', 'ink blots'];
const styles = ['abstract', 'impressionist', 'futuristic', 'contemporary', 'renaissance', 'surrealist', 'minimalist', 'digital', "neoclassic", "constructivism", "digital", "collage"];
const imageries = ['blossoming flower', 'chaotic intertwining lines', 'flowing waves', 'starry night', 'curvilinear intertwined circles', 'whirling lines', 'vibrant kaleidoscope of colors', 'interstellar light trails', 'abstract fractal patterns', 'dissolving geometric shards', 'diffused cosmic mists', 'translucent ripple effects'];
const colorOptions = ['black/white', 'myriad of color', 'sky blue (#00BFFF)', "fiery red (#db0804)", 'cherry blossom pink (#FFB7C5)', 'amber (#FFBF00)'];
const motions = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'spin_cw', 'spin_ccw', 'rotate_up', 'rotate_down', 'rotate_right', 'rotate_left', 'rotate_cw', 'rotate_ccw', 'none'];
const motions_3D = ['zoom_in', 'zoom_out', 'rotate_up', 'rotate_down', 'rotate_right', 'rotate_left', 'rotate_cw', 'rotate_ccw', 'none'];
const motions_2D = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'spin_cw', 'spin_ccw', 'none'];
const strengths = ['weak', 'normal', 'strong', 'vstrong'];


function movePlayheadOG() {
    const containerWidth = beatContainer.offsetWidth; // Width of the container
    const duration = audioPlayer.duration; // Duration of the audio in seconds

    // Calculate pixels per second
    const pixelsPerSecond = containerWidth / duration;

    clearInterval(playheadInterval);

    playheadInterval = setInterval(function () {
        if (!audioPlayer.paused && !audioPlayer.ended) {
            // Calculate new position based on current time and pixels per second
            let newPosition = audioPlayer.currentTime * pixelsPerSecond;
            playhead.style.left = `${newPosition}px`;
        }
    }, 100); // Update every 100 milliseconds
}

function makeLineDraggable(beatLine, beatContainer, audioPlayer) {
    let isDragging = false;

    beatLine.addEventListener('mousedown', function (event) {
        isDragging = true;
        event.preventDefault();
    });

    document.addEventListener('mousemove', function (event) {
        if (isDragging) {
            const rect = beatContainer.getBoundingClientRect();
            let offsetX = event.clientX - rect.left;

            // Ensure the line stays within the container bounds
            if (offsetX < 0) offsetX = 0;
            if (offsetX > beatContainer.offsetWidth) offsetX = beatContainer.offsetWidth;

            // Move the line to the new position
            beatLine.style.left = `${offsetX}px`;

            // Update the associated time interval
            const percentage = offsetX / beatContainer.offsetWidth;
            const newTime = percentage * audioPlayer.duration;
            // Update any displayed time intervals
            updateTimeDisplay(beatLine, newTime);
        }
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
    });
}

function updateTimeDisplay(beatLine, newTime) {
    const timeLabel = document.getElementById(`${beatLine.id}_time`);
    if (timeLabel) {
        timeLabel.textContent = newTime.toFixed(2) + " seconds";
    }
}

function clearPreviousTimestamps() {
    const previousTimestamps = document.querySelectorAll('.beat-timestamp');
    previousTimestamps.forEach(timestamp => timestamp.remove());
}

// document.addEventListener('DOMContentLoaded', function () {
//     var audioPlayer = document.getElementById('audioPlayer');
//     var beatContainer = document.getElementById('beatContainer');
//     var playhead = document.getElementById('playhead');
//     const beatLines = document.querySelectorAll('.beat');
//     var draggingBeat = null;
//     var playheadInterval;

//     // deleteSection();

//     function updateCurrentTime(line, time) {
//         const timeLabel = document.querySelector('.current-time-label');
//         if (timeLabel) {  // Check if the element exists
//             line.style.left = `${(time / audioPlayer.duration) * beatContainer.offsetWidth}px`;
//             timeLabel.textContent = time.toFixed(2) + 's';;
//         }
//     }

//     beatLines.forEach(beatLine => {
//         makeLineDraggable(beatLine, beatContainer, audioPlayer);
//     });

//     // Add event listener for beat line drag
//     document.addEventListener('mousedown', function (event) {
//         const target = event.target;
//         if (target.classList.contains('beat')) {
//             let initialX = event.clientX;
//             let startTime = (target.offsetLeft / beatContainer.offsetWidth) * audioPlayer.duration;

//             function onMouseMove(moveEvent) {
//                 const deltaX = moveEvent.clientX - initialX;
//                 const newLeft = target.offsetLeft + deltaX;

//                 const percentage = Math.max(0, Math.min(1, newLeft / beatContainer.offsetWidth));
//                 const newTime = percentage * audioPlayer.duration;

//                 updateCurrentTime(target, newTime);

//                 initialX = moveEvent.clientX;
//             }

//             function onMouseUp() {
//                 document.removeEventListener('mousemove', onMouseMove);
//                 document.removeEventListener('mouseup', onMouseUp);
//                 target.style.backgroundColor = 'green'; // Change color after drag
//             }

//             document.addEventListener('mousemove', onMouseMove);
//             document.addEventListener('mouseup', onMouseUp);
//         }
//     });

//     // Hover effect to change cursor and color
//     document.addEventListener('mouseover', function (event) {
//         const target = event.target;
//         if (target.classList.contains('beat')) {
//             target.style.cursor = 'ew-resize'; // Change cursor to indicate draggable
//             target.style.backgroundColor = 'lightgreen'; // Change color on hover
//         }
//     });

//     document.addEventListener('mouseout', function (event) {
//         const target = event.target;
//         if (target.classList.contains('beat')) {
//             target.style.backgroundColor = ''; // Revert color on mouse out
//         }
//     });

//     // Update line position when typing in time value
//     // beatContainer.addEventListener('input', function (event) {
//     //     const target = event.target;
//     //     if (target.classList.contains('time-label')) {
//     //         const newTime = parseFloat(target.textContent);
//     //         if (!isNaN(newTime) && newTime >= 0 && newTime <= audioPlayer.duration) {
//     //             const beatLine = target.closest('.beat');
//     //             updateCurrentTime(beatLine, newTime);
//     //         }
//     //     }
//     // });

//     // Prevent errors when setting currentTime without a valid duration
//     beatContainer.addEventListener('click', function (event) {
//         if (!isNaN(audioPlayer.duration)) {
//             var rect = beatContainer.getBoundingClientRect();
//             var offsetX = event.clientX - rect.left;
//             var percentage = offsetX / rect.width;
//             var newTime = percentage * audioPlayer.duration;
//             audioPlayer.currentTime = newTime;
//             movePlayheadOG();
//             if (audioPlayer.paused) {
//                 audioPlayer.play();
//             }
//         }
//     });

//     audioPlayer.addEventListener('timeupdate', function () {
//         movePlayheadOG();
//     });

//     audioPlayer.addEventListener('ended', function () {
//         clearInterval(playheadInterval);
//         playhead.style.left = '0px'; // Optionally reset the playhead
//     });
    


// });



function playAudio() {
    var file = document.getElementById("audioFile").files[0];
    if (file) {
        var audioPlayer = document.getElementById("audioPlayer");
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.style.display = "block";
        audioPlayer.addEventListener('loadedmetadata', function () {
            audioDuration = audioPlayer.duration; // Set the duration once metadata is loaded
            // console.log("Audio Duration: " + audioDuration + " seconds"); // Optional: Log duration to console
            movePlayheadOG(audioPlayer);
        });
        audioPlayer.play();
    } else {
        alert("Please upload an MP3 file first.");
    }
}


function movePlayhead(audioPlayer, endTime) {
    const playhead = document.getElementById('playhead');
    if (!playhead) {
        const newPlayhead = document.createElement('div');
        newPlayhead.id = 'playhead';
        newPlayhead.style.position = 'absolute';
        newPlayhead.style.width = '10px';
        newPlayhead.style.height = '10px';
        newPlayhead.style.backgroundColor = 'red';
        document.body.appendChild(newPlayhead);
    }

    const updatePlayhead = () => {
        const progress = audioPlayer.currentTime / audioPlayer.duration;
        playhead.style.left = `${progress * 100}%`;
        if (audioPlayer.currentTime >= endTime || audioPlayer.paused) {
            clearInterval(interval);
        }
    };

    const interval = setInterval(updatePlayhead, 100);
    audioPlayer.addEventListener('pause', () => clearInterval(interval));
}

function playTimeRange(startTime, endTime) {
    // console.log("start end play interval: ", startTime, endTime);
    // Ensure WaveSurfer is available and has been initialized
    if (waveform && waveform.isReady) {
        // Seek to the start time
        waveform.seekTo(startTime / waveform.getDuration());

        // Start playback
        waveform.play(startTime, endTime);

        // Use the WaveSurfer API to manage playback
        const interval = setInterval(() => {
            const currentTime = waveform.getCurrentTime();
            // console.log(currentTime);

            // Check if the current time has reached the end time or if playback is paused
            if (currentTime >= endTime || !waveform.isPlaying()) {
                waveform.pause();
                clearInterval(interval);
            }
        }, 100);
    } else {
        console.error("WaveSurfer is not initialized or not ready.");
    }
}

// Function to update the color picker based on hex code in the color input
function updateColorPickerFromInput() {
    const hexColorPattern = /#([0-9A-Fa-f]{6})\b/;
    
    const colorInput = document.getElementById("colorInput");
    const colorPicker = document.getElementById("colorPicker");
    const colorPickerButton = document.getElementById("colorPickerButton");
    const inputText = colorInput.value;
    const hexMatch = inputText.match(hexColorPattern);

    if (hexMatch) {
        // If a hex color code is found, update the color picker and button background
        colorPicker.value = hexMatch[0];
        colorPickerButton.style.backgroundColor = hexMatch[0];
    } else {
        // If no hex code is found, default to white or no color
        colorPicker.value = "#FFFFFF";
        colorPickerButton.style.backgroundColor = "white";
    }
}

function show_transitions() {
    const addButton = document.getElementById("add-transitions-button");
    const deleteButton = document.getElementById("deleteTransitionButton");
    const nextButton = document.getElementById("next-transition");
    const defaultButton = document.getElementById("defaultTransitionButton");
    const finalizeButton = document.getElementById("finalize-timestamps")

    addButton.style.display = "block";
    deleteButton.style.display = "block";
    defaultButton.style.display = "block";
    finalizeButton.style.display = "block";
    nextButton.style.display = "none";
}

function show_default_boxes(){
    const detailsBox = document.getElementById("detailsBox")
    const vibeBox = document.getElementById("vibeBox")
    const colorBox = document.getElementById("colorBox")
    const imageryBox = document.getElementById("imageryBox")
    const textureBox = document.getElementById("textureBox")
    const fillDefaultsButton = document.getElementById("fill-defaults")
    const trash = document.getElementById("trash")
    const toggleButton = document.getElementById("toggleMotionButton")
    const processButton = document.getElementById("process-table")
    finalizeTimestamps('time',-1,-1)


    detailsBox.style.display = "block";
    vibeBox.style.display = "block";
    colorBox.style.display = "block";
    imageryBox.style.display = "block";
    textureBox.style.display = "block";
    fillDefaultsButton.style.display = "block";
    toggleButton.style.display = "block"
    processButton.style.display = "block"
    
    colorBox.style.justifyContent = "center";
    colorBox.style.alignContent = "center";
    
    // Show color picker when button is clicked
    colorPickerButton.addEventListener("click", function() {
        updateColorPickerFromInput();  // Update color picker to match the current color input
        colorPicker.click();           // Trigger the color picker
    });

    // When a color is chosen from the color picker, update the color input with the selected hex code
    colorPicker.addEventListener("input", function(event) {
        colorInput.value = event.target.value;
        colorPickerButton.style.backgroundColor = event.target.value;
    });

    // Update color picker whenever color input changes
    colorInput.addEventListener("input", updateColorPickerFromInput);

    
    // Add default transition options
    let allRegions = Object.values(waveform.regions.list);
    let orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');

    if (orangeRegions.length === 0 && tablemade == false) {
        const useDefault = window.confirm('No transition regions found. Would you like to add some default transitions?');
        if (useDefault) {
            addDefaultTransitions();
            allRegions = Object.values(waveform.regions.list);
            orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');

        } else {
            console.log('Proceeding without transitions.');
        }
        let greenRegions = allRegions.filter(region => region.color === 'green').sort((a, b) => a.start - b.start);
        let orangetempRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)').sort((a, b) => a.start - b.start);
        updatedGreenRegions = greenRegions;
        if (orangeRegions.length > 0){
            updatedOrangeRegions = orangetempRegions;
        }
        
        // console.log("ADDED TO UPDATED:",updatedGreenRegions.length,updatedOrangeRegions.length)

    }
}

function makeTimestamp(isTrans){
    
    if (isTrans){
        // console.log("trans");
        transitionsAdded = true;
        createTransitionLines();
    } else{
        // console.log("other")
        finalizeTimestamps('time',-1,-1);
        
        if (transitionsAdded) {
            // createTransitionLines();
            // console.log("bool");
            // finalizeTimestamps('transition');
        }
    }
    
}


function finalizeTimestamps(name, regionIndex_form, regionIndex_trans) {
    // const timestampsContainer = document.getElementById('timestampsContainer');
    // timestampsContainer.innerHTML = ''; // Clear previous timestamps

    const roundedSignificantPoints = newsigPoints.map(point => point.toFixed(2));
    const timestamps = [0, ...roundedSignificantPoints, audioDuration.toFixed(2)].map(Number);

    const sectionsCount = newsigPoints.length;
    let container;
    let labels = [];

    if (name === 'time') {
        container = document.getElementById('trash');
        container.style.border = "2px solid black";
        labels = ['Vibe', 'Imagery', 'Texture', 'Style', 'Color', 'Motion', 'Strength']
        // labels = ['Vibe', 'Imagery', 'Texture', 'Style', 'Color', 'Motion', 'Strength', 'Speed'];
    } else if (name === 'transition') {
        container = document.getElementById('transitionsContainer');
        container.style.border = '2px solid black';
        // labels = ['Motion', 'Strength', 'Speed'];
        labels = ['Motion', 'Strength']
    }

    // Store current values of inputs before clearing the container
    
    if (regionIndex_form < 0){
        console.log("existing values region index instead of overwrite: ")
        console.log(existingValues)
        
    } 
    // else{
    //     existingValues = {};
    //     // console.log("form sections: ", document.querySelectorAll('.form-section'))
    //     document.querySelectorAll('.form-section').forEach((section, sectionIndex) => {
    //         const inputs = section.querySelectorAll('input');
    //         existingValues[sectionIndex] = Array.from(inputs).map(input => input.value);
    //     });
    //     console.log("form section existing vals: ")
    //     console.log(existingValues)
    // }
    
    if (regionIndex_form >= 0) {
        
        console.log(existingValues)
        console.log("length existing vals: ", Object.keys(existingValues).length)
        // Step 1: Add a placeholder for the new entry at the end of existingValues
        existingValues[Object.keys(existingValues).length] = [];
    
        // Step 2: Shift all elements from the end up to the regionIndex_form to the right
        for (let i = Object.keys(existingValues).length; i > regionIndex_form; i--) {
            existingValues[i] = existingValues[i - 1];
        }
    
        // Step 3: Insert an empty instance at regionIndex_form
        existingValues[regionIndex_form] = [];
    }
    existingValues = Object.keys(existingValues)
            .sort((a, b) => Number(a) - Number(b))  // Sort keys numerically in ascending order
            .reduce((newObj, key, index) => {
                console.log("index:", key, index)
                newObj[index] = existingValues[key];  // Reassign values to new consecutive keys
                return newObj;
            }, {});
    console.log("----------------- EXISTING VALUES --------------")
    console.log(existingValues)

    
    // document.querySelectorAll('.transition-section').forEach((section, sectionIndex) => {
    //     console.log("IN EXISTING LOOP BEFORE CLEAR: ", section)
    //     const inputs = section.querySelectorAll('input');
    //     existingTransitionValues[sectionIndex] = Array.from(inputs).map(input => input.value);
    // });
    // console.log("------- EXISTING TRANSITION ----------")
    // console.log(existingTransitionValues)

    const sortedSections = Array.from(document.querySelectorAll('.transition-section'))
        .sort((a, b) => {
            // Compare sectionIds in descending order
            return parseInt(b.getAttribute('sectionId')) - parseInt(a.getAttribute('sectionId'));
        });

    // Now, iterate over sortedSections and map the inputs
    // if (regionIndex_form <0){
    sortedSections.forEach((section, sectionIndex) => {
        const id = section.querySelector('.time-range').id.split('-')[2];
        // console.log("IN EXISTING LOOP BEFORE CLEAR: ", section);
        const inputs = section.querySelectorAll('input');
        // console.log("finalize before: ");
        // console.log(existingTransitionValues);
        existingTransitionValues[id] = Array.from(inputs).map(input => input.value);
        // console.log("finalize after: ");
        // console.log(existingTransitionValues);

    });
    // }
    

    


    container.innerHTML = ''; // Clear previous content
    container.style.setProperty('--sections-count', sectionsCount);

    // Create labels container
    
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'label-container';

    const spacerBefore = document.createElement('div');
    spacerBefore.style.flex = '0.2';
    labelsContainer.appendChild(spacerBefore);

    labels.forEach(label => {
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.innerText = label;
        labelsContainer.appendChild(labelElement);
    });

    const spacerAfter = document.createElement('div');
    spacerAfter.style.flex = '0.2';
    labelsContainer.appendChild(spacerAfter);
    container.appendChild(labelsContainer);

    let sceneTimes = [];
    for (let i = 0; i < sectionsCount + 1; i++) {
        const section = document.createElement('div');

        const timeRange = document.createElement('div');
        timeRange.className = 'time-range';
        if (name === 'time') {
            section.className = 'section form-section';
            timeRange.innerText = `${timestamps[i]}-${timestamps[i + 1]}`;
            sceneTimes.push({ 'start': timestamps[i], 'end': timestamps[i + 1] });
        } else if (name === 'transition') {
            section.className = 'section form-section';
            const start = (parseFloat(timestamps[i + 1]) - 0.5).toFixed(2);
            const end = (i === sectionsCount) ? audioDuration.toFixed(2) : (parseFloat(timestamps[i + 1]) + 0.5).toFixed(2);
            timeRange.innerText = `Transition ${i + 1}: ${start} - ${end}`;
        }
        section.appendChild(timeRange);

        const playButton = document.createElement('button');
        playButton.innerText = 'Play';
        playButton.addEventListener('click', () => playTimeRange(timestamps[i], timestamps[i + 1]));
        section.appendChild(playButton);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        // const vibes = ['calm', 'epic', 'aggressive', 'chill', 'dark', 'energetic', 'ethereal', 'happy', 'romantic', 'sad', 'scary', 'sexy', 'uplifting'];
        // const textures = ['painting', 'calligraphy brush ink stroke', 'pastel watercolor on canvas', 'charcoal drawing', 'pencil drawing', 'impasto palette knife painting', 'mosaic', 'jagged/irregular', 'rubbed graphite on paper','digital glitch', 'splattered paint', 'graffiti', 'ink blots'];
        // const styles = ['abstract', 'impressionist', 'futuristic', 'contemporary', 'renaissance', 'surrealist', 'minimalist', 'digital', "neoclassic", "constructivism", "digital", "collage"];
        // const imageries = ['blossoming flower', 'chaotic intertwining lines', 'flowing waves', 'starry night', 'curvilinear intertwined circles', 'whirling lines', 'vibrant kaleidoscope of colors', 'interstellar light trails', 'abstract fractal patterns', 'dissolving geometric shards', 'diffused cosmic mists', 'translucent ripple effects'];
        // const colorOptions = ['black/white', 'myriad of color', 'sky blue (#00BFFF)', "fiery red (#db0804)", 'cherry blossom pink (#FFB7C5)', 'amber (#FFBF00)'];
        // const motions = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'spin_cw', 'spin_ccw', 'rotate_up', 'rotate_down', 'rotate_right', 'rotate_left', 'rotate_cw', 'rotate_ccw', 'none'];
        // const strengths = ['weak', 'normal', 'strong', 'vstrong'];
        // const speeds = ['vslow', 'slow', 'normal', 'fast', 'vfast'];

        if(name==='time'){
            labels.forEach((label) => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'dropdown-input';
    
                if (name === 'time') {
                    input.id = `${label.toLowerCase()}_form_${i + 1}`;
                } else if (name === 'transition') {
                    input.id = `${label.toLowerCase()}_trans_${i + 1}`;
                }
    
                const datalist = document.createElement('datalist');
                datalist.id = `${label.toLowerCase()}_options_${i + 1}`;
    
                let options;
                switch (label.toLowerCase()) {
                    case 'vibe':
                        options = vibes;
                        break;
                    case 'texture':
                        options = textures;
                        break;
                    case 'style':
                        options = styles;
                        break;
                    case 'imagery':
                        options = imageries;
                        break;
                    case 'color':
                        options = colorOptions;
                        break;
                    case 'motion':
                        if(motion_mode === '3D'){
                            options = motions_3D;
                        }else{
                            options = motions_2D;
                        }
                        break;
                    case 'strength':
                        options = strengths;
                        break;
                    // case 'speed':
                    //     options = speeds;
                    //     break;
                }
    
                input.addEventListener('input', () => {
                    const currentValue = input.value;
                    // Check if the current value matches exactly with one of the options
                    if (options.includes(currentValue)) {
                        // Clear to avoid showing the closest match
                        input.value = ''; 
                        setTimeout(() => {
                            input.value = currentValue; // Restore original value
                            input.setSelectionRange(input.value.length, input.value.length); // Move cursor to the end
                        }, 0);
                    }
                });
    
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    datalist.appendChild(optionElement);
                });
    
                input.setAttribute('list', datalist.id);
                inputContainer.appendChild(input);
                inputContainer.appendChild(datalist);
    
                // input.addEventListener('focus', () => {
                //     const currentValue = input.value;
                //     input.value = '';  // Clear input to trigger full option display
                //     setTimeout(() => {
                //         input.value = currentValue;  // Restore the original value after showing options
                //     }, 0);
                //     console.log("focus event triggered");
                //     input.setSelectionRange(input.value.length, input.value.length); // Move cursor to end
                //     input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown'})); // Simulate key press to trigger dropdown
                // });
            
                input.addEventListener('click', () => {
                    const currentValue = input.value;
                    input.value = ''; // Clear input to suppress the closest match
                
                    // Allow the dropdown to open
                    setTimeout(() => {
                        input.value = currentValue; // Restore original value
                        input.setSelectionRange(input.value.length, input.value.length); // Move cursor to the end
                    }, 0);
                });

                input.addEventListener('blur', () => {
                    // Use a delay to capture values after any pending updates
                    setTimeout(() => {
                        // Store only the values for the current interval or region
                        const intervalInputs = Array.from(inputContainer.querySelectorAll('input'));
                        existingValues[i] = intervalInputs.map(input => input.value);
                        console.log("Updated values on blur:", existingValues);
                    }, 100);
                });
    
                // console.log("----------INPUT:",input,"----------");
    
                // Repopulate input value if available in stored values
                // console.log("REPOPULATE EXISTING")
                // console.log(existingValues);
                if (existingValues[i] && existingValues[i][labels.indexOf(label)]) {
                    input.value = existingValues[i][labels.indexOf(label)];
                }
                
            });
        }
        
        
        section.appendChild(inputContainer);
        container.appendChild(section);
    }


    console.log("------- EXISTING TRANSITION ----------")
    console.log(existingTransitionValues)

    console.log("NEW ----------------------")
    // Get regions from WaveSurfer
    let allRegions = Object.values(waveform.regions.list);
    let orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');

    if (orangeRegions.length === 0 && tablemade == false) {
        const useDefault = window.confirm('No transition regions found. Would you like to add some default transitions?');
        if (useDefault) {
            addDefaultTransitions();
            allRegions = Object.values(waveform.regions.list);
            orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');

        } else {
            console.log('Proceeding without transitions.');
        }
        let greenRegions = allRegions.filter(region => region.color === 'green').sort((a, b) => a.start - b.start);
        let orangetempRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)').sort((a, b) => a.start - b.start);
        updatedGreenRegions = greenRegions;
        if (orangeRegions.length > 0){
            updatedOrangeRegions = orangetempRegions;
        }
        
        // console.log("ADDED TO UPDATED:",updatedGreenRegions.length,updatedOrangeRegions.length)

    }
    // Repopulate table with transitions after table is built
    if (orangeRegions.length > 0) {
        // if(document.querySelectorAll('.transition-section').length === 0){
        //     console.log("0 len in finalize: ", document.querySelectorAll('.transition-section'))
        //     existingTransitionValues[0]=['','']
        // }
        // Extract start and end times into a separate array of objects
        const sortedRegions = orangeRegions.map(region => ({
            startTime: parseFloat(region.start.toFixed(2)),
            endTime: parseFloat(region.end.toFixed(2))
        }));
    
        // Sort the extracted regions based on end time or start time
        sortedRegions.sort((a, b) => b.endTime - a.endTime);
        
    
        // console.log("transition sections: ", document.querySelectorAll('.transition-section'))
        let length = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)').length;
        console.log("LENGTH:", allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)').length);
        
        if (length != 0 && regionIndex_trans >= 0) {
            //Add a transition
            regionIndex_trans = length - 1 - regionIndex_trans;
            for (let i = length -1; i > regionIndex_trans; i--) {
                // Move the value from the previous index to the current index
                existingTransitionValues[i] = existingTransitionValues[i - 1];
                // console.log("shift here: ", i)
            }
            existingTransitionValues[regionIndex_trans] = ['', ''];
            // console.log("existingTransitionValues after: ", existingTransitionValues);
        } else if (regionIndex_trans < 0){
            const trans_idx = Object.keys(existingTransitionValues).length  + regionIndex_trans;
            delete existingTransitionValues[trans_idx];
            existingTransitionValues = Object.keys(existingTransitionValues)
                .sort((a, b) => Number(a) - Number(b))  // Sort keys numerically in ascending order
                .reduce((newObj, key, index) => {
                    newObj[index] = existingTransitionValues[key];  // Reassign values to new consecutive keys
                    return newObj;
                }, {});

            console.log("New Deleted Transition: ", (-1)*regionIndex_trans)
            console.log(existingTransitionValues)
        }
        

        // Now, use the sorted timestamps to add transitions
        sortedRegions.forEach((region, index) => {
            const transitionStart = region.startTime;
            const transitionEnd = region.endTime;
            
            // console.log("existing transition main low ")
            // console.log( existingTransitionValues)
            addTransitions(index, transitionStart, transitionEnd, Math.abs(Object.keys(existingTransitionValues).length - 1 - index), existingTransitionValues, regionIndex_trans);
            
        });
        
    }

    // Add copy-paste functionality to form sections (unchanged from before)
    const formSections = document.querySelectorAll('.form-section'); 

    let copiedData = null;
    let copiedSectionIndex = null;

    formSections.forEach((section, index) => {
        const copyButton = document.createElement('button');
        copyButton.innerText = 'Copy All';
        section.appendChild(copyButton);

        const pasteButton = document.createElement('button');
        pasteButton.innerText = 'Paste All';
        section.appendChild(pasteButton);

        copyButton.addEventListener('click', () => {
            const inputs = section.querySelectorAll('input');
            copiedData = Array.from(inputs).map(input => input.value);
            copiedSectionIndex = index;

            copyButton.innerText = 'Copied!';
            setTimeout(() => (copyButton.innerText = 'Copy All'), 2000);
        });

        pasteButton.addEventListener('click', () => {
            if (copiedData && copiedSectionIndex !== index) {
                const inputs = section.querySelectorAll('input');
                copiedData.forEach((data, i) => (inputs[i].value = data));
            }
        });
    });

    tablemade = true;
}

// function deleteSection() {
//     const deleteButton = document.getElementById('delete-section');
//     let deleteMode = false;

//     deleteButton.addEventListener('click', () => {
//         deleteMode = !deleteMode;
//         // console.log(deleteMode);
//         deleteButton.innerText = deleteMode ? 'Exit Delete Mode' : 'Delete Section';

//         if (deleteMode) {
//             // console.log('Delete Mode');
//             document.querySelectorAll('.section').forEach(section => {
//                 // Highlight sections for deletion
//                 section.style.border = '2px dashed red';

//                 // Add click event listener for deletion
//                 section.addEventListener('click', handleSectionDeletion);
//             });
//         } else {
//             // Exit delete mode and remove highlights
//             // console.log("not delete mode?");
//             document.querySelectorAll('.section').forEach(section => {
//                 section.style.border = ''; // Remove the highlight
//                 section.removeEventListener('click', handleSectionDeletion); // Remove event listener to avoid issues
//             });
//         }
//     });

//     function handleSectionDeletion(event) {
//         if (deleteMode) {
//             const section = event.currentTarget;

//             // Confirm deletion with the user
//             const confirmed = confirm('Are you sure you want to delete this section?');
//             if (confirmed) {
//                 // Remove the section from the DOM
//                 section.remove();
//             }
//         }
//     }
// }


// function addTransitions(startTime, endTime) {
//     console.log("ADD TTRANSITION CALLED");
//     const formContainers = document.querySelectorAll('.section');
    
//     formContainers.forEach((form, index) => {
//         const formStartTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[0]);
//         const formEndTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[1]);

//         if (startTime >= formStartTime && startTime < formEndTime) {
//             // Create the transition container
//             const transitionContainer = document.createElement('div');
//             transitionContainer.className = 'section transition-section';
//             transitionContainer.innerHTML = `
//                 <div class="time-range">Transition (${startTime}s to ${endTime}s)</div>
//                 <div class="input-container">
//                     <label for="motion_trans_${startTime}_${endTime}">Motion:</label>
//                     <input type="text" id="motion_trans_${startTime}_${endTime}">
//                     <label for="strength_trans_${startTime}_${endTime}">Strength:</label>
//                     <input type="text" id="strength_trans_${startTime}_${endTime}">
//                     <label for="speed_trans_${startTime}_${endTime}">Speed:</label>
//                     <input type="text" id="speed_trans_${startTime}_${endTime}">
//                 </div>
//             `;

//             // Add the play button to preview the transition
//             const playButton = document.createElement('button');
//             playButton.innerText = 'Banana3';
//             playButton.addEventListener('click', () => playTimeRange(startTime, endTime));
//             transitionContainer.appendChild(playButton);

//             // Add the delete button to remove the transition
//             const deleteButton = document.createElement('button');
//             deleteButton.innerText = 'Delete';
//             deleteButton.style.marginLeft = '10px';
//             deleteButton.addEventListener('click', () => {
//                 transitionContainer.remove();
//             });
//             transitionContainer.appendChild(deleteButton);

//             // Insert the transition container in the appropriate position
//             form.insertAdjacentElement('afterend', transitionContainer);
//         }
//     });
// } 



//WORKING
let existingTransitions = []; // Track all transitions globally

// function createTransitionLines() {
//     const beatContainer = document.getElementById('beatContainer');
//     const duration = audioDuration;

//     // Create draggable left and right lines with unique identifiers
//     const leftLine = document.createElement('div');
//     const rightLine = document.createElement('div');
//     leftLine.className = 'draggable-line left-line';
//     rightLine.className = 'draggable-line right-line';

//     // Generate a unique ID for this transition
//     const transitionId = `transition-${Date.now()}`;
//     leftLine.dataset.transitionId = transitionId;
//     rightLine.dataset.transitionId = transitionId;

//     // Create the highlight area between the lines
//     const highlight = document.createElement('div');
//     highlight.className = 'highlight-area';

//     beatContainer.appendChild(leftLine);
//     beatContainer.appendChild(rightLine);
//     beatContainer.appendChild(highlight);

//     function updateHighlightPosition() {
//         const leftPos = parseFloat(leftLine.style.left);
//         const rightPos = parseFloat(rightLine.style.left);
//         highlight.style.left = `${leftPos}px`;
//         highlight.style.width = `${rightPos - leftPos}px`;
//     }

//     function makeDraggable(line, onDrag) {
//         let isDragging = false;

//         line.addEventListener('mousedown', function (event) {
//             event.preventDefault();
//             isDragging = true;
//             line.style.cursor = 'ew-resize'; // Change cursor on drag start
//             document.addEventListener('mousemove', onDrag);
//             document.addEventListener('mouseup', function () {
//                 isDragging = false;
//                 line.style.cursor = ''; // Reset cursor after drag
//                 document.removeEventListener('mousemove', onDrag);
//                 updateTransitionTimes(line.dataset.transitionId); // Update transition times on drag end
//             });
//         });

//         line.addEventListener('mouseenter', function () {
//             line.style.cursor = 'ew-resize'; // Change cursor on hover
//         });

//         line.addEventListener('mouseleave', function () {
//             line.style.cursor = ''; // Reset cursor when not hovering
//         });
//     }

//     makeDraggable(leftLine, (event) => {
//         if (!event.buttons) return;

//         const rect = beatContainer.getBoundingClientRect();
//         const offsetX = event.clientX - rect.left;
//         const newLeft = Math.max(0, Math.min(offsetX, parseFloat(rightLine.style.left) - 10)); // Prevent crossing right line
//         leftLine.style.left = `${newLeft}px`;
//         updateHighlightPosition();
//     });

//     makeDraggable(rightLine, (event) => {
//         if (!event.buttons) return;
//         const rect = beatContainer.getBoundingClientRect();
//         const offsetX = event.clientX - rect.left;
//         const newRight = Math.max(parseFloat(leftLine.style.left) + 10, Math.min(offsetX, beatContainer.offsetWidth)); // Prevent crossing left line
//         rightLine.style.left = `${newRight}px`;
//         updateHighlightPosition();
//     });

//     // Set initial positions
//     leftLine.style.left = '100px';
//     rightLine.style.left = '300px';
//     updateHighlightPosition();

//     // Finalize transition when button is clicked
//     document.getElementById('finalizeTransitionButton').addEventListener('click', () => {
//         const leftTime = (parseFloat(leftLine.style.left) / beatContainer.offsetWidth) * duration;
//         const rightTime = (parseFloat(rightLine.style.left) / beatContainer.offsetWidth) * duration;
//         const startTime = leftTime.toFixed(2);
//         const endTime = rightTime.toFixed(2);

//         // // Check if this transition already exists by its unique ID
//         // const existingTransition = existingTransitions.find(
//         //     transition => transition.id === transitionId
//         // );

//         // if (existingTransition) {
//         //     console.log("EXISTING TRANSITION FLAG CALL UPDATE")
//         //     // Update the existing transition in the UI
//         //     updateExistingTransition(transitionId, startTime, endTime);
//         // } else {
//         // Add a new transition
//         addTransitions(transitionId, startTime, endTime,);
//         // existingTransitions.push({ id: transitionId, startTime, endTime });
//         // }
//     });
// }

// // Function to update an existing transition's UI
// function updateExistingTransition(id, startTime, endTime) {
//     console.log("UPDATE ID" + id + " START TIME: " + startTime + " END TIME: " + endTime);
//     const timeRangeElement = document.querySelector(`#time-range-${id}`);
//     if (timeRangeElement) {
//         timeRangeElement.innerText = `Transition (${startTime}s to ${endTime}s)`;
//     }

//     const transitionContainer = document.querySelector(`.transition-section[data-transition-id="${id}"]`);
//     if (transitionContainer) {
//         const playButton = transitionContainer.querySelector('button'); // Select the first button (Play button)
//         if (playButton) {
//             playButton.onclick = () => playTimeRange(startTime.toFixed(2), endTime.toFixed(2));
//         }
//     }
// }

// Your existing addTransitions function with a unique ID parameter
// function addTransitions(id, startTime, endTime) {
//     console.log("AddTrans2 called");
//     const formContainers = document.querySelectorAll('.section');

//     formContainers.forEach((form) => {
//         const formStartTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[0]);
//         const formEndTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[1]);

//         if (startTime >= formStartTime && startTime < formEndTime) {
//             // Create the transition container
//             const transitionContainer = document.createElement('div');
//             transitionContainer.className = 'section transition-section';
//             transitionContainer.dataset.transitionId = id; // Store the transition ID for updates
//             transitionContainer.innerHTML = `
//                 <div id="time-range-${id}" class="time-range">Transition (${startTime}s to ${endTime}s)</div>
//                 <div class="input-container">
//                     <label for="motion_trans_${startTime}_${endTime}">Motion:</label>
//                     <input type="text" id="motion_trans_${startTime}_${endTime}">
//                     <label for="strength_trans_${startTime}_${endTime}">Strength:</label>
//                     <input type="text" id="strength_trans_${startTime}_${endTime}">
//                     <label for="speed_trans_${startTime}_${endTime}">Speed:</label>
//                     <input type="text" id="speed_trans_${startTime}_${endTime}">
//                 </div>
//             `;

//             // Add the play button to preview the transition
//             const playButton = document.createElement('button');
//             playButton.innerText = 'Banana2';
//             console.log("start: ", startTime);
//             console.log("end: ", endTime);
//             playButton.addEventListener('click', () => playTimeRange(startTime, endTime));
//             transitionContainer.appendChild(playButton);

//             // Add the delete button to remove the transition
//             // const deleteButton = document.createElement('button');
//             // deleteButton.innerText = 'Delete';
//             // deleteButton.style.marginLeft = '10px';
//             // deleteButton.addEventListener('click', () => {
//             //     transitionContainer.remove();
//             //     // Remove from existingTransitions list
//             //     existingTransitions = existingTransitions.filter(
//             //         t => t.id !== id
//             //     );
//             // });
//             // transitionContainer.appendChild(deleteButton);

//             // Insert the transition container in the appropriate position
//             form.insertAdjacentElement('afterend', transitionContainer);
//         }
//     });
// }

function addTransitions(id, startTime, endTime, i, existingTransitionValues,regionIndex) {
    // console.log("AddTrans2 called");
    const formContainers = document.querySelectorAll('.section');
    // console.log("formcontainer: ", formContainers)

    formContainers.forEach((form) => {
        const formStartTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[0]);
        const formEndTime = parseFloat(form.querySelector('.time-range').innerText.split('-')[1]);

        if (startTime >= formStartTime && startTime < formEndTime) {
            // Create the transition container
            const transitionContainer = document.createElement('div');
            transitionContainer.className = 'section transition-section';
            // transitionContainer.dataset.transitionId = id; // Store the transition ID for updates
            transitionContainer.innerHTML = `
                <div id="time-range-${id}" class="time-range">Transition (${startTime}s to ${endTime}s)</div>
                <div class="input-container">
                    <button id="trans_play_button">Play</button>
                    <div style="width: 200px; margin-left: 1px; margin-top: 230px;">
                        <input type="text" id="motion_trans_${startTime}_${endTime}" style="margin-bottom: 10px;">
                        <br>
                        <input type="text" id="strength_trans_${startTime}_${endTime}">
                    </div>
                </div>
            `;

            // Add the play button to preview the transition
            // const playButton = document.createElement('button');
            // playButton.innerText = 'Play';
            const playButton = document.getElementById('trans_play_button')
            // console.log("start: ", startTime);
            // console.log("end: ", endTime);
            // playButton.addEventListener('click', () => playTimeRange(parseFloat(startTime), parseFloat(endTime)));
            // transitionContainer.appendChild(playButton);

            // Insert the transition container in the appropriate position
            form.insertAdjacentElement('afterend', transitionContainer);
            // form.insertAdjacentElement('beforeend', transitionContainer);//seems interesting

            // Add dropdown functionality to inputs
            const motions = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'spin_cw', 'spin_ccw', 'rotate_up', 'rotate_down', 'rotate_right', 'rotate_left', 'rotate_cw', 'rotate_ccw', 'none'];
            const strengths = ['weak', 'normal', 'strong', 'vstrong'];
            const labels = ["Motion", "Strength"]
            // const speeds = ['vslow', 'slow', 'normal', 'fast', 'vfast'];

            // const inputTypes = ['motion', 'strength', 'speed'];
            const inputTypes = ['motion', 'strength']
            inputTypes.forEach((type) => {
                const input = document.getElementById(`${type}_trans_${startTime}_${endTime}`);
                const datalist = document.createElement('datalist');
                datalist.id = `${type}_options_${startTime}_${endTime}`;

                let options;
                switch (type) {
                    case 'motion':
                        if(motion_mode === '3D'){
                            options = motions_3D;
                        }else{
                            options = motions_2D;
                        }
                        break;
                    case 'strength':
                        options = strengths;
                        break;
                    // case 'speed':
                    //     options = speeds;
                    //     break;
                }

                // Populate datalist with options
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    datalist.appendChild(optionElement);
                });

                input.setAttribute('list', datalist.id);
                input.parentNode.appendChild(datalist);

                // Add event listeners to suppress closest match dropdown behavior
                input.addEventListener('input', () => {
                    const currentValue = input.value;
                    if (options.includes(currentValue)) {
                        input.value = '';
                        setTimeout(() => {
                            input.value = currentValue;
                            input.setSelectionRange(input.value.length, input.value.length); // Move cursor to the end
                        }, 0);
                    }
                });

                input.addEventListener('click', () => {
                    const currentValue = input.value;
                    input.value = '';
                    setTimeout(() => {
                        input.value = currentValue;
                        input.setSelectionRange(input.value.length, input.value.length); // Move cursor to the end
                    }, 0);
                });
                // input.addEventListener('blur', () => {
                //     setTimeout(() => {
                //         document.querySelectorAll('.transition-section').forEach((section, sectionIndex) => {
                //             const inputs = section.querySelectorAll('input');
                //             existingTransitionValues[sectionIndex] = Array.from(inputs).map(input => input.value);
                //         });
                //         console.log("------- EXISTING TRANSITION IN TRANSITION UPDATED ----------");
                //         console.log(existingTransitionValues);
                //     }, 100);  // Ensure enough delay for input finalization
                // });
                // // console.log("TRANS EXIST LENGTH: ", Object.keys(existingTransitionValues).length);
                // // console.log("TRANS VALS: ", existingTransitionValues);
                // if(tablemade && Object.keys(existingTransitionValues).length > 0){
                //     // console.log("ADD TRANSITION FOR EXISTING TRANS ADD: ", i, " ", existingTransitionValues[i])
                //     // console.log("input val: ",input)
                //     // console.log("label index: ",inputTypes.indexOf(type))
                //     // console.log("replace with: ", existingTransitionValues[i][inputTypes.indexOf(type)])
                //     if (existingTransitionValues[i] && existingTransitionValues[i][inputTypes.indexOf(type)]) {
                //         input.value = existingTransitionValues[i][inputTypes.indexOf(type)];
                //     }
                // }
                input.addEventListener('blur', () => {
                    setTimeout(() => {
                        const inputs = transitionContainer.querySelectorAll('input');
                        existingTransitionValues[id] = Array.from(inputs).map(input => input.value);
                    }, 100);
                    // console.log("Blur: ", existingTransitionValues);
                });

                if(tablemade && Object.keys(existingTransitionValues).length > 0){
                    // console.log("enter loop: ", Object.keys(existingTransitionValues));
                    if (existingTransitionValues[id] && existingTransitionValues[id][inputTypes.indexOf(type)]) {
                        input.value = existingTransitionValues[id][inputTypes.indexOf(type)];
                        
                    }
                }
                
                
    
                
                
                
            });
        }
    });
}

function fillDefaultsTemp() {
    const vibeInput = document.getElementById("vibeInput");
    const colorInput = document.getElementById("colorInput");
    const imageryInput = document.getElementById("imageryInput");
    const textureInput = document.getElementById("textureInput");

    // Check if any of the inputs are empty
    if (!vibeInput.value || !colorInput.value || !imageryInput.value || !textureInput.value) {
        alert("Please fill in all fields: Vibe, Color, Imagery, and Texture before proceeding.");
        return; // Stop execution if any field is empty
    }

    // Show the toggle button and proceed with fillDefaults if all inputs are filled
    const toggleButton = document.getElementById("toggleMotionButton");
    toggleButton.style.display = "block";
    fillDefaults();
}

function fillDefaults() {

    // const vibes = ['calm', 'epic', 'aggressive', 'chill', 'dark', 'energetic', 'ethereal', 'happy', 'romantic', 'sad', 'scary', 'sexy', 'uplifting'];
    // const textures = ['painting', 'calligraphy brush ink stroke', 'pastel watercolor on canvas', 'charcoal drawing', 'pencil drawing', 'impasto palette knife painting', 'mosaic', 'jagged/irregular', 'rubbed graphite on paper','digital glitch', 'splattered paint', 'graffiti', 'ink blots'];
    // // const styles = ['abstract', 'impressionist', 'futuristic', 'contemporary', 'renaissance', 'surrealist', 'minimalist', 'digital', 'collage'];
    // const styles = ['abstract', 'impressionist', 'futuristic', 'contemporary', 'renaissance', 'surrealist', 'minimalist', 'digital', "neoclassic", "constructivism", "digital", "collage"];
    // const imageries = ['blossoming flower', 'chaotic intertwining lines', 'flowing waves', 'starry night', 'curvilinear intertwined circles', 'whirling lines', 'vibrant kaleidoscope of colors', 'interstellar light trails', 'abstract fractal patterns', 'dissolving geometric shards', 'diffused cosmic mists', 'translucent ripple effects'];
    // const colorOptions = ['black/white', 'myriad of color', 'sky blue (#00BFFF)', "fiery red (#db0804)", 'cherry blossom pink (#FFB7C5)', 'amber (#FFBF00)'];
        

    // Conflict mapping for vibes and colors to textures
    const conflictMapping = {
        'myriad of color': ['charcoal drawing', 'pencil drawing', 'calligraphy brush ink stroke', 'ink blots'],
        'black/white': ['splattered paint','pastel watercolor on canvas', 'graffiti']
        
    };
    

    // Get the values entered by the user for vibe and color
    const vibeInput = document.getElementById('vibeInput').value.trim();  
    const colorInput = document.getElementById('colorInput').value.trim();  

    const sections = document.querySelectorAll('.section');

    // Choose a random texture and style for consistency
    let chosenTexture = textures[Math.floor(Math.random() * textures.length)];
    const chosenStyle = 'abstract';
    const chosenImagery = imageries[Math.floor(Math.random() * imageries.length)];

    // Check for conflicts based on user input
    if (colorInput && conflictMapping[colorInput]) {
        // Exclude conflicting textures if a color is chosen
        const conflictingTextures = conflictMapping[colorInput];
        const availableTextures = textures.filter(texture => !conflictingTextures.includes(texture));
        if (availableTextures.length > 0) {
            chosenTexture = availableTextures[Math.floor(Math.random() * availableTextures.length)];
        }
    }

    sections.forEach((section, index) => {
        const inputs = section.querySelectorAll('input');
        const intervalValues = [];

        inputs.forEach(input => {
            const endTime = parseFloat(input.id.split('_').pop());
            // Handle vibe input for both regular sections and transitions
            if (input.id.includes('vibe_form') || input.id.includes('vibe_trans')) {
                if (!input.value) {
                    input.value = vibeInput || vibes[Math.floor(Math.random() * vibes.length)];
                }
                else if(input.value && input.value != vibeInput && vibeInput != ""){
                    console.log("Vibe: ", input.value);
                    console.log("Vibe input: ", vibeInput);
                    input.value = vibeInput;
                }
            } 
            // Handle texture input for regular sections (no texture for transitions)
            else if (input.id.includes('texture_form')) {
                if (!input.value) {
                    input.value = chosenTexture;
                }
            }
            // Handle style input for regular sections (no style for transitions)
            else if (input.id.includes('style_form')) {
                if (!input.value) {
                    input.value = chosenStyle;
                }
            }
            // Handle imagery input for regular sections (no imagery for transitions)
            else if (input.id.includes('imagery_form')) {
                if (!input.value) {
                    input.value = chosenImagery;
                }
            }
            // Handle color input for both regular sections and transitions
            else if (input.id.includes('color_form') || input.id.includes('color_trans')) {
                if (!input.value) {
                    input.value = colorInput || (index < Math.floor(sections.length / 2) ? 'black/white' : 'myriad of color');
                }
                else if (input.value && input.value != colorInput && colorInput != "") {
                    // console.log("Color: ", input.value);
                    // console.log("Color input: ", vibeInput);
                    input.value = colorInput;
                }
            }
            // Handle motion, strength, and speed inputs for both regular sections and transitions
            else if (input.id.includes('motion_form')) {
                if (!input.value) {
                    input.value = 'zoom_in';
                }
            } 
            else if (input.id.includes('motion_trans')) {
                if (!input.value && motion_mode === "3D" || motion_mode === "3D" && (input.value.includes("spin") || input.value.includes("pan"))) {
                    if (endTime == audioDuration) {
                        input.value = 'rotate_ccw';
                    } else {
                        input.value = 'rotate_right';
                    }

                } else if (!input.value && motion_mode === "2D" || motion_mode === "2D" && (input.value.includes("rotate"))) {
                    if (endTime == audioDuration) {
                        input.value = 'spin_ccw';
                    } else {
                        input.value = 'pan_right';
                    }
                }
            }
            else if (input.id.includes('strength_form')) {
                if (!input.value) {
                    input.value = 'normal';
                }
            } 
            else if (input.id.includes('strength_trans')) {
                if (!input.value) {
                    if (endTime == audioDuration) {
                        input.value = 'vstrong';
                    } else {
                        input.value = 'strong';
                    }
                }
            } 
            intervalValues.push(input.value);
            
        });
        if (section.classList.contains('transition-section')) {
            existingTransitionValues[index] = intervalValues;
        } else {
            existingValues[index] = intervalValues;
        }

        existingValues = Object.keys(existingValues)
            .sort((a, b) => Number(a) - Number(b))  // Sort keys numerically in ascending order
            .reduce((newObj, key, index) => {
                newObj[index] = existingValues[key];  // Reassign values to new consecutive keys
                return newObj;
            }, {});

            existingTransitionValues = Object.keys(existingTransitionValues)
            .sort((a, b) => Number(a) - Number(b))  // Sort keys numerically in ascending order
            .reduce((newObj, key, index) => {
                newObj[index] = existingTransitionValues[key];  // Reassign values to new consecutive keys
                return newObj;
            }, {});
        
    });
    console.log("Updated existingValues:", existingValues);
    console.log("Updated existingTransitionValues:", existingTransitionValues);
}







function gatherFormData() { 
    // const roundedSignificantPoints = newsigPoints.map(point => point.toFixed(2));
    let roundedSignificantPoints = newsigPoints.map(point => point.toFixed(2));

    // Add the final timestamp if it's not already included
    const finalTimeStamp = audioDuration.toFixed(2);
    if (!roundedSignificantPoints.includes(finalTimeStamp)) {
        roundedSignificantPoints.push(finalTimeStamp);
    }
    // Prepare form data dictionary
    const formData = {};
    roundedSignificantPoints.forEach((timestamp, index) => {
        formData[timestamp] = {
            "vibe": document.getElementById(`vibe_form_${index + 1}`).value,
            "imagery": document.getElementById(`imagery_form_${index + 1}`).value,
            "texture": document.getElementById(`texture_form_${index + 1}`).value,
            "style": document.getElementById(`style_form_${index + 1}`).value,
            "color": document.getElementById(`color_form_${index + 1}`).value,
            "motion": document.getElementById(`motion_form_${index + 1}`).value,
            "strength": document.getElementById(`strength_form_${index + 1}`).value,
            // "speed": document.getElementById(`speed_form_${index + 1}`).value
        };
    });

    // console.log("GATHER FORM DATA");
    // console.log(formData);
    // console.log(formData.length);
    return formData;
}

function gatherTransitionData(formData) {
    const transitionsData = {};
    
    // Extract the valid transition sections
    const transitionSections = document.querySelectorAll('.section.transition-section');

    transitionSections.forEach((section) => {
        // Extract the time-range div within this section
        const timeRangeDiv = section.querySelector('.time-range');
        // console.log(timeRangeDiv)

        // Extract the IDs for motion, strength, and speed inputs
        const motionInput = section.querySelector('input[id^="motion_trans_"]');
        const strengthInput = section.querySelector('input[id^="strength_trans_"]');
        // const speedInput = section.querySelector('input[id^="speed_trans_"]');
        // console.log(motionInput, strengthInput);

        // Check if all three inputs are present
        // if (motionInput && strengthInput && speedInput) {
        if (motionInput && strengthInput) {
            // Extract the startTime and endTime from the time-range text
            const timeRangeText = timeRangeDiv.innerText;
            // console.log(timeRangeText);
            const matches = timeRangeText.match(/Transition \((\d+(\.\d+)?)s to (\d+(\.\d+)?)s\)/);
            // console.log(matches);
            if (matches) {
                // console.log("MATCHES: ");
                // console.log(matches);
                const startTime = parseFloat(matches[1]).toFixed(2);
                const endTime = parseFloat(matches[3]).toFixed(2);
                const timeRange = `${startTime}-${endTime}`;
                // console.log(timeRange);

                transitionsData[timeRange] = {
                    // "vibe": document.getElementById(`vibe_form_${startTime}_${endTime}`).value,
                    // "imagery": document.getElementById(`imagery_form_${startTime}_${endTime}`).value,
                    // "texture": document.getElementById(`texture_form_${startTime}_${endTime}`).value,
                    // "style": document.getElementById(`style_form_${startTime}_${endTime}`).value,
                    // "color": document.getElementById(`color_form_${startTime}_${endTime}`).value,
                    "motion": motionInput.value,
                    "strength": strengthInput.value,
                    // "speed": speedInput.value,
                    "transition": true // Since all inputs are present, it's a valid transition
                };
            }
        }
    });

    // console.log(transitionsData);
    return transitionsData;
}

function processTable(){
    const formData = gatherFormData();
    const transitionsData = gatherTransitionData(formData);
    const data = {
        timestamps_scenes: significantPoints.map(point => point.toFixed(2)),  
        form_data: formData,
        transitions_data: transitionsData,
        song_len: audioDuration,
        motion_mode: motion_mode
    };
    document.getElementById('processing').style = "display: block;"
    // console.log(data);
    // console.log("RUNNING PROCESS TABLE");
    

    fetch('/process-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        // console.log(data);
        // console.log("returned back");
        for (const [key, value] of Object.entries(data)) {
            // console.log(`${key}: ${value}`);
            if (key === 'output') {
                // console.log(value);
                window.open(value, '_blank');
            }
        }
        let resultHTML = '';

        // if (data.animation_prompts) {
        //     resultHTML += `<h3>Animation Prompts:</h3><p>${data.animation_prompts}</p>`;
        // }

        if (data.motion_prompts) {
            resultHTML += `<h3>Motion Strings:</h3>`;
            for (const [motion, transitions] of Object.entries(data.motion_prompts)) {
                resultHTML += `<p>${motion}: ${transitions.join(', ')}</p>`;
            }
        }

        if (data.prompts) {
            resultHTML += `<h3>Prompts:</h3><p>${data.prompts}</p>`;
        }

        if (data.output) {
            resultHTML += `<h3>Output:</h3><p><a href="${data.output}" target="_blank">Click here to view the output</a></p>`;
        }

        document.getElementById('processedDataContainer').innerHTML = resultHTML;
        document.getElementById('processedDataContainer').style = "border: 2px solid black;"
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


document.addEventListener("DOMContentLoaded", function() {
    // Define the processAudio function

    const audioFileInput = document.getElementById('audioFile');
    console.log("file: " + audioFileInput)
    let fileSelected = false;
    let selectedFile = null;
    

    // Listen for the file selection event
    audioFileInput.addEventListener('change', function(event) {
        console.log("change")
        selectedFile = document.getElementById('audioFile').files[0];
        console.log(selectedFile)
        fileSelected = !!selectedFile; // Set to true if a file is selected
        setTimeout(() => {
            console.log(fileSelected, selectedFile)
            if (fileSelected && selectedFile) {
                processAudio();
                const addButton = document.getElementById("addNewInterval");
                const deleteButton = document.getElementById("deleteButton");
                const nextButton = document.getElementById("next-transition");
            
                addButton.style.display = "block";
                deleteButton.style.display = "block";
                nextButton.style.display = "block";

                
                fileSelected = false; // Reset the flag for future selections
            }
        }, 0);
    });

    document.getElementById("toggleMotionButton").addEventListener("click", function() {
        refreshTable();
    });


});

function processAudio() {
    tablemade = false;
    const fileInput = document.getElementById('audioFile');
    const play_button = document.getElementById("playPauseButton")
    const slider = document.getElementById("slider")

    play_button.style.display = "block";
    slider.style.display = "block";

    // const clearButton = document.getElementById('clearButton');

    // clearButton.click(); // Ensure clear button is clicked before processing
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
            const audioUrl = URL.createObjectURL(fileInput.files[0]);

            if (waveform) {
                // If there's already a waveform
                if (waveform.regions) {
                    waveform.clearRegions(); 
                }

                waveform.unAll(); 

                waveform.load(audioUrl);
                
            } else {
                // Create a new WaveSurfer instance
                waveform = WaveSurfer.create({
                    container: '#waveform',
                    height: 256,
                    waveColor: 'rgb(200, 0, 200)',
                    progressColor: 'rgb(100, 0, 100)',
                    plugins: [
                        WaveSurfer.regions.create() // Initialize the Regions plugin
                    ],
                });

                // Load the audio URL
                waveform.load(audioUrl);
                
                // console.log("New WaveSurfer instance created and audio loaded: ", audioUrl);
            }

            waveform.on('error', (error) => {
                console.error('WaveSurfer Error: ', error);
            });

            let beats_time = [];

            data.top_onset_times.forEach(beat => {
                beats_time.push(beat.time);
            });

            // Draw the fetched lowEnergyBeats
            let lowEnergyBeatTimes = [];
            data.low_energy_timestamps.forEach(beats => {
                lowEnergyBeatTimes.push(beats.time);
            });

            // Set up regions and markers after the waveform is ready
            waveform.on('ready', () => {
                // console.log("Waveform is ready.");
                setupRegions(waveform, lowEnergyBeatTimes, 'Low Energy Beat', 'red', 0.01, false);
                setupRegions(waveform, beats_time, 'Beats', 'blue', 0.01, false);
                // Event listener for clicking a region
                waveform.on('region-click', (region) => {
                    const currentTime = waveform.getCurrentTime();
                    if (currentTime >= region.start && currentTime <= region.end) {
                        waveform.play(region.start); // Play from the marker start
                    }
                    // console.log("TIME: ", currentTime);
                });

                

                waveform.on('region-update-end', (region) => {
                    // console.log("Region dragging ended");
                
                    // Get all regions from the waveform
                    const allRegions = Object.values(waveform.regions.list); // Fetch all regions as an array
                
                    // Filter for regions that are green
                    const greenRegions = allRegions.filter(r => r.color === 'green');
                
                    // Update newsigPoints based on green regions' start times
                    newsigPoints = greenRegions.map(r => r.start);
                
                    // console.log("Updated newsigPoints:", newsigPoints);
                });
                
            });

            // Zoom control
            const zoomSlider = document.getElementById('zoomSlider');
            // zoomSlider.addEventListener('input', (e) => {
            //     const zoomLevel = Number(e.target.value); // Get the value from the slider
            //     waveform.zoom(zoomLevel); // Adjust the zoom level
            // });
            
            zoomSlider.addEventListener('input', (e) => {
                const zoomLevel = Number(e.target.value); // Get the value from the slider
                waveform.zoom(zoomLevel); // Adjust the zoom level
            
                // Adjust the width of green bars based on the zoom level
                const allRegions = Object.values(waveform.regions.list); // Get all regions
            
                allRegions.forEach(region => {
                    if (region.color === 'green') {
                        // Adjust thickness based on zoom level with a max size of 0.5
                        let newWidth = 0.25 / (zoomLevel / 100);
            
                        // Ensure the width doesn't exceed 0.5 when zooming out
                        if (newWidth > 0.25) {
                            newWidth = 0.25;
                        }
            
                        // Update the region width
                        region.update({ start: region.start, end: region.start + newWidth });
                    }
                });
            });

            // Play/Pause control
            const playPauseButton = document.getElementById('playPauseButton');
            playPauseButton.addEventListener('click', () => {
                if (waveform.isPlaying()) {
                    playPauseButton.innerHTML = '▶';
                    waveform.pause();
                } else {
                    playPauseButton.innerHTML = '⏸';
                    waveform.play();
                }
            });

            document.getElementById('outputContainer').textContent = JSON.stringify(data.output, null, 2);
            lowEnergyBeats = data.low_energy_timestamps; // Update the global variable
            audioDuration = data.duration;

            // console.log("sig pts: ", newsigPoints);
            significantPoints = findSignificantPoints(data.aligned_onsets, lowEnergyBeats, audioDuration);
            significantPoints.sort((a, b) => a - b);
            if(newsigPoints.length == 0){
                // console.log("refresh new song");
                //no sig pts have been identified yet
                newsigPoints = [...significantPoints]
                newsigPoints.sort((a, b) => a - b);
                // console.log("SIG POINTS: " + significantPoints);
                
            }
            else if(significantPoints[0] != newsigPoints[0] || significantPoints.length != newsigPoints.length){
                //new song loaded
                // console.log("new song when one loaded");
                newsigPoints = [...significantPoints]
                newsigPoints.sort((a, b) => a - b);
                
            } else{
                // console.log("same song");
                //same song is loaded
                newsigPoints.sort((a, b) => a - b);
                
            }
            setupRegions(waveform, newsigPoints, 'Significant Points', 'green', 0.25, true);
            waveform.on('region-drag', (region) => {
                console.log('Region dragged to', region.start); // Log new start time
            });
            


        } else {
            document.getElementById('outputContainer').textContent = 'Error: ' + data.error;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('outputContainer').textContent = 'Failed to fetch data.';
    });
}


function setupRegions(waveform, data, content, color, size, drag, resize = false) {
    data.forEach(beat => {
        // Create a region with optional drag and resize capabilities
        const region = waveform.addRegion({
            start: beat,
            end: beat + size,  // Duration of the region
            color: color, // Color for the region
            content: content, // Label content for the region
            drag: drag, // Allow dragging
            resize: resize, // Allow resizing from both sides
        });
        if (color == 'green'){
            region.element.style.zIndex = 100;
            region.on('update-end', () => refreshTable("form"));
            region.on('remove', () => refreshTable("form"));
            console.log("add green region")
        }

        // Add labels for Significant Points regions (as before)
        if (content === "Significant Points") {
            const label = document.createElement('span');
            label.className = 'region-label';
            label.innerText = region.start.toFixed(2); // Display the start time rounded to 2 decimals
            label.style.position = 'absolute';
            label.style.color = 'black';
            label.style.fontSize = '12px';
            label.style.background = 'rgba(255, 255, 255, 0.7)';
            label.style.padding = '2px';
            label.style.borderRadius = '3px';

            region.element.appendChild(label);

            region.on('update', () => {
                label.innerText = region.start.toFixed(2); // Update the label's text
            });

            region.on('update-end', () => {
                label.style.left = `${region.element.getBoundingClientRect().width / 2 - label.clientWidth / 2}px`;
                label.innerText = region.start.toFixed(2); // Update the label's text after dragging ends
            });
        }

        // Special handling for transitions (make sure these are draggable and resizable)
        if (content === "Transition") {
            console.log("Transition region created at", region.start, "with size", size);

            // Add an event listener to handle resizing (if needed)
            region.on('resize', () => {
                console.log("Region resized: Start =", region.start, "End =", region.end);
            });

            // Update visual representation during dragging or resizing
            region.on('update-end', () => {
                console.log("Region updated: Start =", region.start, "End =", region.end);
            });
        }
    });
}

// function drawSignificantPointsAsMarkers(wavesurfer, points) {
//     // Clear any existing markers or regions
//     wavesurfer.clearMarkers();

//     // Loop through significant points and add a thick marker at each point
//     points.forEach((point, index) => {
//         wavesurfer.addMarker({
//             time: point,  // Position of the marker
//             label: `${index + 1}`, // Label for the marker, can be removed or modified
//             color: 'green', // Marker color (red in this case)
//             lineWidth: 4, // Thickness of the marker
//             position: 'top', // Marker position ('top' places the marker at the top of the waveform)
//         });
//     });
// }



// function processAudioNormal() {
//     const fileInput = document.getElementById('audioFile');
//     const thresholdInput = document.getElementById('threshold');
//     const beatContainer = document.getElementById('beatContainer');
//     const waveformCanvas = document.getElementById('waveformCanvas');
//     const audioPlayer = document.getElementById('audioPlayer');
//     const clearButton = document.getElementById('clearButton');

//     clearButton.click();
//     if (fileInput.files.length === 0) {
//         alert("Please select an audio file first.");
//         return;
//     }

//     const formData = new FormData();
//     formData.append('audioFile', fileInput.files[0]);
    

//     fetch('/upload_audio', {
//         method: 'POST',
//         body: formData
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             document.getElementById('outputContainer').textContent = JSON.stringify(data.output, null, 2);
//             lowEnergyBeats = data.low_energy_timestamps; // Update the global variable
//             audioDuration = data.duration;
//             // console.log("LOW ENERGY");
//             // console.log(lowEnergyBeats); // Log for debugging

//             // Now process the audio after lowEnergyBeats are fetched
//             processAudioFile(fileInput, thresholdInput, beatContainer, waveformCanvas, audioPlayer);
//         } else {
//             document.getElementById('outputContainer').textContent = 'Error: ' + data.error;
//         }
//     })
//     .catch(error => {
//         console.error('Error:', error);
//         document.getElementById('outputContainer').textContent = 'Failed to fetch data.';
//     });
// }


// function processAudioFile(fileInput, thresholdInput, beatContainer, waveformCanvas, audioPlayer) {
//     const audioContext = new AudioContext();
//     const reader = new FileReader();

//     reader.onload = function (event) {
//         audioContext.decodeAudioData(event.target.result, function (buffer) {
//             const channelData = buffer.getChannelData(0); // Assume mono or just use the first channel
//             const sampleRate = buffer.sampleRate;
//             let beats_time = []

//             displayBeats(channelData, beatContainer, audioPlayer, event.target.result, buffer, fileInput);
//             const beats = detectBeats(channelData, sampleRate, thresholdInput.value);
//             // console.log("BEATS: ");
//             beats.forEach(beat => {
//                 beats_time.push(beat.time);
//             });
//             // console.log("BEAT TIME: " + beats_time);

//             // Draw the fetched lowEnergyBeats
//             let lowEnergyBeatTimes = [];
//             lowEnergyBeats.forEach(beats => {
//                 lowEnergyBeatTimes.push(beats.time);
//             });
//             // console.log("LOW BEAT TIMES: " + lowEnergyBeatTimes);
//             drawBeats(lowEnergyBeatTimes, beatContainer, buffer.duration, 'blue');
//             drawBeats(beats_time, beatContainer, buffer.duration, 'red');
//             // console.log(beats);
//             // console.log(lowEnergyBeats);
//             significantPoints = findSignificantPoints(beats, lowEnergyBeats, audioDuration);
//             // console.log("SIG POINTS: " + significantPoints);
//             drawBeats(significantPoints, beatContainer, buffer.duration, 'green', true);
//         }, function (error) {
//             console.error("Error decoding audio data: " + error);
//         });
//     };

//     reader.readAsArrayBuffer(fileInput.files[0]);
// }

// function filterClosePoints(points, maxGap) {
//     const sortedPoints = points.slice().sort((a, b) => a - b);
//     const filtered = [sortedPoints[0]]; // Start with the first point

//     for (let i = 1; i < sortedPoints.length; i++) {
//         if (sortedPoints[i] - filtered[filtered.length - 1] > maxGap) {
//             filtered.push(sortedPoints[i]);
//         }
//     }

//     return filtered;
// }

// function findSignificantPoints(beats, lowEnergyBeats, songDuration) {
//     // Step 1: Combine beats and lowEnergyBeats with metadata
//     const combined = [];
//     beats.forEach(point => combined.push({ time: point.time, source: 'beat', strength: point.strength }));
//     lowEnergyBeats.forEach(point => combined.push({ time: point.time, source: 'lowEnergy', strength: point.strength }));

//     // Step 2: Sort combined array by time
//     combined.sort((a, b) => a.time - b.time);

//     // Exclude points too close to the beginning or end
//     const excludedPoints = combined.filter(point => 
//         point.time > 3 && point.time < (songDuration - 4)
//     );

//     // Step 3: Clustering
//     const clustered = [];
//     let currentCluster = [];
//     const minDistance = 1; // Minimum distance between points to be in the same cluster
//     const maxLowEnergyDistance = 3; // Maximum distance for lowEnergyBeats to be clustered together

//     for (let i = 0; i < excludedPoints.length; i++) {
//         if (currentCluster.length === 0) {
//             currentCluster.push(excludedPoints[i]);
//         } else {
//             const lastPoint = currentCluster[currentCluster.length - 1];
//             const currentPoint = excludedPoints[i];

//             if (currentPoint.source === 'lowEnergy' && (currentPoint.time - currentCluster[0].time) <= maxLowEnergyDistance) {
//                 currentCluster.push(currentPoint);
//             } else if ((currentPoint.time - lastPoint.time) < minDistance) {
//                 currentCluster.push(currentPoint);
//             } else {
//                 clustered.push(currentCluster);
//                 currentCluster = [currentPoint];
//             }
//         }
//     }

//     if (currentCluster.length > 0) {
//         clustered.push(currentCluster);
//     }

//     // Step 4: Selecting points
//     const finalPoints = [];
//     clustered.forEach(cluster => {
//         if (cluster.length > 0) {
//             // Check for clusters with multiple lowEnergyBeats
//             const lowEnergyPoints = cluster.filter(point => point.source === 'lowEnergy');
//             if (lowEnergyPoints.length > 1) {
//                 // Average the locations of lowEnergyBeats
//                 const lowEnergySum = lowEnergyPoints.reduce((sum, point) => sum + point.time, 0);
//                 const averageLowEnergy = lowEnergySum / lowEnergyPoints.length;
//                 finalPoints.push(averageLowEnergy);
//             } else {
//                 // Select the most significant point in each cluster
//                 const significantPoint = cluster.reduce((prev, curr) => {
//                     // Prefer points with higher strength
//                     if (curr.source === 'beat' && (prev.source !== 'beat' || curr.strength > prev.strength)) return curr;
//                     return prev;
//                 }, cluster[0]);

//                 finalPoints.push(significantPoint.time);
//             }
//         }
//     });

//     // Ensure we have roughly 10 points
//     const desiredCount = Math.floor(songDuration / 4);

//     // Combine or average points within 2.5 seconds of each other
//     const combinedFinalPoints = [];
//     for (let i = 0; i < finalPoints.length; i++) {
//         if (combinedFinalPoints.length === 0) {
//             combinedFinalPoints.push(finalPoints[i]);
//         } else {
//             const lastPoint = combinedFinalPoints[combinedFinalPoints.length - 1];
//             const currentPoint = finalPoints[i];
//             if (currentPoint - lastPoint <= 2.5) {
//                 // Average the points
//                 combinedFinalPoints[combinedFinalPoints.length - 1] = (lastPoint + currentPoint) / 2;
//             } else {
//                 combinedFinalPoints.push(currentPoint);
//             }
//         }
//     }

//     if (combinedFinalPoints.length > desiredCount) {
//         return combinedFinalPoints.slice(0, desiredCount);
//     } else {
//         return insertAdditionalPoints(combinedFinalPoints, combined, beats, lowEnergyBeats, desiredCount, songDuration);
//     }
// }

// function insertAdditionalPoints(finalPoints, allPoints, beats, lowEnergyBeats, desiredCount, songDuration) {
//     const newPoints = [...finalPoints];
//     newPoints.sort((a, b) => a - b);

//     const minGap = 2.5;
//     let loopCounter = 0;
//     const maxLoops = 5;
//     let lastNewPointLength = -1;

//     while (newPoints.length < desiredCount) {
//         const gaps = [];

//         // Include the start of the song as a gap
//         if (newPoints.length === 0 || newPoints[0] > 0) {
//             gaps.push({ start: 0, end: newPoints[0] || songDuration, gap: newPoints[0] || songDuration });
//         }

//         for (let i = 0; i < newPoints.length - 1; i++) {
//             const start = newPoints[i];
//             const end = newPoints[i + 1];
//             gaps.push({ start, end, gap: end - start });
//         }

//         // Include the end of the song as a gap
//         if (newPoints.length === 0 || newPoints[newPoints.length - 1] < songDuration) {
//             gaps.push({ start: newPoints[newPoints.length - 1] || 0, end: songDuration, gap: songDuration - (newPoints[newPoints.length - 1] || 0) });
//         }

//         const maxGapObj = gaps.reduce((max, gap) => gap.gap > max.gap ? gap : max, { gap: 0 });

//         if (maxGapObj.gap >= minGap) {
//             const midPoint = (maxGapObj.start + maxGapObj.end) / 2;
//             const nearbyPoints = allPoints.filter(p => p.time >= maxGapObj.start && p.time <= maxGapObj.end);

//             const lowEnergyCandidates = nearbyPoints.filter(p => p.source === 'lowEnergy' && Math.abs(p.time - midPoint) <= 2);
//             if (lowEnergyCandidates.length > 0) {
//                 const centerPoint = lowEnergyCandidates.reduce((sum, point) => sum + point.time, 0) / lowEnergyCandidates.length;
//                 if (!newPoints.some(p => Math.abs(p - centerPoint) <= minGap) && centerPoint > 3 && centerPoint < (songDuration - 3)) {
//                     newPoints.push(centerPoint);
//                 }
//             } else {
//                 const beatCandidates = nearbyPoints.filter(p => p.source === 'beat' && Math.abs(p.time - midPoint) <= 2);
//                 if (beatCandidates.length > 0) {
//                     const chosenPoint = beatCandidates[0].time;
//                     if (!newPoints.some(p => Math.abs(p - chosenPoint) <= minGap) && chosenPoint > 3 && chosenPoint < (songDuration - 3)) {
//                         newPoints.push(chosenPoint);
//                     }
//                 } else {
//                     if (!newPoints.some(p => Math.abs(p - midPoint) <= minGap) && midPoint > 3 && midPoint < (songDuration - 3)) {
//                         newPoints.push(midPoint);
//                     }
//                 }
//             }
//         } else {
//             // Add directly from beats and lowEnergyBeats if necessary
//             let addedPoints = false;

//             for (let i = 0; i < lowEnergyBeats.length && newPoints.length < desiredCount; i++) {
//                 if (!newPoints.includes(lowEnergyBeats[i].time) && (newPoints.length === 0 || lowEnergyBeats[i].time - newPoints[newPoints.length - 1] >= minGap) && lowEnergyBeats[i].time > 3 && lowEnergyBeats[i].time < (songDuration - 3)) {
//                     newPoints.push(lowEnergyBeats[i].time);
//                     addedPoints = true;
//                 }
//             }
//             for (let i = 0; i < beats.length && newPoints.length < desiredCount; i++) {
//                 if (!newPoints.includes(beats[i].time) && (newPoints.length === 0 || beats[i].time - newPoints[newPoints.length - 1] >= minGap) && beats[i].time > 3 && beats[i].time < (songDuration - 3)) {
//                     newPoints.push(beats[i].time);
//                     addedPoints = true;
//                 }
//             }

//             if (!addedPoints) {
//                 loopCounter++;
//                 if (loopCounter > maxLoops) {
//                     break; // Exit if too many iterations
//                 }
//             }
//         }

//         // Sort again to find new gaps
//         newPoints.sort((a, b) => a - b);

//         // Check if the length of newPoints is within 2 of the desiredCount
//         if (desiredCount - newPoints.length <= 2) {
//             break; // Exit if close to desired count
//         }

//         // Break if no new points are added to prevent infinite loops
//         if (newPoints.length === lastNewPointLength) {
//             break;
//         } else {
//             lastNewPointLength = newPoints.length;
//         }
//     }

//     // Ensure no duplicates and the exact desired count
//     return [...new Set(newPoints)].slice(0, desiredCount);
// }


function filterClosePoints(points, maxGap) {
    const sortedPoints = points.slice().sort((a, b) => a - b);
    const filtered = [sortedPoints[0]]; // Start with the first point

    for (let i = 1; i < sortedPoints.length; i++) {
        if (sortedPoints[i] - filtered[filtered.length - 1] > maxGap) {
            filtered.push(sortedPoints[i]);
        }
    }

    return filtered;
}

function findSignificantPoints(beats, lowEnergyBeats, songDuration) {
    // console.log("find sig");

    // Step 1: Combine beats and lowEnergyBeats with metadata
    const combined = [];
    // console.log("beats: ", beats);
    // console.log("lowenergy: ", lowEnergyBeats);
    beats.forEach(point => combined.push({ time: point.time, source: 'beat', strength: point.strength }));
    lowEnergyBeats.forEach(point => combined.push({ time: point.time, source: 'lowEnergy', strength: point.strength }));

    // Step 2: Sort combined array by time
    combined.sort((a, b) => a.time - b.time);

    // Exclude points too close to the beginning or end
    const excludedPoints = combined.filter(point => 
        point.time > 3 && point.time < (songDuration - 3)
    );

    // Step 3: Selecting points
    const finalPoints = [];
    const desiredCount = Math.ceil(songDuration / 4);
    const minGap = 3.7; // Minimum gap between selected points

    let lastSelectedTime = -minGap; // Initialize to a negative value

    excludedPoints.forEach(point => {
        if (point.time - lastSelectedTime >= minGap) {
            // Check for strong nearby points (within 1.5 seconds)
            const nearbyPoints = excludedPoints.filter(p => 
                Math.abs(p.time - point.time) <= 1.5
            );

            if (nearbyPoints.length > 0) {
                // Select the strongest point from nearby candidates
                const strongestPoint = nearbyPoints.reduce((prev, curr) => {
                    return (curr.strength > prev.strength) ? curr : prev;
                });

                // Add the strongest point's time
                finalPoints.push(strongestPoint.time);
                lastSelectedTime = strongestPoint.time; // Update the last selected time
            }
        }
    });

    // Ensure the final points are unique
    let uniqueFinalPoints = [...new Set(finalPoints)];
    // console.log("unique: ", uniqueFinalPoints);

    // Step 4: Remove any points where the gap between consecutive points is shorter than 3 seconds (except the final point)
    uniqueFinalPoints = uniqueFinalPoints.filter((point, index, array) => {
        if (index === array.length - 1) {
            return true; // Always keep the final point
        }
        return (array[index + 1] - point >= 3); // Keep if the gap to the next point is >= 3 seconds
    });

    // console.log("Filtered points (gap >= 3): ", uniqueFinalPoints);

    // Step 5: If we have more than the desired count, slice to desired count
    if (uniqueFinalPoints.length > desiredCount) {
        // console.log("more");
        return uniqueFinalPoints.slice(0, desiredCount);
    } else {
        // console.log("less");
        // Otherwise, insert additional points if needed
        return insertAdditionalPoints(uniqueFinalPoints, combined, beats, lowEnergyBeats, desiredCount, songDuration);
    }
}


// Inserts additional points if there are fewer than the desired number of points
// function insertAdditionalPoints(finalPoints, allPoints, beats, lowEnergyBeats, desiredCount, songDuration) {
//     console.log("insert");

//     const newPoints = [...finalPoints];
//     newPoints.sort((a, b) => a - b);
//     const minGap = 4;

//     let loopCounter = 0; // Counter to prevent infinite loops
//     const maxLoops = 15; // Maximum number of iterations to prevent infinite loops

//     while (newPoints.length < desiredCount && loopCounter < maxLoops) {
//         loopCounter++; // Increment the loop counter

//         const gaps = [];

//         // Include the start of the song as a gap
//         if (newPoints.length === 0 || newPoints[0] > 0) {
//             gaps.push({ start: 0, end: newPoints[0] || songDuration, gap: newPoints[0] || songDuration });
//         }

//         for (let i = 0; i < newPoints.length - 1; i++) {
//             const start = newPoints[i];
//             const end = newPoints[i + 1];
//             gaps.push({ start, end, gap: end - start });
//         }

//         // Include the end of the song as a gap
//         if (newPoints.length === 0 || newPoints[newPoints.length - 1] < songDuration) {
//             gaps.push({ start: newPoints[newPoints.length - 1] || 0, end: songDuration, gap: songDuration - (newPoints[newPoints.length - 1] || 0) });
//         }

//         const maxGapObj = gaps.reduce((max, gap) => gap.gap > max.gap ? gap : max, { gap: 0 });

//         if (maxGapObj.gap >= minGap) {
//             const midPoint = (maxGapObj.start + maxGapObj.end) / 2;
//             const nearbyPoints = allPoints.filter(p => p.time >= maxGapObj.start && p.time <= maxGapObj.end);

//             // Try to align with lowEnergy or beat points
//             const candidates = nearbyPoints.filter(p => Math.abs(p.time - midPoint) <= 2);
//             if (candidates.length > 0) {
//                 const chosenPoint = candidates.reduce((prev, curr) => {
//                     return (curr.strength > prev.strength) ? curr : prev;
//                 });
//                 if (!newPoints.includes(chosenPoint.time) && (newPoints.length === 0 || chosenPoint.time - newPoints[newPoints.length - 1] >= minGap)) {
//                     newPoints.push(chosenPoint.time);
//                 }
//             }
//         } else {
//             // Break if there are no more gaps large enough to insert
//             break;
//         }
//         // console.log("new pt: ", newPoints)
//         // Sort again to find new gaps
//         newPoints.sort((a, b) => a - b);
//     }

//     // Ensure no duplicates and the exact desired count
//     console.log([...new Set(newPoints)].slice(0, desiredCount));
//     return [...new Set(newPoints)].slice(0, desiredCount);
// }

function insertAdditionalPoints(finalPoints, allPoints, beats, lowEnergyBeats, desiredCount, songDuration) {
    // console.log("insert");

    const newPoints = [...finalPoints];
    newPoints.sort((a, b) => a - b);
    const minGap = 4;
    const endGapThreshold = 6;  // minimum gap of 3 seconds between last point and total song duration

    let loopCounter = 0; // Counter to prevent infinite loops
    const maxLoops = 15; // Maximum number of iterations to prevent infinite loops

    while (newPoints.length < desiredCount && loopCounter < maxLoops) {
        loopCounter++; // Increment the loop counter

        const gaps = [];

        // Include the start of the song as a gap
        if (newPoints.length === 0 || newPoints[0] > 0) {
            gaps.push({ start: 0, end: newPoints[0] || songDuration, gap: newPoints[0] || songDuration });
        }

        for (let i = 0; i < newPoints.length - 1; i++) {
            const start = newPoints[i];
            const end = newPoints[i + 1];
            gaps.push({ start, end, gap: end - start });
        }

        // Include the end of the song as a gap
        const lastPoint = newPoints[newPoints.length - 1] || 0;
        const remainingGap = songDuration - lastPoint;

        if (remainingGap >= endGapThreshold) {
            gaps.push({ start: lastPoint, end: songDuration, gap: remainingGap });
        }

        const maxGapObj = gaps.reduce((max, gap) => gap.gap > max.gap ? gap : max, { gap: 0 });

        if (maxGapObj.gap >= minGap) {
            const midPoint = (maxGapObj.start + maxGapObj.end) / 2;
            const nearbyPoints = allPoints.filter(p => p.time >= maxGapObj.start && p.time <= maxGapObj.end);
            // console.log("nearby: " + nearbyPoints);
            // Try to align with lowEnergy or beat points
            const candidates = nearbyPoints.filter(p => Math.abs(p.time - midPoint) <= 2);
            // console.log("candiates: " + candidates)
            if (candidates.length > 0) {
                const chosenPoint = candidates.reduce((prev, curr) => (curr.strength > prev.strength) ? curr : prev);
                if (!newPoints.includes(chosenPoint.time) && (newPoints.length === 0 || chosenPoint.time - newPoints[newPoints.length - 1] >= minGap)) {
                    newPoints.push(chosenPoint.time);
                }
            }
        } else {
            // Break if there are no more gaps large enough to insert
            break;
        }

        // Sort again to find new gaps
        newPoints.sort((a, b) => a - b);
    }

    // Handle final point placement logic if needed
    if (songDuration - newPoints[newPoints.length - 1] >= 5) {
        // console.log("handle final")
        // Find a strong beat or lowEnergy beat within this range
        const candidates = allPoints.filter(p => p.time >= (songDuration - 4) && p.time <= (songDuration - 1.5));
        // console.log("candidates: ", candidates);
        if (candidates.length > 0) {
            const chosenFinalPoint = candidates.reduce((prev, curr) => (curr.strength > prev.strength) ? curr : prev);
            // console.log("chosen final point: ", chosenFinalPoint)
            if (!newPoints.includes(chosenFinalPoint.time)) {
                newPoints.push(chosenFinalPoint.time);
            }
        }
    }

    // Ensure no duplicates and the exact desired count
    // console.log([...new Set(newPoints)].slice(0, desiredCount));
    return [...new Set(newPoints)].slice(0, desiredCount);
}



function updateNewsigPoints() {
    // Clear newsigPoints and update based on current label values
    newsigPoints = [];
    const labels = document.querySelectorAll('.time-label');
    labels.forEach(label => {
        newsigPoints.push(parseFloat(label.value));
    });
    newsigPoints.sort((a, b) => a - b); // Sort the points in ascending order
}

function createBeat(beatTime, beatContainer, duration, color, isHidden = false, isNew = false) {
    const beatLine = document.createElement('div');
    beatLine.className = 'beat';
    beatLine.style.left = `${(beatTime / duration) * beatContainer.offsetWidth}px`;
    beatLine.style.height = '100%';
    beatLine.style.width = isNew ? '4px' : '2px'; // Thicker line for new intervals
    beatLine.style.position = 'absolute';
    beatLine.style.backgroundColor = isNew ? 'red' : color;
    if (isHidden) {
        beatLine.style.display = 'none';
        beatLine.classList.add('hidden-beat');
        const timeLabel = document.createElement('input');
        timeLabel.type = 'text';
        timeLabel.className = 'time-label';
        timeLabel.value = beatTime.toFixed(2);
        timeLabel.style.position = 'absolute';
        timeLabel.style.top = '0';
        timeLabel.style.left = `${(beatTime / duration) * beatContainer.offsetWidth}px`;
        timeLabel.style.transform = 'translateX(-50%)';
        timeLabel.style.backgroundColor = isNew ? 'green' : '';
        
        beatLine.timeLabel = timeLabel;

        // Event listener for clicking on the time label
        timeLabel.addEventListener('click', function () {
            if (lastClickedLabel === timeLabel) { 
                lastClickedLabel.style.borderColor = '';
                timeLabel.style.borderColor = 'red';
                lastClickedLabel = timeLabel;
            }
            timeLabel.style.zIndex = '1000';
            if (lastClickedLabel) {
                lastClickedLabel.style.borderColor = ''; // Deselect previous label
            }
            // lastClickedLabel = timeLabel; // Update lastClickedLabel
            // timeLabel.style.borderColor = 'red'; // Highlight selected label
        });

        timeLabel.addEventListener('input', function () {
            const newTime = parseFloat(timeLabel.value);
            if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
                beatLine.style.left = `${(newTime / duration) * beatContainer.offsetWidth}px`;
                timeLabel.style.left = `${(newTime / duration) * beatContainer.offsetWidth}px`;
                timeLabel.style.zIndex = '1000';
                // console.log("input");
                // console.log(timeLabel);
                // console.log(newTime);
                updateNewsigPoints();
                // newsigPoints[index] = newTime;
            }
        });

        // Attach the click event listener directly to the hidden beat
        beatLine.addEventListener('click', function () {
            if (lastClickedLabel) {
                lastClickedLabel.style.borderColor = ''; // Deselect previous label
            }
            lastClickedLabel = beatLine.timeLabel; // Update lastClickedLabel to the hidden beat's time label
            beatLine.timeLabel.style.borderColor = 'red'; // Highlight selected label
            beatLine.timeLabel.style.zIndex = '1000';
        });

        // Handle dragging of the beat line
        beatLine.addEventListener('mousedown', function () {
            timeLabel.style.backgroundColor = ''; // Remove green background on drag
            beatLine.style.backgroundColor = 'green'; // Return to normal color
            beatLine.style.width = '2px'; // Return to normal thickness
            beatLine.timeLabel.style.zIndex = '1000';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(event) {
            const rect = beatContainer.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const percentage = offsetX / rect.width;
            const newTime = percentage * duration;

            if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
                beatLine.style.left = `${(newTime / duration) * beatContainer.offsetWidth}px`;
                timeLabel.style.left = `${(newTime / duration) * beatContainer.offsetWidth}px`;
                timeLabel.value = newTime.toFixed(2);
                timeLabel.style.backgroundColor = 'green';
            }
        }

        function onMouseUp() {
            timeLabel.style.backgroundColor = ''; // Reset background color
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            updateNewsigPoints(); // Update newsigPoints after drag is completed
        }

        // Append the elements to the container
        
        beatContainer.appendChild(timeLabel);

        // Initially show the hidden beat if new interval
        if (isNew) {
            beatLine.style.display = 'block';
            newsigPoints.push(beatTime);
            updateNewsigPoints(); // Ensure newsigPoints is updated with new beat
        }

        document.getElementById('deleteButton').addEventListener('click', function () {
            // console.log("DELETE");
            // console.log(lastClickedLabel);
            if (lastClickedLabel) {
                const index = Array.from(beatContainer.children).indexOf(lastClickedLabel);
                if (index !== -1) {
                    newsigPoints.splice(index, 1); // Remove the corresponding time from newsigPoints
                    lastClickedLabel.remove(); // Remove the label from the DOM
                    beatContainer.children[index].remove(); // Remove the corresponding beat line
                    lastClickedLabel = null; // Reset lastClickedLabel
                    updateNewsigPoints();
                }
            }
            
            
        });
    }

    beatContainer.appendChild(beatLine);
}

function drawBeats(beats, beatContainer, duration, color, hidden = false) {
    clearPreviousTimestamps();
    newsigPoints = [...beats];
    
    beats.forEach((beat) => {
        createBeat(beat, beatContainer, duration, color, hidden);
    });
}

function addNewInterval() {
    const cursorTime = waveform.getCurrentTime();
    console.log("add new interval newsig: ", newsigPoints);
    data = [cursorTime]
    newsigPoints = [data[0], ...newsigPoints];
    const index = newsigPoints.sort((a, b) => a - b).indexOf(data[0]);
    console.log("add interval index: ", index)

    newsigPoints = newsigPoints.sort((a, b) => a - b);
    // console.log("AFTER ADD: ", newsigPoints)
    setupRegions(waveform, data, "Significant Points", 'green', 0.25, true);
    // finalizeTimestamps("time",index,-1);
    refreshTable("form");
    //OLD VERSION
    // const beatContainer = document.getElementById('beatContainer');
    // const duration = audioDuration;
    // const middleTime = duration / 2;

    // createBeat(middleTime, beatContainer, duration, 'red', true, true);
}

function delete_intervals() {
    // Toggle delete mode on/off when the function is called
    deleteMode = !deleteMode;
    
    const deleteButton = document.getElementById('deleteButton');
    
    if (deleteMode) {
        // console.log("Delete mode enabled. Click on a region to delete it.");
        
        // Update the button style to reflect the active delete mode
        deleteButton.textContent = "Exit Delete Mode";
        deleteButton.style.backgroundColor = "red";
        deleteButton.style.color = "white";

        // Add a hover effect and region click event listener
        Object.values(waveform.regions.list).forEach(region => {
            if (region.color === 'green') {
                // Add hover effect to highlight in red
                region.element.addEventListener('mouseenter', () => {
                    if (deleteMode) {
                        region.update({ color: 'red' });
                    }
                });
                region.element.addEventListener('mouseleave', () => {
                    if (deleteMode) {
                        region.update({ color: 'green' });
                    }
                });
            }
        });

        // Add the event listener for region click
        waveform.on('region-click', (region, e) => {
            e.stopPropagation(); // Prevent any other action from triggering

            // Only delete if the region is a green significant point
            if (region.color === 'red') { // After hover, region will be red
                // Remove the region from the waveform
                region.remove();

                // Update the newsigPoints array by filtering out the deleted region
                console.log(newsigPoints)
                console.log("reg start: ", region.start)
                let deletedTimeIndex = 0;
                for (let i = 0; i < newsigPoints.length; i++) {
                    if (region.start < newsigPoints[i]) {
                        deletedTimeIndex = i;
                        break;
                    } else {
                        deletedTimeIndex = newsigPoints.length; // If region.start is greater than all elements, it will be at the end
                    }
                }
                newsigPoints = newsigPoints.filter(time => time !== region.start);
                console.log("new sig in delete func: ", newsigPoints, existingValues)
                console.log("DELETE INTERVAL FUNC INDEX: ", deletedTimeIndex)
                delete existingValues[deletedTimeIndex];
                if (deletedTimeIndex === 0) {

                }

                // existingValues = Object.keys(existingValues)
                //     .sort((a, b) => a - b)  // Sort keys numerically in ascending order
                //     .reduce((newObj, key, index) => {
                //         newObj[index] = existingValues[key];
                //         return newObj;
                //     }, {});

                console.log(existingValues)

                refreshTable("form")

                // console.log("Deleted region and updated newsigPoints:", newsigPoints);
            } else {
                console.log("Clicked on a non-deletable region. No action taken.");
            }
        });
    } else {
        // console.log("Delete mode disabled.");

        // Restore the button to its original state
        deleteButton.textContent = "Delete Intervals";
        deleteButton.style.backgroundColor = "";
        deleteButton.style.color = "";

        // Remove the hover and click event listeners when delete mode is off
        Object.values(waveform.regions.list).forEach(region => {
            if (region.color === 'green' || region.color === 'red') {
                region.element.removeEventListener('mouseenter', null);
                region.element.removeEventListener('mouseleave', null);
            }
        });

        waveform.un('region-click'); // Remove the region click listener when delete mode is off
    }
}

function addDefaultTransitions() {
    const allRegions = Object.values(waveform.regions.list);
    const greenRegions = allRegions.filter(region => region.color === 'green');
    let transitionRegions = [];

    // Create 1 sec transition around interval start time
    greenRegions.forEach(region => {
        const startTime = region.start;
        
        const transitionStart = Math.max(0, startTime - 0.5); // Ensure start time is not negative
        const transitionEnd = startTime + 0.5;
        
        transitionRegions.push({ start: transitionStart, end: transitionEnd });
    });

    transitionRegions.sort((a, b) => a.start - b.start);
    const waveformDuration = waveform.getDuration();

    if (transitionRegions.length > 0) {
        const lastTransitionEnd = transitionRegions[transitionRegions.length - 1].end;
        
        // Check for overlap
        if (lastTransitionEnd >= waveformDuration - 1.5) {
            // Align final transition
            transitionRegions.push({ start: lastTransitionEnd, end: waveformDuration });
        } else {
            // Final transition of 2 seconds capped at the waveform's duration
            const finalStart = waveformDuration - 1.5;
            transitionRegions.push({ start: finalStart, end: waveformDuration });
        }
    } else {
        // If no transitions, add a final transition from 2 seconds before the end
        transitionRegions.push({ start: waveformDuration - 1.5, end: waveformDuration });
    }

    // add the regions to the waveform
    transitionRegions.forEach(region => {
        const reg = waveform.addRegion({
            start: region.start,
            end: region.end,
            color: 'rgba(255, 165, 0, 0.5)',
            drag: true,
            resize: true,
        });
        reg.on('update-end', () => refreshTable("none"));
        reg.on('remove', () => refreshTable("none"));
    });
    

    console.log("Added transitions:", transitionRegions);
}



function addTransitionRegions() {
    const waveformDuration = waveform.getDuration();
    const cursorTime = waveform.getCurrentTime(); // Get the current cursor position
    const regionStart = (cursorTime - 0.5).toFixed(2);
    const regionEnd = (cursorTime + 0.5).toFixed(2);

    const reg = waveform.addRegion({
        start: regionStart,
        end: regionEnd,
        color: 'rgba(255, 165, 0, 0.5)',
        drag: true,
        resize: true,
    });
    reg.on('update-end', () => refreshTable("trans"));
    reg.on('remove', () => refreshTable("trans"));
    console.log("add transition region len idx: ", Object.keys(existingTransitionValues).length)
    // addTransitions(Object.keys(existingTransitionValues).length, regionStart, regionEnd, Object.keys(existingTransitionValues).length, existingTransitionValues);
    refreshTable("trans");

    console.log(`Added transition region at center: ${regionStart} to ${regionEnd}`);
    // finalizeTimestamps("transition");
}

function delete_transitions() {
    // Toggle delete mode for transitions
    deleteModeT = !deleteModeT;
    
    const deleteButton = document.getElementById('deleteTransitionButton'); // Assuming a separate button for deleting transitions
    
    if (deleteModeT) {
        console.log("Transition delete mode enabled. Click on an orange transition to delete it.");
        
        // Update the button style to reflect the active delete mode
        deleteButton.textContent = "Exit Transition Delete Mode";
        deleteButton.style.backgroundColor = "red";
        deleteButton.style.color = "white";

        // Add hover effect and region click event listener
        Object.values(waveform.regions.list).forEach(region => {
            // console.log("hello");
            if (region.color === 'rgba(255, 165, 0, 0.5)') { // Focus on orange-colored transitions
                // Add hover effect to highlight in red
                region.element.addEventListener('mouseenter', () => {
                    if (deleteModeT) {
                        region.update({ color: 'rgba(255, 0, 0, 0.5)' }); // Temporarily change to red
                    }
                });
                region.element.addEventListener('mouseleave', () => {
                    if (deleteModeT) {
                        region.update({ color: 'rgba(255, 165, 0, 0.5)' }); // Revert to orange
                    }
                });
            }
        });

        waveform.on('region-click', (region, e) => {
            e.stopPropagation(); // Prevent other actions from triggering

            if (region.color === 'rgba(255, 0, 0, 0.5)') {
                // Remove the region from the waveform
                region.remove();
                refreshTable("trans");

                // console.log("Deleted transition region:", region);
            } else {
                console.log("Clicked on a non-deletable region. No action taken.");
            }
        });

    } else {
        console.log("Transition delete mode disabled.");
        
        // Restore the button to its original state
        deleteButton.textContent = "Delete Transitions";
        deleteButton.style.backgroundColor = "";
        deleteButton.style.color = "";

        // Remove the hover and click event listeners when delete mode is off
        Object.values(waveform.regions.list).forEach(region => {
            if (region.color === 'rgba(255, 165, 0, 0.5)' || region.color === 'rgba(255, 0, 0, 0.5)') {
                region.element.removeEventListener('mouseenter', null);
                region.element.removeEventListener('mouseleave', null);
            }
        });

        waveform.un('region-click'); // Remove the region click listener when delete mode is off
    }
}

//OG
// function refreshTable() {
//     if (tablemade == true){
//         // Get current regions
//         const allRegions = Object.values(waveform.regions.list);
//         let greenRegions = allRegions.filter(region => region.color === 'green');
//         // console.log("green before move: ", greenRegions);
//         let orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');
//         console.log("orange before move: ", orangeRegions);
//         greenRegions = greenRegions.sort((a, b) => a.start - b.start);
//         orangeRegions = orangeRegions.sort((a, b) => a.start - b.start);
//         // console.log("green after move: ", greenRegions);
//         console.log("orange after move: ", orangeRegions);

//         // console.log("sig before drag: ", newsigPoints)
//         // Prepare significant points (this is just an example; adapt as necessary)
//         newsigPoints = greenRegions.map(region => region.start); // Example logic
//         // console.log("new sig after drag: ", newsigPoints)
//         const audioDuration = waveform.getDuration()

//         // Call finalizeTimestamps with the type
//         // finalizeTimestamps("transition", newsigPoints, orangeRegions, audioDuration);
//         finalizeTimestamps("time", newsigPoints, orangeRegions, audioDuration);
//     }
// }

// Working refreshTable with updated code
// function refreshTable(new_type) {
//     if (tablemade == true){
//         console.log("TYPE OF ADDITION: ", new_type);
//         // Get current regions
//         const allRegions = Object.values(waveform.regions.list);

//         let greenRegions = allRegions.filter(region => region.color === 'green');
//         // console.log("green before move: ", greenRegions);
//         let orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)');
//         greenRegions = greenRegions.sort((a, b) => a.start - b.start);
//         orangeRegions = orangeRegions.sort((a, b) => a.start - b.start);
//         console.log("green before move: ", greenRegions);
//         console.log("orange before move: ", orangeRegions);
//         console.log("og updated green: ", updatedGreenRegions);
//         console.log("og updated orange: ", updatedOrangeRegions);


//         if(new_type == "form"){
//             const mismatches = greenRegions.filter((greenRegion, index) => {
//                 const updatedRegion = updatedGreenRegions[index];
//                 return !updatedRegion || greenRegion.start !== updatedRegion.start || greenRegion.end !== updatedRegion.end;
//             });
//             console.log("Mismatched green regions: ", mismatches);

//         }else if (new_type == "trans"){
//             const mismatches = orangeRegions.filter((orangeRegion, index) => {
//                 const updatedRegion = updatedOrangeRegions[index];
//                 return !updatedRegion || orangeRegion.start !== updatedRegion.start || orangeRegion.end !== updatedRegion.end;
//             });
//             console.log("Mismatched orange regions: ", mismatches);
//             // finalizeTimestamps("time");
//         }else {
//             ;
//         }

//         updatedGreenRegions = greenRegions
//         updatedOrangeRegions = orangeRegions
//         console.log("new updated green: ", updatedGreenRegions);
//         console.log("new updated orange: ", updatedOrangeRegions);
//         // console.log("green after move: ", greenRegions);
//         // console.log("orange after move: ", orangeRegions);

//         // console.log("sig before drag: ", newsigPoints)
//         // Prepare significant points (this is just an example; adapt as necessary)
//         newsigPoints = greenRegions.map(region => region.start); // Example logic
//         // console.log("new sig after drag: ", newsigPoints)
//         const audioDuration = waveform.getDuration()

//         // Call finalizeTimestamps with the type
//         // finalizeTimestamps("transition", newsigPoints, orangeRegions, audioDuration);
//         finalizeTimestamps("time");
//     }
// }


function refreshTable(new_type) {
    if (tablemade) {
        
        const allRegions = Object.values(waveform.regions.list);
        
        let greenRegions = allRegions.filter(region => region.color === 'green').sort((a, b) => a.start - b.start);
        let orangeRegions = allRegions.filter(region => region.color === 'rgba(255, 165, 0, 0.5)').sort((a, b) => a.start - b.start);
        
        newsigPoints = greenRegions.map(region => region.start);
        console.log("NEW SIG: ", newsigPoints);
        let newRegionIndex_trans = 't';
        let newRegionIndex_form = 'f';

        if (new_type === "trans") {
            console.log("Transition")
            // console.log("LENGTH BEFORE CALL:",orangeRegions.length,updatedOrangeRegions.length)
            // console.log("existing transitions before: ", existingTransitionValues)
            newRegionIndex_trans = handleRegionChanges(orangeRegions, updatedOrangeRegions, existingTransitionValues, "trans");
            added = false;
            // console.log("existing transitions after: ", existingTransitionValues)
            
            // console.log("updated transition");
            updatedOrangeRegions = orangeRegions;
        }else if (new_type === "form") {
            console.log("DATA")
            // console.log("LENGTH BEFORE CALL:",orangeRegions.length,updatedOrangeRegions.length)
            // console.log("existing transitions before: ", existingTransitionValues)
            newRegionIndex_form = handleRegionChanges(greenRegions, updatedGreenRegions, existingValues, "form");
            updatedGreenRegions = greenRegions;
        }
        

        const audioDuration = waveform.getDuration();
        finalizeTimestamps("time", newRegionIndex_form, newRegionIndex_trans);
    }
}

function handleRegionChanges(currentRegions, updatedRegions, valuesDict, type) {
    // Find added or removed regions by comparing current with updated
    
    const mismatchedRegions = currentRegions.filter(region => {
        return !updatedRegions.some(updatedRegion => 
            updatedRegion.start.toFixed(2) === region.start.toFixed(2) && updatedRegion.end.toFixed(2) === region.end.toFixed(2)
        );
    });

    const mismatchedRegionsOther = updatedRegions.filter(region => {
        return !currentRegions.some(currentRegion => 
            currentRegion.start.toFixed(2) === region.start.toFixed(2) && currentRegion.end.toFixed(2) === region.end.toFixed(2)
        );
    });
    console.log("size current: ", currentRegions.length)
    currentRegions.forEach((region, index) => {
        const start = region.start;
        const end = region.end;

        // Check if existingTransitionValues is defined
        console.log("current times:", index, start, end);
    });

    console.log("size old: ", updatedRegions.length)
    updatedRegions.forEach((region, index) => {
        const start = region.start;
        const end = region.end;

        // Check if existingTransitionValues is defined
        console.log("current times:", index, start, end);
    });

    const chosenMismatchedRegions = mismatchedRegions.length > 0 ? mismatchedRegions : mismatchedRegionsOther;
    const chosenMismatchedIndexes = chosenMismatchedRegions.map(mRegion => updatedRegions.indexOf(mRegion));



    console.log("Mismatched region: ", mismatchedRegions);
    console.log("OTHER DIR MISMATCH: ", mismatchedRegionsOther)
    console.log("chosen mismatch: ", chosenMismatchedRegions, chosenMismatchedIndexes);

    if (currentRegions.length > updatedRegions.length) {
        const newRegionIndex = mismatchedRegions.length ? currentRegions.indexOf(mismatchedRegions[0]) : currentRegions.length - 1;
        console.log("new index: ", newRegionIndex);
        console.log(valuesDict);
        return newRegionIndex
    } else if (currentRegions.length < updatedRegions.length) {
        console.log("REMOVE REGION: ", currentRegions)
        console.log("REMOVE REGION ex val before: ", existingTransitionValues)
        // Region removed; delete corresponding entry in `valuesDict`
        const removedRegionIndex = chosenMismatchedRegions.map(mRegion => updatedRegions.indexOf(mRegion));
        console.log("removed index: ", (-1)*removedRegionIndex[0])
        // delete valuesDict[removedRegionIndex];
        console.log("REMOVE REGION ex val after: ", existingTransitionValues)
        return removedRegionIndex[0]*(-1)-1
        
    }

    console.log("Updated valuesDict after region change:", valuesDict);
}



function detectBeats(data, sampleRate, threshold) {
    const beats = [];
    let minSamplesBetweenBeats = sampleRate / 2; // Minimum half-second between beats
    let lastBeatIndex = -minSamplesBetweenBeats;

    threshold = threshold / 100; // Convert threshold to match amplitude range of audio data

    for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) {
            if (i - lastBeatIndex > minSamplesBetweenBeats) {
                // Store beat time and strength (absolute value of sample)
                beats.push({ time: i / sampleRate, strength: Math.abs(data[i]) });
                lastBeatIndex = i;
            }
        }
    }
    return beats;
}


function getMimeType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'mp3':
            return 'audio/mp3';
        case 'wav':
            return 'audio/wav';
        default:
            return 'audio/mpeg'; // Default to mp3
    }
}

function displayBeats(data, beatContainer, audioPlayer, audioData, buffer, fileInput) {
    const canvas = document.getElementById('waveformCanvas');
    const durationInSeconds = buffer.duration;
    canvas.width = durationInSeconds * 20; // 20 pixels per second
    drawWaveform(data, canvas, durationInSeconds);

    // const blob = new Blob([audioData], { type: getMimeType(fileInput.files[0].name) });
    // audioPlayer.src = URL.createObjectURL(blob);
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

// function clearBeats() {
//     const beatContainer = document.getElementById('beatContainer');
//     const beats = document.querySelectorAll('.beat');
//     beats.forEach(beat => beatContainer.removeChild(beat));
// }

function showSignificantPoints() {
    newsigPoints = [...significantPoints]
    document.querySelectorAll('.hidden-beat').forEach(beat => {
        beat.style.display = 'block';
    });
    document.querySelectorAll('.beat').forEach(beat => {
        if (!beat.classList.contains('hidden-beat')) {
            beat.style.display = 'none';
        }
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
            lowEnergyBeats = data.low_energy_timestamps; // Update the global variable
            // console.log("LOW ENERGY: " + lowEnergyBeats); // Log for debugging
            updateUIWithLowEnergyBeats(); // Example function call
        } else {
            document.getElementById('outputContainer').textContent = 'Error: ' + data.error;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('outputContainer').textContent = 'Failed to fetch data.';
    });
}

function toggleMotion() {
    const button = document.getElementById("toggleMotionButton");
    if (button.textContent === "3D Motion") {
        button.textContent = "2D Motion";
        motion_mode = "2D";
        // Add code here to handle the change to 3D motion
        // console.log("Switched to 2D Motion");
    } else {
        button.textContent = "3D Motion";
        motion_mode = "3D";
        // Add code here to handle the change to 2D motion
        // console.log("Switched to 3D Motion");
    }
}

function toggle_suggest(){
    const suggestionsContent = document.getElementById('suggestionsContent');
    suggestionsContent.classList.toggle('hidden');
}

