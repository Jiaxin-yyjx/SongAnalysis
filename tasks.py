import time  # Simulating long tasks
import datetime
from redis import Redis
from queue_config import queue
import os
from flask import jsonify
from rq import get_current_job
from rq.timeouts import JobTimeoutException
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



# def generate_image_task(data):
#     try:
#         prompt = data.get('prompt', '')
#         api_key = data.get('api_key', '')
#         api = replicate.Client(api_token=api_key)

#         if not prompt:
#             return {'error': 'No prompt provided'}  # Return as a dictionary, no jsonify

#         # output = api.run(
#         #     "lucataco/open-dalle-v1.1:1c7d4c8dec39c7306df7794b28419078cb9d18b9213ab1c21fdc46a1deca0144",
#         #     input={
#         #         "width": 768,
#         #         "height": 768,
#         #         "prompt": prompt,
#         #         "scheduler": "KarrasDPM",
#         #         "num_outputs": 1,
#         #         "guidance_scale": 7.5,
#         #         "apply_watermark": True,
#         #         "negative_prompt": "worst quality, low quality",
#         #         "prompt_strength": 0.8,
#         #         "num_inference_steps": 40
#         #     },
#         #     timeout=600
#         # )
#         output = ["https://png.pngtree.com/png-clipart/20230512/original/pngtree-isolated-front-view-cat-on-white-background-png-image_9158426.png"]

#         time.sleep(12)
#         if output and isinstance(output, list):
#             image_url = str(output[0])
#             return {'status': "success", 'output': image_url}  # Return the result data instead of jsonify

#         return {"status": "error", 'error': 'Unexpected output format'}  # Return error message as dict
#     except Exception as e:
#         # Log the actual error and return it as a dictionary
#         print(f"Error: {str(e)}")
#         return {"status": "error", 'error': str(e)}  # Return error data

def generate_image_task(data):
    global init_image
    job = get_current_job
    print("Generating image")
    try:
        prompt = data.get('prompt', '')
        api_key = data.get('api_key', '')
        print(f"USED API KEY GEN: {api_key}")
        api = replicate.Client(api_token=api_key)

        if not prompt:
            return {'error': 'No prompt provided'}  # Return as a dictionary, no jsonify

        # output = api.run(
        #     "lucataco/open-dalle-v1.1:1c7d4c8dec39c7306df7794b28419078cb9d18b9213ab1c21fdc46a1deca0144",
        #     input={
        #         "width": 768,
        #         "height": 768,
        #         "prompt": prompt,
        #         "scheduler": "KarrasDPM",
        #         "num_outputs": 1,
        #         "guidance_scale": 7.5,
        #         "apply_watermark": True,
        #         "negative_prompt": "worst quality, low quality",
        #         "prompt_strength": 0.8,
        #         "num_inference_steps": 40
        #     },
        #     timeout=600
        # )

        # output = api.run(
        #     "stability-ai/stable-diffusion-3.5-large",
        #     input={
        #         "prompt": prompt,
        #         "width": 768,
        #         "height": 768,
        #         "num_outputs": 1,
        #         "guidance_scale": 7.5,
        #         "apply_watermark": True,
        #         "negative_prompt": "worst quality, low quality",
        #         "prompt_strength": 0.8,
        #         "num_inference_steps": 40
        #     }
        # )
        
        output = api.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt,
                "go_fast": True,
                "megapixels": "1",
                "num_outputs": 1,
                "aspect_ratio": "1:1",
                "output_format": "webp",
                "output_quality": 80,
                "num_inference_steps": 4
            }
        )
        # Simulate a long-running process, like calling an API
        # output = ["https://replicate.delivery/xezq/e7L0heZDcQkglUAxvUGnkXPE5n0ar6eRPlOrdj57th9pFQrnA/out-0.webp"]
        # output = ["https://png.pngtree.com/png-clipart/20230512/original/pngtree-isolated-front-view-cat-on-white-background-png-image_9158426.png"]
        print("output done: ", output)
        # Simulating a timeout with sleep
        time.sleep(3)  # Adjust this based on your expected task duration

        if output and isinstance(output, list):
            image_url = str(output[0])
            init_image = image_url
            print('init_image new: ', init_image)
            return {'status': "success", 'output': image_url}  # Return the result data instead of jsonify

        return {"status": "error", 'error': 'Unexpected output format'}  # Return error message as dict
    except TimeoutError:
        # Handle the timeout error
        print("Task timed out")
        return {"status": "error", 'error': 'Job timeout occurred'}  # Timeout error message
    except Exception as e:
        # Log the actual error and return it as a dictionary
        print(f"Error: {str(e)}")
        return {"status": "error", 'error': str(e)}  # Return error data


