import os
# import openai
# from openai import OpenAI
import librosa
import numpy as np
import tempfile
from flask import Flask, jsonify, request, render_template
import replicate
from dotenv import load_dotenv
from tasks import long_running_task, process_audio, generate_image_task
from queue_config import queue, redis_conn
from flask_cors import CORS
from datetime import datetime
import cloudinary
import cloudinary.uploader

CLOUDINARY_URL = 'cloudinary://851777568929886:GJN-qDx1C7idDTO4SZ92FuD3mI0@hqxlqewng'
cloudinary.config(
    # cloud_name=os.environ['CLOUDINARY_URL'].split('@')[1],
    # api_key=os.environ['CLOUDINARY_URL'].split(':')[1][2:],
    # api_secret=os.environ['CLOUDINARY_URL'].split(':')[2].split('@')[0],
    cloud_name=CLOUDINARY_URL.split('@')[1],
    api_key=CLOUDINARY_URL.split(':')[1][2:],
    api_secret=CLOUDINARY_URL.split(':')[2].split('@')[0],
)

load_dotenv()
app = Flask(__name__, template_folder='./templates', static_folder='./static')
CORS(app)
# api_key = os.getenv("OPENAI_DISCO_API_KEY")
# client = OpenAI(api_key=api_key)

# Get the API key from environment variables
# REPLICATE_API_TOKEN = os.getenv("LAB_DISCO_API_KEY")
api_key_storage = ''
# Initialize Replicate client
# if REPLICATE_API_TOKEN:
#     api = replicate.Client(api_token=REPLICATE_API_TOKEN)
# else:
#     raise ValueError("Replicate API key is not set. Please check your environment variables.")

@app.route('/save_api_key', methods=['POST'])
def save_api_key():
    global api_key_storage
    try:
        data = request.get_json()
        api_key = data.get('api_key')        

        if not api_key:
            return jsonify({'message': 'API Key is missing!'}), 400
        
        if "disco" in api_key:
            api_key = os.getenv("LAB_DISCO_API_KEY")
            redis_conn.set("api_key", api_key)
            print("DISCO KEYWORD: ", api_key)
        else:
            # Store the API key (you can replace this with database/file storage)
            api_key_storage = api_key
            print("API KEY: ", api_key_storage)
            # print("Stored in environ before: ", os.getenv("LAB_DISCO_API_KEY"))
            os.environ["LAB_DISCO_API_KEY"] = api_key_storage
            print("Stored in environ after: ", os.getenv("LAB_DISCO_API_KEY"))
            redis_conn.set("api_key", api_key)
            print("Stored in redis: ", redis_conn.get("api_key").decode('utf-8'))


        return jsonify({'message': 'API Key saved successfully!'}), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file_to_upload = request.files['image']

    # Upload the image to Cloudinary
    result = cloudinary.uploader.upload(file_to_upload)

    # Return the static URL
    return jsonify({"url": result['secure_url']})

# motion_magnitudes = {
#     "zoom_in": {"none": 1.00, "weak": 1.02, "normal": 1.04, "strong": 10, "vstrong": 20},
#     "zoom_out": {"none": 1.00, "weak": -0.5, "normal": -1.04, "strong": -10, "vstrong": -20},
#     "rotate_up": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "rotate_down": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20},
#     "rotate_right": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "rotate_left": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20},
#     "rotate_cw": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "rotate_ccw": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20},
#     "spin_cw": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "spin_ccw": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20},
#     "pan_up": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "pan_down": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20},
#     "pan_right": {"none": 0, "weak": 0.5, "normal": 1, "strong": 10, "vstrong": 20},
#     "pan_left": {"none": 0, "weak": -0.5, "normal": -1, "strong": -10, "vstrong": -20}
# }

# API Route

@app.route('/')
def homepage():
    return render_template('waveform.html')

@app.route('/quick_start')
def quick_start():
    return render_template('quick_start.html')

AUDIO_FOLDER = 'uploads/audioclip'
app.config['AUDIO_FOLDER'] = AUDIO_FOLDER

# Make sure the upload folder exists
if not os.path.exists(AUDIO_FOLDER):
    os.makedirs(AUDIO_FOLDER)

@app.route('/upload-file', methods=['POST'])
def upload_file():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['audioFile']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # Save the file to the upload folder
        file_path = os.path.join(app.config['AUDIO_FOLDER'], file.filename)
        file.save(file_path)
        return jsonify({'message': 'File uploaded successfully!', 'filename': file.filename}), 200


@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    file = request.files['audioFile']
    if file:
        file_path = os.path.join('.', file.filename)
        file.save(file_path)

        # Load the audio file using librosa
        y, sr = librosa.load(file_path, sr=None)

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
        # print("BEATS: ", beat_times[0:5])  # Change to beat_times2 for accurate print
        # print("ALIGNED: ", aligned_onsets[0:15])

        return jsonify({
            "success": True,
            "low_energy_timestamps": low_energy_before_onset,
            "top_onset_times": beat_times,
            "aligned_onsets": aligned_onsets, 
            "duration": float(duration)
        })
    return jsonify({"success": False, "error": "No file provided"}), 400


