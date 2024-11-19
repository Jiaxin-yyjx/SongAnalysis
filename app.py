import os
import openai
from openai import OpenAI
import librosa
import numpy as np
from flask import Flask, jsonify, request, render_template
import replicate
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__, template_folder='./templates', static_folder='./static')

# api_key = os.getenv("OPENAI_DISCO_API_KEY")
# client = OpenAI(api_key=api_key)

# api_token = os.getenv("MY_REPLICATE_TOKEN")
api_token = os.getenv("LAB_DISCO_API_KEY")
# api_token = ''
print("API TOKEN?: ", api_token)
api = replicate.Client(api_token=api_token)


motion_magnitudes = {
    "zoom_in": {"none": 1.00, "weak": 1.02, "normal": 1.04, "strong": 3, "vstrong": 10},
    "zoom_out": {"none": 1.00, "weak": 0.98, "normal": 0.96, "strong": 0.4, "vstrong": 0.1},
    "rotate_up": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "rotate_down": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10},
    "rotate_right": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "rotate_left": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10},
    "rotate_cw": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "rotate_ccw": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10},
    "spin_cw": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "spin_ccw": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10},
    "pan_up": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "pan_down": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10},
    "pan_right": {"none": 0, "weak": 0.5, "normal": 1, "strong": 3, "vstrong": 10},
    "pan_left": {"none": 0, "weak": -0.5, "normal": -1, "strong": -3, "vstrong": -10}
}

# API Route

@app.route('/')
def homepage():
    return render_template('waveform.html')

@app.route('/quick_start')
def quick_start():
    return render_template('quick_start.html')

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
        print("BEATS: ", beat_times[0:5])  # Change to beat_times2 for accurate print
        print("ALIGNED: ", aligned_onsets[0:15])

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

def split_and_pair_values(data):
    motions = data['motion'].strip().split(',')
    strengths = data['strength'].strip().split(',')
    speeds = ['normal']
    # speeds = data['speed'].strip().split(',')
    return list(zip(motions, strengths, speeds))

def get_motion_data(form_data, trans_data, time_intervals):
    motion_data = []

    for i in range(len(time_intervals) - 1):
        start = float(time_intervals[i])
        end = float(time_intervals[i + 1])
        if (time_intervals[i] >= time_intervals[i + 1]):
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
        # print(closest_time)
        # print(form_data)
        return form_data[f"{closest_time:.2f}"]
    else:
        closest_time = min((float(t) for t in form_data.keys() if float(t) <= time), default=None)
        return form_data[f"{closest_time:.2f}"]



def get_motion_and_speed(time, form_data):
    motion_options = ["zoom_in", "zoom_out", "pan_right", "pan_left", "pan_up", "pan_down", "spin_cw", "spin_ccw", 
                      "rotate_up", "rotate_down", "rotate_right", "rotate_left", "rotate_cw", "rotate_ccw", "none"]
    speed_options = ["vslow", "slow", "normal", "fast", "vfast"]
    strength_options = ["weak", "normal", "strong", "vstrong"]

    form_entry = form_data.get(time, {})
    motion = form_entry.get('motion', 'none')
    speed = form_entry.get('speed', 'normal')
    strength = form_entry.get('strength', 'normal')

    if motion not in motion_options:
        print(f"Invalid motion option for time {time}. Using default 'none'.")
        motion = 'none'

    motions = [(motion, speed, strength)]
    return motions

