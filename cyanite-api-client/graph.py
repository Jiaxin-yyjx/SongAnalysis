import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

def generate_graph(csv_file_path):
    # Read the CSV file
    df = pd.read_csv(csv_file_path)
    
    # Create subplots: one for mood data, one for valence/arousal
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                        subplot_titles=("Mood Analysis", "Valence and Arousal"))

    # Add traces for moo
generate_graph("aurora_jul8_2.mp3_mood_data.csv")