@app.route('/upload_audio_large', methods=['POST'])
def upload_audio_large():
    file = request.files['audioFile']
    if file:
        # Save the audio file temporarily
        file_path = os.path.join('.', file.filename)
        file.save(file_path)

        # Load the audio file using librosa
        y, sr = librosa.load(file_path, sr=None)

        # Calculate RMS energy
        rms = librosa.feature.rms(y=y)[0]

        # Smooth RMS energy to remove minor fluctuations
        smoothed_rms = np.convolve(rms, np.ones(10)/10, mode='same')

        # Perform onset detection
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)

        # Map onset frames to onset strengths
        onset_strengths = [onset_env[int(frame)] for frame in onset_frames if int(frame) < len(onset_env)]

        # Pair onset times with their strengths
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        onset_strength_pairs = list(zip(onset_times, onset_strengths))

        # Sort by strength, largest to smallest
        sorted_onsets = sorted(onset_strength_pairs, key=lambda x: x[1], reverse=True)

        # Keep only the top 30 values
        top_onsets = sorted_onsets[:30]

        # Extract times from sorted onsets
        top_onset_times = [time for time, strength in top_onsets]

        # Determine a threshold for major dips
        threshold = np.percentile(smoothed_rms, 10)  # 10th percentile as threshold

        # Find major low-energy periods before onsets
        low_energy_before_onset = []
        for i in range(1, len(onset_frames)):
            start = onset_frames[i-1]
            end = onset_frames[i]
            rms_segment = smoothed_rms[start:end]
            if np.min(rms_segment) < threshold:
                low_energy_before_onset.append(librosa.frames_to_time(start, sr=sr))

        duration = librosa.get_duration(y=y, sr=sr)

        os.remove(file_path)  # Clean up the audio file
        return jsonify({"success": True, "low_energy_timestamps": low_energy_before_onset, "top_onset_times": top_onset_times, "duration": duration})
    return jsonify({"success": False, "error": "No file provided"}), 400

    
# @app.route('/generate_initial', methods=['POST'])
# def generate_initial():
#     data = request.get_json()
#     prompt = data.get('prompt', '')
#     api_key = api_key_storage
#     print("API TOKEN?: ", api_key)
#     api = replicate.Client(api_token=api_key)

#     if not prompt:
#         return jsonify({'error': 'No prompt provided'}), 400

#     try:
#         output = api.run(
#             "lucataco/open-dalle-v1.1:1c7d4c8dec39c7306df7794b28419078cb9d18b9213ab1c21fdc46a1deca0144",
#             input={
#                 "width": 768,
#                 "height": 768,
#                 "prompt": prompt,
#                 "scheduler": "KarrasDPM",
#                 "num_outputs": 1,
#                 "guidance_scale": 7.5,
#                 "apply_watermark": True,
#                 "negative_prompt": "worst quality, low quality",
#                 "prompt_strength": 0.8,
#                 "num_inference_steps": 40
#             },
#             timeout=180
#         )
#         # Assuming the output is a list of FileOutput objects, extract the URL
#         if output and isinstance(output, list):
#             image_url = str(output[0])  # Convert FileOutput to string to extract the URL
#             print("Initial Image OUTPUT", image_url)
#             return jsonify({'output': image_url})

#         return jsonify({'error': 'Unexpected output format'}), 500

#     except Exception as e:
#         print("Error:", str(e))  # Log the actual error to the console
#         return jsonify({'error': str(e)}), 500

# @app.route('/check_job_status_generate/<job_id>', methods=['GET'])
# def check_job_status_generate(job_id):
#     job = queue.fetch_job(job_id)
    
#     if job is None:
#         return jsonify({'status': 'failed', 'error': 'Job not found'}), 404

#     print("Status Generate: ", job.get_status())
#     if job.is_finished:
#         result = job.result
#         print("Job result: ", result)
#         if result and isinstance(result, dict):
#             # Check for error or output
#             if 'output' in result:
#                 return jsonify({'status': 'finished', 'output': result['output']})
#             elif 'error' in result:
#                 return jsonify({'status': 'failed', 'error': result['error']}), 500
#         return jsonify({'status': 'failed', 'error': 'Unexpected output format'}), 500
    
#     if job.is_failed:
#         return jsonify({'status': 'failed', 'error': 'Job failed due to timeout or other error'}), 500
    
#     # Job is still processing
#     return jsonify({'status': job.get_status()}), 200


@app.route('/generate_initial', methods=['POST'])
def generate_initial():
    data = request.get_json()
    prompt = data.get('prompt', '')
    api_key = api_key_storage
    if api_key and os.getenv("LAB_DISCO_API_KEY") and redis_conn.get("api_key"):
        print("input box chosen")
        data['api_key'] = api_key
    elif redis_conn.get("api_key"):
        print("redis chosen")
        data['api_key'] = redis_conn.get("api_key").decode('utf-8')
    else:
        print("os env chosen")
        data['api_key'] = os.getenv("LAB_DISCO_API_KEY")
    print("API TOKEN? api_key,", api_key,". environ: ",  os.getenv("LAB_DISCO_API_KEY"), ". redis: ", redis_conn.get("api_key").decode('utf-8'))
    print("API KEY ACTUALLY PASSED? ", data['api_key'])

    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    # Enqueue the task and return the job ID
    try:
        job = queue.enqueue(generate_image_task, data, job_timeout=300)  # Set a job timeout (e.g., 60 seconds)
        return jsonify({'job_id': job.get_id(), 'status': 'queued'}), 202
    except Exception as e:
        return jsonify({'error': str(e)}), 500



def split_and_pair_values(data):
    motions = data['motion'].strip().split(',')
    strengths = data['strength'].strip().split(',')
    speeds = ['normal']
    # speeds = data['speed'].strip().split(',')
    return list(zip(motions, strengths, speeds))

# def get_motion_data(form_data, trans_data, time_intervals):
#     motion_data = []

#     for i in range(len(time_intervals) - 1):
#         start = float(time_intervals[i])
#         end = float(time_intervals[i + 1])
#         if (time_intervals[i] >= time_intervals[i + 1]):
#             break
#         segment_motion_data = []

#         # Check for transitions
#         for interval, data in trans_data.items():
#             interval_start, interval_end = map(float, interval.split('-'))
#             if start <= interval_start < end or start < interval_end <= end:
#                 segment_motion_data.extend(split_and_pair_values(data))
#                 break  # Only take the transition motion

#         # If no transition, default to closest form_data motion
#         if not segment_motion_data:
#             closest_form_data = get_closest_form_data(start, form_data)
#             if closest_form_data:
#                 segment_motion_data.extend(split_and_pair_values(closest_form_data))

#         motion_data.append(segment_motion_data)

#     return motion_data


# def get_closest_form_data(time, form_data):
#     closest_time = min((float(t) for t in form_data.keys() if float(t) >= time), default=None)
#     if closest_time is not None:
#         # print(closest_time)
#         # print(form_data)
#         return form_data[f"{closest_time:.2f}"]
#     else:
#         closest_time = min((float(t) for t in form_data.keys() if float(t) <= time), default=None)
#         return form_data[f"{closest_time:.2f}"]



