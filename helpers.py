
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
        if motion not in motion_options:
            print(f"Invalid motion option '{motion}' for time {time}. Using default 'none'.")
            motion = 'none'
        if strength not in strength_options:
            print(f"Invalid strength option '{strength}' for time {time}. Using default 'normal'.")
            strength = 'normal'
        motions.append({'motion': motion.strip(), 'strength': strength.strip(), 'speed': speed.strip()})

    return motions


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

def merge_intervals(interval_strings, motion_data):
    merged_intervals = []
    
    # Loop through intervals
    i = 0
    while i < len(interval_strings) - 1:
        current_interval = interval_strings[i]
        next_interval = interval_strings[i + 1]
        
        current_motions = motion_data[i]
        next_motions = motion_data[i + 1]
        
        # Extract start and end times from the intervals
        current_start_time, current_end_time = current_interval.split("-")
        next_start_time, next_end_time = next_interval.split("-")
        
        # Compare the end time of the current interval and start time of the next
        if current_end_time == next_start_time and current_motions == next_motions:
            # Merge intervals and combine motion data
            merged_interval = f"{current_start_time}-{next_end_time}"
            merged_motions = current_motions  # Since both motions are the same, use one
            
            # Add the merged interval and motion data
            merged_intervals.append((merged_interval, merged_motions))
            
            # Skip the next interval, as it's already merged
            i += 2
        else:
            # Add the current interval and motion data as is
            merged_intervals.append((current_interval, current_motions))
            i += 1
    
    # Handle the last interval if it wasn't merged
    if i < len(interval_strings):
        merged_intervals.append((interval_strings[i], motion_data[i]))
    
    return merged_intervals

def parse_input_data(form_data, trans_data, song_duration):
    trans_data = {k: v for k, v in trans_data.items() if v.get('transition', True)}
    scene_change_times = sorted(list(map(float, form_data.keys())))
    
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
    
    # Print the intervals and motions before merging
    for interval, motions in zip(interval_strings, motion_data):
        print(f"Interval: {interval}, Motions: {motions}")

    # Merge intervals with identical motion data
    merged_intervals = merge_intervals(interval_strings, motion_data)

    # Print the merged intervals
    for interval, motions in merged_intervals:
        print(f"MERGED Interval: {interval}, Motions: {motions}")

    print("merged: ", merged_intervals)

    # Replace the old interval_strings and motion_data with the merged values
    interval_strings = [interval for interval, motions in merged_intervals]
    motion_data = [motions for interval, motions in merged_intervals]

    # Add time intervals from form_data and trans_data
    for key, value in form_data.items():
        time_intervals.append(float(key))
    
    for key in trans_data.keys():
        start, end = map(float, key.split('-'))
        time_intervals.extend([start, end])
    
    time_intervals = sorted(set(time_intervals))
    time_intervals = [str(i) for i in time_intervals]
    
    # Return the updated values
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
        adjusted_duration = round(duration * speed_multiplier['normal'])
        end_frame = current_frame + adjusted_duration

        # Process all motions for this interval
        for motion_entry in motions:
            motion = motion_entry['motion']
            strength = motion_entry['strength']
            

            def get_motion_value(motion, strength):
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
