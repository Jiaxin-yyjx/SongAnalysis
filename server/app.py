import copy
from flask import Flask, Response, jsonify, render_template, request
import json
import random
from collections import UserString

import subprocess
import os

app = Flask(__name__, template_folder='../templates', static_folder='../static')

# API Route
@app.route('/')
def homepage():
    return render_template('waveform.html')

@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    file = request.files['audioFile']
    if file:
        # Save the audio file temporarily
        file_path = os.path.join('.', file.filename)
        file.save(file_path)

        # Command to process the audio file
        command = [
            'whisperx', file_path, '--model', 'medium.en', '--output_dir', '.',
            '--align_model', 'WAV2VEC2_ASR_LARGE_LV60K_960H', '--align_extend', '2'
        ]
        try:
            result = subprocess.run(command, check=True, text=True, capture_output=True)
            os.remove(file_path)  # Clean up the audio file
            return jsonify({"success": True, "output": result.stdout})
        except subprocess.CalledProcessError as e:
            os.remove(file_path)  # Clean up the audio file
            return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)