# def get_motion_and_speed(time, form_data):
#     motion_options = ["zoom_in", "zoom_out", "pan_right", "pan_left", "pan_up", "pan_down", "spin_cw", "spin_ccw", 
#                       "rotate_up", "rotate_down", "rotate_right", "rotate_left", "rotate_cw", "rotate_ccw", "none"]
#     speed_options = ["vslow", "slow", "normal", "fast", "vfast"]
#     strength_options = ["weak", "normal", "strong", "vstrong"]

#     form_entry = form_data.get(time, {})
#     motion = form_entry.get('motion', 'none')
#     speed = form_entry.get('speed', 'normal')
#     strength = form_entry.get('strength', 'normal')

#     if motion not in motion_options:
#         print(f"Invalid motion option for time {time}. Using default 'none'.")
#         motion = 'none'

#     motions = [(motion, speed, strength)]
#     return motions

def get_motion_data(form_data, trans_data, time_intervals):
    motion_data = []

    for i in range(len(time_intervals) - 1):
        start = float(time_intervals[i])
        end = float(time_intervals[i + 1])
        if start >= end:
            break

        segment_motion_data = []

        # Check for transitions
        for interval, data in trans_data.items():
            interval_start, interval_end = map(float, interval.split('-'))
            if start <= interval_start < end or start < interval_end <= end:
                segment_motion_data.extend(split_and_pair_values(data))
                break  # Only take the transition motion

        # If no transition, default to closest form_data motion
        if not segment_motion_data:
            closest_form_data = get_closest_form_data(start, form_data)
            if closest_form_data:
                segment_motion_data.extend(split_and_pair_values(closest_form_data))

        motion_data.append(segment_motion_data)

    return motion_data


def get_closest_form_data(time, form_data):
    closest_time = min((float(t) for t in form_data.keys() if float(t) >= time), default=None)
    if closest_time is not None:
        return form_data[f"{closest_time:.2f}"]
    else:
        closest_time = min((float(t) for t in form_data.keys() if float(t) <= time), default=None)
        return form_data[f"{closest_time:.2f}"]


def split_and_pair_values(data):
    """
    Splits motion and strength values and pairs them correctly.
    """
    motions = data['motion'].split(',')
    strengths = data['strength'].split(',')

    # Ensure the number of motions and strengths match
    if len(motions) != len(strengths):
        raise ValueError(f"Mismatch between motions ({len(motions)}) and strengths ({len(strengths)}).")

    # Create pairs of motion and strength
    paired_values = []
    for motion, strength in zip(motions, strengths):
        paired_values.append({'motion': motion.strip(), 'strength': strength.strip()})

    return paired_values


def get_motion_and_speed(time, form_data):
    motion_options = [
        "zoom_in", "zoom_out", "pan_right", "pan_left", "pan_up", "pan_down", 
        "spin_cw", "spin_ccw", "rotate_up", "rotate_down", "rotate_right", 
        "rotate_left", "rotate_cw", "rotate_ccw", "none"
    ]
    speed_options = ["vslow", "slow", "normal", "fast", "vfast"]
    strength_options = ["weak", "normal", "strong", "vstrong"]

    form_entry = form_data.get(time, {})
    motion = form_entry.get('motion', 'none')
    speed = form_entry.get('speed', 'normal')
    strength = form_entry.get('strength', 'normal')

    # Split motion and strength if they are comma-separated
    motion_list = motion.split(',')
    strength_list = strength.split(',')

    # Validate and pair motion and strength
    motions = []
    for motion, strength in zip(motion_list, strength_list):
        print("Motion, strength: ", motion, strength)
        if motion not in motion_options:
            print(f"Invalid motion option '{motion}' for time {time}. Using default 'none'.")
            motion = 'none'
        # if strength not in strength_options and not is_valid_strength_expression(strength):
        # if strength not in strength_options:
            print(f"Invalid strength option '{strength}' for time {time}. Using default 'normal'.")
            strength = 'normal'
        motions.append({'motion': motion.strip(), 'strength': strength.strip(), 'speed': speed.strip()})

    return motions


# def is_valid_strength_expression(expression):
#     """
#     Validates if a strength expression is a mathematical function like 10*sin(2*3.14*t/10).
#     """
#     try:
#         # Replace `t` with 1 for validation, as it's a placeholder for time
#         eval(expression.replace('t', '1'), {"sin": __import__('math').sin, "cos": __import__('math').cos})
#         return True
#     except Exception:
#         return False
def is_valid_strength_expression(expression):
    """
    Validates if a strength expression is in the format:
    [coefficient]*[sin|cos|tan](a*t/b)
    Example: 10*sin(2*3.14*t/10)
    """
    # Define the regex pattern
    pattern = r"^\d*(\.\d+)?\s*[\*]?\s*(sin|cos|tan)\(\s*\d+(\.\d+)?\s*\*\s*t\s*/\s*\d+(\.\d+)?\s*\)$"

    # Check if the expression matches the pattern
    if not re.match(pattern, expression):
        print("FAILED MATCH")
        return False

    # Attempt to evaluate the expression with t = 1
    try:
        eval(expression.replace('t', '1'), {"sin": math.sin, "cos": math.cos, "tan": math.tan})
        return True
    except Exception:
        return False

# def merge_intervals(interval_strings, motion_data, scene_change_times):
#     merged_intervals = []
    
#     # Loop through intervals
#     i = 0
#     while i < len(interval_strings) - 1:
#         current_interval = interval_strings[i]
#         next_interval = interval_strings[i + 1]
        
#         current_motions = motion_data[i]
#         next_motions = motion_data[i + 1]
        
#         # Extract start and end times from the intervals
#         current_start_time, current_end_time = current_interval.split("-")
#         next_start_time, next_end_time = next_interval.split("-")
        
#         # Compare the end time of the current interval and start time of the next
#         if current_end_time == next_start_time and current_motions == next_motions:
#             # Merge intervals and combine motion data
#             merged_interval = f"{current_start_time}-{next_end_time}"
#             merged_motions = current_motions  # Since both motions are the same, use one
            
