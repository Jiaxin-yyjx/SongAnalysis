from aitabs import AITabTranscription  # assuming aitabs.py handles all integrations
import os

# Configuration for the AITabTranscription instance
config = {
    'n_channel': 2,
    'sources': 4,
    'sample_rate': 44100,
    'separate': {
        'model_name': 'unet',  # assuming this is still valid
        'model_path': './models/unet.py',  # adjust path based on actual location
        'spec': {
            'n_fft': 2048,
            'hop_length': 512,
            'n_time': 512,
        },
        'model': {
            # additional model config if needed
        }
    },
    'lyrics': {
        # lyrics extraction configuration
    },
    'beat': {
        'model_name': 'beat_net',
        'model_path': './models/beat_net.py',
    },
    'chord': {
        'model_name': 'chord_net',
        'model_path': './models/chord_net.py',
    },
    'segment': {
        'model_name': 'segment_net',
        'model_path': './models/segment_net.py',
    },
    'pitch': {
        'model_name': 'pitch_net',
        'model_path': './models/pitch_net.py',
    },
    'tempo': {
        'hop_length': 512  # Example configuration
    }
}

# Initialize the transcription class
transcriber = AITabTranscription(config)

# Path to your music file
music_file_path = '../song_clip/taylor.wav'
print(os.getcwd())

# Transcribe the music file
results, separated_waveforms = transcriber.transcribe(music_file_path)

# Print the results
print("Transcription Results:")
print(results)

# Optionally, save the separated waveforms to files
for i, waveform in enumerate(separated_waveforms):
    save_path = f"output_waveform_{i}.wav"
    transcriber.write_wav(save_path, waveform, transcriber.config['sample_rate'])
    print(f"Saved separated waveform {i} to {save_path}")