def long_running_task(data):
    global init_image
    try:
        job = get_current_job()
        # enqueue_time = data.get('enqueue_time', None)
        # if enqueue_time:
        #     enqueue_time = datetime.utcfromtimestamp(enqueue_time)
        #     now = datetime.utcnow()
        #     delay = (now - enqueue_time).total_seconds()

        #     print(f"Job started after {delay} seconds.")
        #     if delay > 9:  # Example: timeout threshold
        #         print("Job started because it timed out.")
        #         return {"status": "error", "code": 502, "output": ""}
        # Extract the data from the input
        # api_key = os.getenv("REPLICATE_API_KEY")  # Store your API key in environment variables
        print("Long running running")
        api_key = data['api_key']
        print(f"USED API KEY: {api_key}")
        api = replicate.Client(api_token=api_key)
        
        timestamps_scenes = data['timestamps_scenes']
        form_data = data['form_data']
        transitions_data = data['transitions_data']
        song_len = data['song_len']
        motion_mode = data['motion_mode']
        seed = data['seed']
        input_image_url = data.get('input_image_url',"https://raw.githubusercontent.com/ct3008/ct3008.github.io/main/images/isee1.jpeg")

        # Processing the data
        # song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data = parse_input_data(form_data, transitions_data, song_len)
        song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data, og_motion_data= parse_input_data(form_data, transitions_data, song_len)
        final_anim_frames = [0]
        if round(song_len, 2) not in scene_change_times:
            scene_change_times.append(round(song_len, 2))
        
        frame_data, animation_prompts = calculate_frames(scene_change_times, interval_strings, motion_data, song_duration, final_anim_frames)
        motion_strings = build_transition_strings(frame_data)
        prompts = generate_image_prompts(form_data, final_anim_frames)

        # Create the Deforum prompt
        print("INIT IMAGE TO BE PASSED IN: ", input_image_url)
        if not input_image_url or str(input_image_url).lower() == "none":
            print("No valid input image URL specified. Using default.")
            input_image_url = "https://raw.githubusercontent.com/ct3008/ct3008.github.io/main/images/isee1.jpeg"
        print("INIT IMAGE THAT IS PASSED IN: ", input_image_url)
        deforum_prompt = create_deforum_prompt(motion_strings, final_anim_frames, motion_mode, prompts, seed, input_image_url)
        print("deforum prompt: ", deforum_prompt)
        # Run the API
        output = api.run(
            "deforum-art/deforum-stable-diffusion:1a98303504c7d866d2b198bae0b03237eab82edc1491a5306895d12b0021d6f6",
            input=deforum_prompt
        )

        
        # output = "https://replicate.delivery/yhqm/u7FcIvDd32bjK5ccA5v0FmQ8LesqmftC6MrUbrRMTZECkyPTA/out.mp4"
        print("output: ", output)
        # time.sleep(12)
        # Compile the response
        if isinstance(output, str):  # It's a URL
            final_output = output
        elif hasattr(output, "url"):  # It's a FileOutput object with a URL
            final_output = output.url
        else:
            raise ValueError(f"Unexpected output type: {type(output)}")
                
        try:
            str_output = str(output)
        except:
            str_output = ""
        response = {
            'timestamps_scenes': timestamps_scenes,
            'form_data': form_data,
            'transitions_data': transitions_data,
            'song_len': song_len,
            'animation_prompts': animation_prompts,
            'motion_prompts': motion_strings,
            'prompts': prompts,
            'output_url': final_output,
            'original_output': str_output,
            'input_image_url': input_image_url
        }
        
        print("response: ", response)
        for key in ['timestamps_scenes', 'form_data', 'transitions_data']:
            response[key] = response.get(key, None)
            if isinstance(response[key], (list, dict)):
                continue
            elif isinstance(response[key], (np.ndarray, set)):
                response[key] = list(response[key])  # Convert arrays or sets to lists
            elif isinstance(response[key], datetime):
                response[key] = response[key].isoformat()  # Convert datetime to string
            else:
                response[key] = str(response[key])  # Fallback: Convert to string
        print("response after 'fix': ", response)
        return {"status": "success", "output": response}
    except JobTimeoutException:
        # Log or handle the timeout exception here
        return {"status": "error", "error": "Task exceeded maximum timeout value"}
    # Perform task
    return {"result": "Task completed"}