#             # Add the merged interval and motion data
#             merged_intervals.append((merged_interval, merged_motions))
            
#             # Skip the next interval, as it's already merged
#             i += 2
#         else:
#             # Add the current interval and motion data as is
#             merged_intervals.append((current_interval, current_motions))
#             i += 1
    
#     # Handle the last interval if it wasn't merged
#     if i < len(interval_strings):
#         merged_intervals.append((interval_strings[i], motion_data[i]))
    
#     return merged_intervals


def parse_input_data(form_data, trans_data, song_duration):
    trans_data = {k: v for k, v in trans_data.items() if v.get('transition', True)}
    scene_change_times = sorted(list(map(float, form_data.keys())))
    print("scene times and trans app.py", scene_change_times, trans_data)
    
    # Create the combined list of transition times
    transition_times = list(map(float, [time.split('-')[0] for time in trans_data.keys()] + 
                                  [time.split('-')[1] for time in trans_data.keys()] + list(form_data.keys())))
    time_intervals = sorted(set(scene_change_times + transition_times))
    
    # Add 0 at the beginning and the song's duration at the end
    time_intervals = [0] + [float(i) for i in time_intervals] + [float(round(song_duration, 2))]
    time_intervals = sorted(set(time_intervals))  # Remove duplicates and sort
    
    # Create the interval strings based on time intervals
    interval_strings = [f"{time_intervals[i]}-{time_intervals[i+1]}" for i in range(len(time_intervals) - 1)]
    
    # Get the motion data
    motion_data = get_motion_data(form_data, trans_data, time_intervals)
    og_motion_data = motion_data
    # Print the intervals and motions before merging
    for interval, motions in zip(interval_strings, motion_data):
        print(f"Interval: {interval}, Motions: {motions}")

    # Merge intervals with identical motion data
    # merged_intervals = merge_intervals(interval_strings, motion_data, scene_change_times)

    # # Print the merged intervals
    # for interval, motions in merged_intervals:
    #     print(f"MERGED Interval: {interval}, Motions: {motions}")

    # print("merged: ", merged_intervals)

    # Replace the old interval_strings and motion_data with the merged values
    # interval_strings = [interval for interval, motions in merged_intervals]
    # motion_data = [motions for interval, motions in merged_intervals]

    # Add time intervals from form_data and trans_data
    for key, value in form_data.items():
        time_intervals.append(float(key))
    
    for key in trans_data.keys():
        start, end = map(float, key.split('-'))
        time_intervals.extend([start, end])
    
    time_intervals = sorted(set(time_intervals))
    time_intervals = [str(i) for i in time_intervals]
    
    # Return the updated values
    return song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data, og_motion_data


# def calculate_frames(scene_change_times, time_intervals, motion_data, total_song_len, final_anim_frames):
#     frame_data = {
#         "zoom": [],
#         "translation_x": [],
#         "translation_y": [],
#         "angle": [],
#         "rotation_3d_x": [],
#         "rotation_3d_y": [],
#         "rotation_3d_z": []
#     }
#     tmp_times = scene_change_times.copy()

#     speed_multiplier = {"vslow": 0.25, "slow": 0.5, "normal": 1, "fast": 2.5, "vfast": 6}
#     frame_rate = 15

#     current_frame = 0
#     animation_prompts = []
#     # print("INTERVAL: ", time_intervals)
#     for interval, motions in zip(time_intervals, motion_data):
#         _, strength, speed = motions[0]
#         start_time, end_time = map(float, interval.split('-'))
        
#         # print("TMP TIME: ", tmp_times)
#         if tmp_times != [] and int(tmp_times[0]) <= end_time and int(tmp_times[0]) >= start_time:
#             new_frame = round(current_frame + ((tmp_times[0]) - start_time) * 15 * speed_multiplier[speed])
#             # print("----------------END FRAME:---------------", new_frame)
#             if new_frame not in final_anim_frames:
				
#                 final_anim_frames.append(new_frame)
#             tmp_times.pop(0)
#         duration = (end_time - start_time) * frame_rate
#         adjusted_duration = round(duration * speed_multiplier[speed])
#         end_frame = current_frame + adjusted_duration
#         for motion, strength, speed in motions:
#             animation_prompts.append((start_time, end_time, current_frame, end_frame))
            
#             def get_motion_value(motion, strength):
#                 return motion_magnitudes.get(motion, {}).get(strength, strength)

#             motion_value = get_motion_value(motion, strength)
#             print("motion value: ", motion_value)
#             if motion == "zoom_in":
#                 frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "zoom_out":
#                 frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "pan_right":
#                 frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "pan_left":
#                 frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "pan_up":
#                 frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "pan_down":
#                 frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "spin_cw":
#                 frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "spin_ccw":
#                 frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_up":
#                 frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_down":
#                 frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_right":
#                 frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_left":
#                 frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_cw":
#                 frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_value))
#             elif motion == "rotate_ccw":
#                 frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_value))


#         current_frame = end_frame

#         if str(end_time) == str(total_song_len) and end_frame not in final_anim_frames and (end_frame - 1) not in final_anim_frames:
#             final_anim_frames.append(end_frame)
        

