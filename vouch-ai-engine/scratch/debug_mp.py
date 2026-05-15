import mediapipe as mp
print(f"File: {mp.__file__}")
try:
    print(f"Solutions: {mp.solutions}")
except Exception as e:
    print(f"Error: {e}")
