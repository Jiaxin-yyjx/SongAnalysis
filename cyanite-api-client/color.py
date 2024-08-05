#pip install matplotlib 
#pip install openai==0.28 
import csv
import statistics
import openai
from matplotlib import pyplot as plt

def read_csv_data(file_content):
    reader = csv.reader(file_content.splitlines())
    headers = next(reader)
    data = list(reader)
    return headers, data

def calculate_variances(headers, data):
    variances = []
    for i, header in enumerate(headers[1:], start=1):
        values = [float(row[i]) for row in data if row[i]]
        if values:
            variance = statistics.variance(values)
            variances.append((header, variance))
    return sorted(variances, key=lambda x: x[1], reverse=True)

def get_top_two_emotions(variances):
    return variances[:2]

def generate_color_suggestions(top_emotions, data):
    prompt = f"""Analyze the following emotional data for {top_emotions[0][0]} and {top_emotions[1][0]} over time, and suggest a detailed color arc. 
    Follow these guidelines strictly:
    1. Be highly responsive to every change in the data, even small ones.
    2. Use warm colors (yellows, oranges, reds) for high {top_emotions[0][0]} values.
    3. Use cool colors (blues, purples) for high {top_emotions[1][0]} values.
    4. Use more saturated colors for higher total emotion values, and less saturated (towards gray) for lower total values.
    5. You can use multiple colors within each 15-second interval if there's significant change.
    6. Ensure the overall color progression forms a coherent arc.
    7. Be precise in your color choices, using specific color names or hex codes.

    Data points:
    """
    
    for row in data:
        time = row[0]
        emotion1_value = float(row[headers.index(top_emotions[0][0])])
        emotion2_value = float(row[headers.index(top_emotions[1][0])])
        total_value = emotion1_value + emotion2_value
        prompt += f"Time: {time}s, {top_emotions[0][0]}: {emotion1_value:.2f}, {top_emotions[1][0]}: {emotion2_value:.2f}, Total: {total_value:.2f}\n"
    
    prompt += "\nProvide color suggestions in this format, explaining each choice:\n0-15s: Color(s) (detailed reason for choice based on data)\n15-30s: Color(s) (detailed reason for choice based on data)\n..."

    print(prompt)
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a precise color theory expert that creates detailed, data-driven color arcs based on emotional data."},
            {"role": "user", "content": prompt}
        ]
    )
    
    return response.choices[0].message['content']

def plot_top_emotions(headers, data, top_emotions):
    times = [float(row[0]) for row in data]
    plt.figure(figsize=(10, 6))
    
    for emotion, _ in top_emotions:
        values = [float(row[headers.index(emotion)]) for row in data]
        plt.plot(times, values, label=emotion)
    
    plt.xlabel('Time (seconds)')
    plt.ylabel('Emotion Value')
    plt.title('Top Two Emotions by Variance')
    plt.legend()
    plt.grid(True)
    plt.savefig('top_two_emotions_graph.png')
    plt.close()

# Main execution
file_content = """Time,Aggressive,Calm,Chilled,Dark,Energetic,Epic,Happy,Romantic,Sad,Scary,Sexy,Ethereal,Uplifting
15,0.38,0.14,0.16,0.13,0.75,0.14,0.62,0.13,0.08,0.08,0.34,0.09,0.48
30,0.37,0.06,0.21,0.07,0.68,0.16,0.75,0.12,0.04,0.06,0.28,0.05,0.34
45,0.38,0.08,0.13,0.09,0.71,0.16,0.68,0.08,0.04,0.06,0.22,0.08,0.37
60,0.44,0.11,0.17,0.15,0.71,0.14,0.52,0.13,0.06,0.09,0.35,0.08,0.37
75,0.60,0.08,0.07,0.32,0.75,0.16,0.33,0.06,0.06,0.21,0.22,0.08,0.36
90,0.65,0.05,0.02,0.60,0.69,0.14,0.17,0.02,0.04,0.43,0.08,0.07,0.20
105,0.58,0.08,0.07,0.36,0.73,0.15,0.45,0.04,0.04,0.26,0.13,0.08,0.30
120,0.78,0.06,0.04,0.36,0.88,0.19,0.42,0.02,0.03,0.30,0.11,0.06,0.44"""

headers, data = read_csv_data(file_content)
variances = calculate_variances(headers, data)
top_emotions = get_top_two_emotions(variances)

print("Top two emotions by variance:")
for emotion, variance in top_emotions:
    print(f"{emotion}: {variance}")

plot_top_emotions(headers, data, top_emotions)
print("Graph saved as top_two_emotions_graph.png")

# Set up OpenAI API (make sure to set your API key)
openai.api_key = '....'

color_suggestions = generate_color_suggestions(top_emotions, data)
print("\nColor arc suggestions:")
print(color_suggestions)