#     return frame_data, animation_prompts
def calculate_frames(scene_change_times, time_intervals, motion_data, total_song_len, final_anim_frames):
    frame_data = {
        "zoom": [],
        "translation_x": [],
        "translation_y": [],
        "angle": [],
        "rotation_3d_x": [],
        "rotation_3d_y": [],
        "rotation_3d_z": []
    }
    tmp_times = scene_change_times.copy()

    speed_multiplier = {"vslow": 0.25, "slow": 0.5, "normal": 1, "fast": 2.5, "vfast": 6}
    frame_rate = 15

    current_frame = 0
    animation_prompts = []
    adjustments = []

    for interval, motions in zip(time_intervals, motion_data):
        start_time, end_time = map(float, interval.split('-'))

        # Handle scene change times
        if tmp_times and start_time <= tmp_times[0] <= end_time:
            new_frame = round(current_frame + ((tmp_times[0] - start_time) * frame_rate * speed_multiplier['normal']))
            if new_frame not in final_anim_frames:
                final_anim_frames.append(new_frame)
            tmp_times.pop(0)

        # Calculate duration for the interval
        duration = (end_time - start_time) * frame_rate
        adjusted_duration = math.ceil(duration * speed_multiplier['normal'])
        end_frame = current_frame + adjusted_duration
        speed_factor = duration / adjusted_duration
        adjustments.append({
            "start_frame": current_frame,
            "end_frame": end_frame,
            "speed_factor": speed_factor,
            "start_time": start_time,
            "end_time": end_time
        })

        # Process all motions for this interval
        for motion_entry in motions:
            motion = motion_entry['motion']
            strength = motion_entry['strength']
            

            def get_motion_value(motion, strength):
                print("for motion: ", motion, " and strength: ", strength, " motion value: ",motion_magnitudes.get(motion, {}).get(strength, strength))
                return motion_magnitudes.get(motion, {}).get(strength, strength)

            motion_value = get_motion_value(motion, strength)

            # Add motion-specific frame data
            if motion == "zoom_in":
                frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "zoom_out":
                frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "pan_right":
                frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "pan_left":
                frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "pan_up":
                frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "pan_down":
                frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "spin_cw":
                frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "spin_ccw":
                frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_up":
                frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_down":
                frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_right":
                frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_left":
                frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_cw":
                frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_value))
            elif motion == "rotate_ccw":
                frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_value))

            # Add animation prompts
            animation_prompts.append((start_time, end_time, current_frame, end_frame, motion, strength))

        # Update the current frame
        current_frame = end_frame

        # Handle the final frame at the end of the song
        if str(end_time) == str(total_song_len) and end_frame not in final_anim_frames and (end_frame - 1) not in final_anim_frames:
            final_anim_frames.append(end_frame)

    return frame_data, animation_prompts, adjustments


# def build_transition_strings(frame_data):
#     motion_defaults = {
#         "zoom": 1.0,
#         "translation_x": 0,
#         "translation_y": 0,
#         "angle": 0,
#         "rotation_3d_x": 0,
#         "rotation_3d_y": 0,
#         "rotation_3d_z": 0
#     }
#     motion_strings = {motion: [] for motion in frame_data}
#     print("FRAME DATA: ", frame_data)

#     for motion, frames in frame_data.items():
#         previous_end_frame = None
#         for (start_frame, end_frame, duration, value) in frames:
#             print("START: ", start_frame)
#             print("END: ", end_frame)
#             print("VALUE: ", value)
#             pre_frame = start_frame - 1
#             post_frame = end_frame + 1
#             #Checks if the current motion immediately follows the previous motion 
#             # (i.e., the end frame of the previous motion is the same as the start 
#             # frame of the current motion). If so, it increments the start_frame by 
#             # 2 to avoid overlapping frames.
#             if previous_end_frame is not None and previous_end_frame == start_frame:
#                 start_frame = start_frame + 2
#             else:
#                 #If the current motion doesn’t immediately follow the previous one, it 
#                 # adds a motion entry for the pre_frame with the default motion value.
#                 if pre_frame >= 0:
#                     motion_strings[motion].append(f"{pre_frame}:({motion_defaults[motion]})")
                    
#             motion_strings[motion].append(f"{start_frame}:({value})")
#             motion_strings[motion].append(f"{end_frame}:({value})")
#             #start and end frame have same motion
#             if post_frame >= 0:
#                 #adds a motion entry for post_frame with the default motion value
#                 motion_strings[motion].append(f"{post_frame}:({motion_defaults[motion]})")
                
#             previous_end_frame = end_frame

#     for motion in motion_strings:
#         if not any(s.startswith('0:') for s in motion_strings[motion]):
#             motion_strings[motion].insert(0, f"0:({motion_defaults[motion]})")

#     print("motion strings: ", motion_strings)

#     return motion_strings

def build_transition_strings(frame_data):
    motion_defaults = {
        "zoom": 1.0,
        "translation_x": 0,
        "translation_y": 0,
        "angle": 0,
        "rotation_3d_x": 0,
        "rotation_3d_y": 0,
        "rotation_3d_z": 0
    }
    motion_strings = {motion: [] for motion in frame_data}
    print("FRAME DATA: ", frame_data)

    for motion, frames in frame_data.items():
        previous_end_frame = None
        for idx, (start_frame, end_frame, duration, value) in enumerate(frames):
            
            pre_frame = start_frame - 1
            post_frame = end_frame + 1
            #Checks if the current motion immediately follows the previous motion 
            # (i.e., the end frame of the previous motion is the same as the start 
            # frame of the current motion). If so, it increments the start_frame by 
            # 2 to avoid overlapping frames.
            if previous_end_frame is not None and previous_end_frame == start_frame:
                start_frame = start_frame + 2
            else:
                #If the current motion doesn’t immediately follow the previous one, it 
                # adds a motion entry for the pre_frame with the default motion value.
                if pre_frame >= 0:
                    print(f"pre-frame {pre_frame}:({motion_defaults[motion]})")
                    motion_strings[motion].append(f"{pre_frame}:({motion_defaults[motion]})")
                    
            motion_strings[motion].append(f"{start_frame}:({value})")
            motion_strings[motion].append(f"{end_frame}:({value})")
            #start and end frame have same motion
            try:
                #if next seq of same motion type exists, check if start val matches current seq end frame
                # if exists and is true, append the same value to post frame
                next_start, next_end, _, next_value = frames[idx+1]
                if next_start == end_frame:
                    motion_strings[motion].append(f"{post_frame}:({value})")
                else:
                    # Reset value to default to indicate changing motion
                    motion_strings[motion].append(f"{post_frame}:({motion_defaults[motion]})")
            except:
                motion_strings[motion].append(f"{post_frame}:({motion_defaults[motion]})")
            # if post_frame >= 0:
            #     print(f"post-frame {post_frame}:({motion_defaults[motion]})")
            #     #adds a motion entry for post_frame with the default motion value
            #     motion_strings[motion].append(f"{post_frame}:({motion_defaults[motion]})")
                
            previous_end_frame = end_frame

    for motion in motion_strings:
        if not any(s.startswith('0:') for s in motion_strings[motion]):
            motion_strings[motion].insert(0, f"0:({motion_defaults[motion]})")

    print("motion strings: ", motion_strings)

    return motion_strings

