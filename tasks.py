import time  # Simulating long tasks
from redis import Redis
from queue_config import queue
import os
from rq import get_current_job
import replicate
import librosa
import numpy as np
from time import sleep
from helpers import (  # Adjust the import paths as needed
    parse_input_data,
    calculate_frames,
    build_transition_strings,
    generate_image_prompts,
    create_deforum_prompt
)

# Redis connection
# redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# redis_conn = Redis.from_url(redis_url)

# # Create an RQ queue
# queue = Queue(connection=redis_conn)

# def long_running_task(data):


    
def process_audio(file_path):
    job = get_current_job()  # Get the current job
    print("file path process: ", file_path)
    # Load the audio file using librosa
    y, sr = librosa.load(file_path, sr=None)
    print("Y LIST AND SR tasks: ", type(y), len(y), sr)
    

    # Calculate RMS energy
    rms = librosa.feature.rms(y=y)[0]

    # Smooth RMS energy to remove minor fluctuations
    smoothed_rms = np.convolve(rms, np.ones(10)/10, mode='same')

    # Perform onset detection with adjusted parameters
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    smoothed_onset_env = np.convolve(onset_env, np.ones(5)/5, mode='same')
    onset_frames = librosa.onset.onset_detect(onset_envelope=smoothed_onset_env, sr=sr, hop_length=512, backtrack=True)

    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    # Perform beat detection
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times2 = librosa.frames_to_time(beat_frames, sr=sr)
    beat_times = [{'time': beat} for beat in beat_times2]

    onset_strengths = [onset_env[int(frame)] for frame in onset_frames if int(frame) < len(onset_env)]
    onset_strength_pairs = list(zip(onset_times, onset_strengths))

    # Sort by strength, largest to smallest
    sorted_onsets = sorted(onset_strength_pairs, key=lambda x: x[1], reverse=True)
    top_onset_times = sorted_onsets  # Keep both time and strength pairs

    # Align onsets with closest beats while keeping strength information
    aligned_onsets = [
        {
            'time': min(beat_times2, key=lambda x: abs(x - time)),
            'strength': float(strength),  # Convert to float
        }
        for time, strength in top_onset_times
    ]

    # Find low-energy periods
    threshold = np.percentile(smoothed_rms, 10)
    low_energy_before_onset = []
    for i in range(1, len(onset_frames)):
        start = onset_frames[i-1]
        end = onset_frames[i]

        # Ensure the segment is valid and non-empty
        if start < end and end <= len(smoothed_rms):
            rms_segment = smoothed_rms[start:end]
            if len(rms_segment) > 0:  # Ensure the segment is non-empty
                min_rms = np.min(rms_segment)
                if min_rms < threshold:
                    low_energy_before_onset.append({
                        'time': float(librosa.frames_to_time(start, sr=sr)),  # Convert to float
                        'strength': float(min_rms)  # Convert to float
                    })

    duration = librosa.get_duration(y=y, sr=sr)

    response = {
        "low_energy_timestamps": low_energy_before_onset,
        "top_onset_times": beat_times,
        "aligned_onsets": aligned_onsets, 
        "duration": float(duration)
    }

    # Return the result (or save to DB, etc.)
    return response

# def long_running_task(data):
#     job = get_current_job()
#     time.sleep(9)
#     return data

def long_running_task(data):
    job = get_current_job()
    # Extract the data from the input
    # api_key = os.getenv("REPLICATE_API_KEY")  # Store your API key in environment variables
    print("Long running running")
    api_key = data['api_key']
    api = replicate.Client(api_token=api_key)
    print("API: ", api_key)
    timestamps_scenes = data['timestamps_scenes']
    form_data = data['form_data']
    transitions_data = data['transitions_data']
    song_len = data['song_len']
    motion_mode = data['motion_mode']
    seed = data['seed']

    # Processing the data
    song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data = parse_input_data(form_data, transitions_data, song_len)
    final_anim_frames = [0]
    if round(song_len, 2) not in scene_change_times:
        scene_change_times.append(round(song_len, 2))
    
    frame_data, animation_prompts = calculate_frames(scene_change_times, interval_strings, motion_data, song_duration, final_anim_frames)
    motion_strings = build_transition_strings(frame_data)
    prompts = generate_image_prompts(form_data, final_anim_frames)

    # Create the Deforum prompt
    deforum_prompt = create_deforum_prompt(motion_strings, final_anim_frames, motion_mode, prompts, seed)
    
    # Run the API
    # output = api.run(
    #     "deforum-art/deforum-stable-diffusion:1a98303504c7d866d2b198bae0b03237eab82edc1491a5306895d12b0021d6f6",
    #     input=deforum_prompt
    # )
    output = "https://replicate.delivery/yhqm/u7FcIvDd32bjK5ccA5v0FmQ8LesqmftC6MrUbrRMTZECkyPTA/out.mp4"

    time.sleep(9)
    # Compile the response
    response = {
        'timestamps_scenes': timestamps_scenes,
        'form_data': form_data,
        'transitions_data': transitions_data,
        'song_len': song_len,
        'animation_prompts': animation_prompts,
        'motion_prompts': motion_strings,
        'prompts': prompts,
        'output': output
    }
    return response

    # Perform task
    return {"result": "Task completed"}