def parse_input_data(form_data, trans_data, song_duration):
    trans_data = {k: v for k, v in trans_data.items() if v.get('transition', True)}
    scene_change_times = sorted(list(map(float,form_data.keys())))
    # print(scene_change_times)

    # print(trans_data.keys())
    transition_times = list(map(float, [time.split('-')[0] for time in trans_data.keys()] + [time.split('-')[1] for time in trans_data.keys()] + list(form_data.keys())))
    # print(transition_times)
    time_intervals = sorted(set(scene_change_times + transition_times))
    time_intervals = [0] + [float(i) for i in time_intervals] + [float(round(song_duration, 2))]
    time_intervals = set(time_intervals)
    time_intervals = list(sorted(time_intervals))
    # print("HERE TIME: ", time_intervals)
    interval_strings = [f"{time_intervals[i]}-{time_intervals[i+1]}" for i in range(len(time_intervals) - 1)]
    motion_data = get_motion_data(form_data, trans_data, time_intervals)
    interval_strings = [f"{time_intervals[i]}-{time_intervals[i+1]}" for i in range(len(time_intervals) - 1)]

    for interval, motions in zip(interval_strings, motion_data):
        print(f"Interval: {interval}, Motions: {motions}")

    # print("TIME INTERVAL", time_intervals)

    for key, value in form_data.items():
        time_intervals.append(float(key))
    
    for key in trans_data.keys():
        start, end = map(float, key.split('-'))
        time_intervals.extend([start, end])
    
    time_intervals = sorted(set(time_intervals))
    time_intervals = [str(i) for i in time_intervals]
    # print(time_intervals)
    
    return song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data

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
    # print("INTERVAL: ", time_intervals)
    for interval, motions in zip(time_intervals, motion_data):
        _, strength, speed = motions[0]
        start_time, end_time = map(float, interval.split('-'))
        
        # print("TMP TIME: ", tmp_times)
        if tmp_times != [] and int(tmp_times[0]) <= end_time and int(tmp_times[0]) >= start_time:
            new_frame = round(current_frame + ((tmp_times[0]) - start_time) * 15 * speed_multiplier[speed])
            # print("----------------END FRAME:---------------", new_frame)
            if new_frame not in final_anim_frames:
				
                final_anim_frames.append(new_frame)
            tmp_times.pop(0)
        duration = (end_time - start_time) * frame_rate
        adjusted_duration = round(duration * speed_multiplier[speed])
        end_frame = current_frame + adjusted_duration
        for motion, strength, speed in motions:
            animation_prompts.append((start_time, end_time, current_frame, end_frame))
            
            if motion == "zoom_in":
                frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "zoom_out":
                frame_data["zoom"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "pan_right":
                frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "pan_left":
                frame_data["translation_x"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "pan_up":
                frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "pan_down":
                frame_data["translation_y"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "spin_cw":
                frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "spin_ccw":
                frame_data["angle"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_up":
                frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_down":
                frame_data["rotation_3d_x"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_right":
                frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_left":
                frame_data["rotation_3d_y"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_cw":
                frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))
            elif motion == "rotate_ccw":
                frame_data["rotation_3d_z"].append((current_frame, end_frame, adjusted_duration, motion_magnitudes[motion][strength]))


        current_frame = end_frame

        if str(end_time) == str(total_song_len) and end_frame not in final_anim_frames and (end_frame - 1) not in final_anim_frames:
            final_anim_frames.append(end_frame)
        

    return frame_data, animation_prompts

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

    for motion, frames in frame_data.items():
        previous_end_frame = None
        for (start_frame, end_frame, duration, value) in frames:
            # print("START: ", start_frame)
            # print("END: ", end_frame)
            # print("VALUE: ", value)
            pre_frame = start_frame - 1
            post_frame = end_frame + 1

            if previous_end_frame is not None and previous_end_frame == start_frame:
                start_frame = start_frame + 2
            else:
                if pre_frame >= 0:
                    motion_strings[motion].append(f"{pre_frame}:({motion_defaults[motion]})")
                    
            motion_strings[motion].append(f"{start_frame}:({value})")
            motion_strings[motion].append(f"{end_frame}:({value})")
            
            if post_frame >= 0:
                motion_strings[motion].append(f"{post_frame}:({motion_defaults[motion]})")
                
            previous_end_frame = end_frame

    for motion in motion_strings:
        if not any(s.startswith('0:') for s in motion_strings[motion]):
            motion_strings[motion].insert(0, f"0:({motion_defaults[motion]})")

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
        "curvilinear intertwined circles": "intricate abstract recursive line art in watercolor texture",
        "flowing waves": "flowing waves, merging and separating gracefully",
        "blossoming flower": "delicate flower petals dancing in the wind, spiraling and intertwining gracefully",
        "chaotic intertwining lines": "dynamic abstract gradient line art with jagged edges, evoking a sense of chaos and dissonance",
        "painting": "beautiful, 4k",
        "renaissance": "in a modern and forward-thinking style",
        "black/white": "Black and white",
        "pale blue": "Pale blue",
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

UPLOAD_FOLDER = 'uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No selected image"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        return jsonify({"image_path": file_path}), 200
    else:
        return jsonify({"error": "Invalid file type"}), 400
    
def create_deforum_prompt(motion_data, final_anim_frames, motion_mode, prompts):
    # print("HERE ", ', '.join(motion_data['rotation_3d_y']))
    # print(motion_data['rotation_3d_y'][0:-1])
    input={
        "fov": 40,
        "fps": 15,
        "seed": 868591112,
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
        # "init_image":"https://github.com/ct3008/ct3008.github.io/blob/main/images/orchid.png?raw=true",
        "init_image": "https://raw.githubusercontent.com/ct3008/ct3008.github.io/main/images/isee1.jpeg",
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

@app.route('/process-data', methods=['POST'])
def process_data():
    print("PROCESS DATA")
    data = request.json
    timestamps_scenes = data['timestamps_scenes']
    form_data = data['form_data']
    transitions_data = data['transitions_data']
    song_len = data['song_len']
    motion_mode = data['motion_mode']

    # Here you can integrate your Python logic with the received data
    # Example: processed_data = your_function(timestamps_scenes, form_data, transitions_data)

    # print("FORM: ")
    # print(form_data)
    # print("TRANS: ")
    # print(transitions_data)

    song_duration, scene_change_times, transition_times, time_intervals, interval_strings, motion_data = parse_input_data(form_data, transitions_data, song_len)
    final_anim_frames = []
    final_anim_frames.append(0)
    if round(song_len,2) not in scene_change_times:
        scene_change_times.append(round(song_len,2))
    # Calculate frames and generate prompts
    frame_data, animation_prompts = calculate_frames(scene_change_times, interval_strings, motion_data, song_duration, final_anim_frames)
    motion_strings = build_transition_strings(frame_data)
    

    # print("FRAME")
    # print(frame_data)
    # print("ANIM")
    # print(animation_prompts)

    motion_strings = build_transition_strings(frame_data)

    # Print the final list of frame transitions for each motion type
    print("\nFinal List of Frame Transitions for Each Motion Type:")
    for motion, transitions in motion_strings.items():
        print(f"{motion}: {', '.join(transitions)}")

    final_scene_times = scene_change_times
    final_scene_times.insert(0, 0)
    final_scene_times.append(round(song_duration,2))
    final_scene_times = set(final_scene_times)
    final_scene_times = list(final_scene_times)
    # print(final_anim_frames)
    # print(final_scene_times)
    # Print the animation prompts
    print("\nAnimation Prompts:")
    animation_prompts = ""

    print("BAnANANANA", final_scene_times, final_anim_frames)
    if final_anim_frames[-1] + 1 == final_anim_frames[-2]:
        final_anim_frames=final_anim_frames[:-1]
    print("BAnANANANA After", final_scene_times, final_anim_frames)

    
    for i in range(len(final_anim_frames) - 1):
        animation_prompts += f"{final_anim_frames[i]}: | "
        print(f"Start Time: {final_scene_times[i]}, End Time: {final_scene_times[i+1]}, Start Frame: {final_anim_frames[i]}, End Frame: {final_anim_frames[i+1]}")

    animation_prompts = animation_prompts[:-2]
    # print(animation_prompts)
    # For demonstration, we'll just return the received data
    prompts = generate_image_prompts(form_data, final_anim_frames)
    print("PROMPTS")
    print(prompts)
    # print("MOTIONS")
    # print(motion_strings)
    deforum_prompt = create_deforum_prompt(motion_strings, final_anim_frames, motion_mode, prompts)
    print("DEFORUM PROMPTS")
    print(deforum_prompt)
    output = api.run(
        "deforum-art/deforum-stable-diffusion:1a98303504c7d866d2b198bae0b03237eab82edc1491a5306895d12b0021d6f6",
        input=deforum_prompt)
    # output = "https://replicate.delivery/yhqm/u7FcIvDd32bjK5ccA5v0FmQ8LesqmftC6MrUbrRMTZECkyPTA/out.mp4"
    print("OUTPUT", output)
    response = {
        'timestamps_scenes': timestamps_scenes,
        'form_data': form_data,
        'transitions_data': transitions_data,
        'song_len': song_len,
        'animation_prompts': animation_prompts,
        'motion_prompts': motion_strings,
        'prompts': prompts,
        'output': output
        # 'processed_data': processed_data
    }

    return jsonify(response)

if __name__ == "__main__":
    # app.run(debug=True)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