def create_prompt(data):
    vibe = data.get('vibe', '')
    imagery = data.get('imagery', '')
    texture = data.get('texture', '')
    style = data.get('style', '')
    color = data.get('color', '')

    prompt = (
        f"{color}, {style} in {texture} texture, simple abstract, beautiful, 4k, motion. "
        f"{imagery}. Evoking a feeling of a {vibe} undertone."
    )
    return prompt

def generate_image_prompts(form_data, final_anim_frames):
    prompts = []

    # Define a dictionary to map short descriptions to more detailed descriptions
    detail_dict = {
        "aggressive": "intense and powerful energy, creating a sense of urgency and dynamism",
        "epic": "grand and majestic energy, evoking a sense of awe and excitement",
        "happy": "bright and cheerful energy, evoking a sense of joy and positivity",
        "chill": "calm and relaxed energy, creating a sense of tranquility and peace",
        "sad": "melancholic and somber energy, evoking a sense of sorrow and introspection",
        "romantic": "loving and tender energy, evoking a sense of affection and intimacy",
        "uplifting": "encouraging and inspiring energy, evoking a sense of hope and motivation",
        "starry night": "starry night sky with delicate splotches resembling stars",
        "curvilinear intertwined circles": "intricate abstract recursive line art",
        "flowing waves": "flowing waves, merging and separating gracefully",
        "blossoming flower": "delicate flower petals dancing in the wind, spiraling and intertwining gracefully",
        "chaotic intertwining lines": "dynamic abstract line art with intersecting, intertwined, jagged edges, evoking a sense of chaos and dissonance",
        "painting": "beautiful, 4k",
        "black/white": "Black and white",
        "full color": "Vibrant, full color"
    }
    # print("GENERATE PROMPTS")
    # Generate prompts
    for timestamp, data in form_data.items():
        prompt_parts = [
            detail_dict.get(data['color'], data['color']),
            detail_dict.get(data['style'], data['style']),
            detail_dict.get(data['texture'], data['texture']),
            detail_dict.get(data['imagery'], data['imagery']),
            detail_dict.get(data['vibe'], data['vibe'])
        ]
        # print(data)
        
        prompt = f"{prompt_parts[0]} color scheme, {prompt_parts[1]} style in {prompt_parts[2]} texture, beautiful, simple abstract, 4k. {prompt_parts[3]} imagery evoking the feeling of {prompt_parts[4]} vibe."
        prompts.append(prompt)
    # print("ALL PROMPTS")
    # print(prompts)

    # print("final anim frames: ",final_anim_frames)
    # print("prompts: ",prompts)
    combined_prompts = " | ".join([f"{final_anim_frames[i]}: {prompts[i]}" for i in range(len(prompts))])
    # print("combo: ", combined_prompts)
    # combined_prompts += " | ".join([f"{final_anim_frames[i]}"])

    return combined_prompts
    # def create_prompt(data):
    #     prompt_parts = [
    #         f"Vibe: {data.get('vibe', '')}",
    #         f"Imagery: {data.get('imagery', '')}",
    #         f"Texture: {data.get('texture', '')}",
    #         f"Style: {data.get('style', '')}",
    #         f"Color: {data.get('color', '')}"
    #     ]
    #     return ", ".join(part for part in prompt_parts if part.split(": ")[1])

    # prompts = []
    # for data in form_data.values():
    #     prompt = create_prompt(data)
    #     prompts.append(prompt)

    # return prompts

def generate_prompt_completion(client, prompt):
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    return completion.choices[0].message['content']

    
def create_deforum_prompt(motion_data, final_anim_frames, motion_mode, prompts,seed):
    # print("HERE ", ', '.join(motion_data['rotation_3d_y']))
    # print(motion_data['rotation_3d_y'][0:-1])
    input={
        "fov": 40,
        "fps": 15,
        "seed": seed,
        "zoom": ", ".join(motion_data['zoom']),
        "angle": ", ".join(motion_data['angle']),
        "width": 512,
        "border": "replicate",
        "height": 512,
        "sampler": "dpmpp_2m",
        "use_init": True,
        "use_mask": False,
        "clip_name": "ViT-L/14",
        "far_plane": 10000,
        # "init_image": "https://raw.githubusercontent.com/ct3008/ct3008.github.io/main/images/isee1.jpeg",
        "init_image": "https://replicate.delivery/pbxt/bb6BIQ1vtyIhOhe6p8ZaeeEg4rYm2k9UNTbipzxzzT2xw2pnA/out-0.png",
        "max_frames": final_anim_frames[-1],
        "near_plane": 200,
        "invert_mask": False,
        "midas_weight": 0.3,
        "padding_mode": "border",
        "rotation_3d_x": ", ".join(motion_data['rotation_3d_x']),
        "rotation_3d_y": ", ".join(motion_data['rotation_3d_y']),
        "rotation_3d_z": ", ".join(motion_data['rotation_3d_z']),
        "sampling_mode": "bicubic",
        "translation_x": ", ".join(motion_data['translation_x']),
        "translation_y": ", ".join(motion_data['translation_y']),
        "translation_z": "0:(10)",
        "animation_mode": "3D",
        "guidance_scale": 7,
        "noise_schedule": "0: (0.02)",
        "sigma_schedule": "0: (1.0)",
        "use_mask_video": False,
        "amount_schedule": "0: (0.2)",
        "color_coherence": "Match Frame 0 RGB",
        "kernel_schedule": "0: (5)",
        "model_checkpoint": "Protogen_V2.2.ckpt",
        "animation_prompts": prompts,
        "contrast_schedule": "0: (1.0)",
        "diffusion_cadence": "1",
        "extract_nth_frame": 1,
        "resume_timestring": "",
        "strength_schedule": "0: (0.65)",
        "use_depth_warping": True,
        "threshold_schedule": "0: (0.0)",
        "flip_2d_perspective": False,
        "hybrid_video_motion": "None",
        "num_inference_steps": 50,
        "perspective_flip_fv": "0:(53)",
        "interpolate_x_frames": 4,
        "perspective_flip_phi": "0:(t%15)",
        "hybrid_video_composite": False,
        "interpolate_key_frames": False,
        "perspective_flip_gamma": "0:(0)",
        "perspective_flip_theta": "0:(0)",
        "resume_from_timestring": False,
        "hybrid_video_flow_method": "Farneback",
        "overwrite_extracted_frames": True,
        "hybrid_video_comp_mask_type": "None",
        "hybrid_video_comp_mask_inverse": False,
        "hybrid_video_comp_mask_equalize": "None",
        "hybrid_video_comp_alpha_schedule": "0:(1)",
        "hybrid_video_generate_inputframes": False,
        "hybrid_video_comp_save_extra_frames": False,
        "hybrid_video_use_video_as_mse_image": False,
        "color_coherence_video_every_N_frames": 1,
        "hybrid_video_comp_mask_auto_contrast": False,
        "hybrid_video_comp_mask_contrast_schedule": "0:(1)",
        "hybrid_video_use_first_frame_as_init_image": True,
        "hybrid_video_comp_mask_blend_alpha_schedule": "0:(0.5)",
        "hybrid_video_comp_mask_auto_contrast_cutoff_low_schedule": "0:(0)",
        "hybrid_video_comp_mask_auto_contrast_cutoff_high_schedule": "0:(100)"
    }

    return input

def process_video_with_speed_adjustments(api_url, adjustments, song_name):
    # Step 1: Download the video from the API URL
    video_file = "downloaded_video.mp4"
    download_video(api_url, video_file)
    output_dir = "final_outputs"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    output_file = f"./{output_dir}/" + song_name.replace(' ','_').split('.')[0] + "_output.mp4"
    
    # Step 2: Adjust the playback speed of intervals
    # adjust_video_speed(video_file, adjustments, output_file)
    
    # Step 3: (Optional) Upload the corrected video to a storage service or return its path
    return output_file

def download_video(api_url, save_path):
    """Download video from a given URL."""
    response = requests.get(api_url, stream=True)
    if response.status_code == 200:
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    else:
        raise Exception(f"Failed to download video: {response.status_code}")

def adjust_video_speed(input_video, adjustments, output_video):
    """Apply playback speed adjustments to the video."""
    segments = []
    # subprocess.run([
    #     "ffmpeg", "-i", input_video, "-vf", "select='between(n,120,190)'", "-vsync", "vfr", "-c:v", "libx264", "precise_segment.mp4"

    # ])
    print(adjustments)
    for i, adj in enumerate(adjustments):
        start_frame = adj["start_frame"]
        end_frame = adj["end_frame"]
        speed_factor_og = adj["speed_factor"]

        # Calculate start and end times
        start_time = start_frame / 15  # Assuming 15 fps
        end_time = end_frame / 15
        speed_factor = (end_time-start_time)/(adj["end_time"]-adj["start_time"])
        print("speed_factor: ", speed_factor, speed_factor_og)
        end_time = round(end_time,2)
        start_time = round(start_time,2)
        print("start time: ", start_time, " end time: ", end_time)
        print("u start time: ", start_time/speed_factor, " u end time: ", end_time/speed_factor)
        print("real start: ", adj["start_time"], " real final: ", adj["end_time"])
        print("-------------------------")
        # start_time = adj["start_time"]
        # end_time = adj["end_time"]

        # Extract segment
        segment_file = f"segment_{i}.mp4"
        subprocess.run([
            "ffmpeg", "-i", input_video, 
            "-vf", f"select='between(n,{start_frame},{end_frame})'", 
            "-vsync", "vfr", 
            "-c:v", "libx264", 
            segment_file
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Adjust playback speed
        adjusted_segment = f"adjusted_segment_{i}.mp4"
        subprocess.run([
            "ffmpeg", "-i", segment_file, 
            "-r", str(15), 
            "-filter:v", f"setpts=PTS/{speed_factor}", 
            "-filter:a", f"atempo={speed_factor}", 
            adjusted_segment
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        segments.append(adjusted_segment)

    # Merge all segments
    with open("file_list.txt", "w") as f:
        for segment in segments:
            f.write(f"file '{segment}'\n")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "file_list.txt", "-c", "copy", output_video
    ],stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Cleanup temporary files
    for segment in segments + [f"segment_{i}.mp4" for i in range(len(adjustments))]:
        os.remove(segment)
    os.remove("file_list.txt")

# @app.route('/process-data', methods=['POST'])
# def process_data():
#     data = request.json
#     timestamps_scenes = data['timestamps_scenes']
#     form_data = data['form_data']
#     transitions_data = data['transitions_data']
#     song_len = data['song_len']
#     motion_mode = data['motion_mode']
#     seed = data['seed']
#     song_name = data['song_name']

#     # Here you can integrate your Python logic with the received data
#     # Example: processed_data = your_function(timestamps_scenes, form_data, transitions_data)

#     # print("FORM: ")
#     # print(form_data)
#     # print("TRANS: ")
#     # print(transitions_data)

#     song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data, og_motion_data = parse_input_data(form_data, transitions_data, song_len)
#     final_anim_frames = []
#     final_anim_frames.append(0)
#     if round(song_len,2) not in scene_change_times:
#         scene_change_times.append(round(song_len,2))
#     # Calculate frames and generate prompts
#     frame_data, animation_prompts, adjustments = calculate_frames(scene_change_times, interval_strings, motion_data, song_duration, final_anim_frames)
#     # og_frame_data, _, _ = calculate_frames(scene_change_times, interval_strings, og_motion_data, song_duration, final_anim_frames)
#     # print("OG FRAME DATA", og_frame_data, frame_data)
#     motion_strings = build_transition_strings(frame_data)
    

#     # print("FRAME")
#     # print(frame_data)
#     # print("ANIM")
#     # print(animation_prompts)
#     # Print the final list of frame transitions for each motion type
#     # print("\nFinal List of Frame Transitions for Each Motion Type:")
#     # for motion, transitions in motion_strings.items():
#     #     print(f"{motion}: {', '.join(transitions)}")

#     final_scene_times = scene_change_times
#     final_scene_times.insert(0, 0)
#     final_scene_times.append(round(song_duration,2))
#     final_scene_times = set(final_scene_times)
#     final_scene_times = list(final_scene_times)
#     # print(final_anim_frames)
#     # print(final_scene_times)
#     # Print the animation prompts
#     # print("\nAnimation Prompts:")
#     animation_prompts = ""

#     # print("BAnANANANA", final_scene_times, final_anim_frames)
#     if final_anim_frames[-1] + 1 == final_anim_frames[-2]:
#         final_anim_frames=final_anim_frames[:-1]
#     # print("BAnANANANA After", final_scene_times, final_anim_frames)

    
#     for i in range(len(final_anim_frames) - 1):
#         animation_prompts += f"{final_anim_frames[i]}: | "
#         # print(f"Start Time: {final_scene_times[i]}, End Time: {final_scene_times[i+1]}, Start Frame: {final_anim_frames[i]}, End Frame: {final_anim_frames[i+1]}")

#     animation_prompts = animation_prompts[:-2]
#     # print(animation_prompts)
#     # For demonstration, we'll just return the received data
#     prompts = generate_image_prompts(form_data, final_anim_frames)
#     # print("PROMPTS")
#     # print(prompts)
#     # print("MOTIONS")
#     # print(motion_strings)
#     deforum_prompt = create_deforum_prompt(motion_strings, final_anim_frames, motion_mode, prompts,seed)
#     print("----------------DEFORUM PROMPTS----------------")
#     print(deforum_prompt)
#     output = api.run(
#         "deforum-art/deforum-stable-diffusion:1a98303504c7d866d2b198bae0b03237eab82edc1491a5306895d12b0021d6f6",
#         input=deforum_prompt)
#     # output = 'https://replicate.delivery/yhqm/PC328eeCcck7vk76cL6VMpfNC90mQ4tNmIhZXgNTaXUT1qmnA/out.mp4'

#     print("OUTPUT", output)
#     #ADDED TO EDIT VIDEO
#     # final_video = process_video_with_speed_adjustments(output, adjustments, song_name)
#     # print(f"Final video saved to: {final_video}")
#     response = {
#         'timestamps_scenes': timestamps_scenes,
#         'form_data': form_data,
#         'transitions_data': transitions_data,
#         'song_len': song_len,
#         'animation_prompts': animation_prompts,
#         'motion_prompts': motion_strings,
#         'prompts': prompts,
#         'output': output
#         # 'processed_data': processed_data
#     }

#     return jsonify(response)

# @app.route('/check_job_status_generate/<job_id>', methods=['GET'])
# def check_job_status_generate(job_id):
#     job = queue.fetch_job(job_id)
    
#     if job is None:
#         return jsonify({'status': 'failed', 'error': 'Job not found'}), 404
#     print("Status Generate: ", job.get_status())
#     if job.is_finished:
#         result = job.result
#         print("Job result: ", result)
#         if result and isinstance(result, dict):
#             # Check for error or output
#             if 'output' in result:
#                 return jsonify({'status': 'finished', 'output': result['output']})
#             elif 'error' in result:
#                 return jsonify({'status': 'failed', 'error': result['error']}), 500
#         return jsonify({'status': 'failed', 'error': 'Unexpected output format'}), 500
    
#     if job.is_failed:
#         return jsonify({'status': 'failed', 'error': 'Job failed'}), 500
    
#     # Job is still processing
#     return jsonify({'status': 'processing'}), 200


@app.route("/check-job-status/<job_id>", methods=["GET"])
def check_job_status(job_id):
    # Get the job from the queue
    job = queue.fetch_job(job_id)
    
    # If the job doesn't exist, return an error message
    if not job:
        return jsonify({"error": "Job not found"}), 404
    
    # Get the job's status
    status = job.get_status()
    print("status: ", status)
    
    # Check if the job is finished
    if status == 'finished':
        # Optionally, you can return the result of the job
        return jsonify({"job_id": job_id, "status": "finished", "result": job.result}), 200
    else:
        # Return the current status if the job is still running
        return jsonify({"job_id": job_id, "status": status}), 200



@app.route("/process-data", methods=["POST"])
def process_data():
    # Enqueue the task and pass the request data
    data = request.json
    print("PROCESS DATA")
    api_key = api_key_storage
    # print("API TOKEN? api key, ", api_key,". os:", os.getenv("LAB_DISCO_API_KEY"))
    # data['api_key'] = os.getenv("LAB_DISCO_API_KEY")
    if api_key and os.getenv("LAB_DISCO_API_KEY") and redis_conn.get("api_key"):
        print("input box chosen process")
        data['api_key'] = api_key
    elif redis_conn.get("api_key"):
        print("redis chosen process")
        data['api_key'] = redis_conn.get("api_key").decode('utf-8')
    else:
        print("os env chosen process")
        data['api_key'] = os.getenv("LAB_DISCO_API_KEY")
    print("PROCESS API TOKEN? api_key,", api_key,". environ: ",  os.getenv("LAB_DISCO_API_KEY"), ". redis: ", redis_conn.get("api_key").decode('utf-8'))
    print("PROCESS API KEY ACTUALLY PASSED? ", data['api_key'])
    # data['enqueue_time'] = datetime.now()
    # api = replicate.Client(api_token=api_key)
    print("ABOUT TO ENQUEUE")
    job = queue.enqueue(long_running_task, data,job_timeout=3000)
    print(job)
    print("done enqueue")
    
    # Respond immediately with the job ID
    return jsonify({"job_id": job.get_id(), "status": "queued"}), 202


if __name__ == "__main__":
    # app.run(debug=True)
    port = int(os.environ.get("PORT", 5004))
    app.run(host="0.0.0.0", port=port)