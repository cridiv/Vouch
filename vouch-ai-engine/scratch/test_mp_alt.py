try:
    import mediapipe.python.solutions.face_mesh as mp_face_mesh
    print(f"Face Mesh loaded: {mp_face_mesh}")
    import mediapipe.python.solutions.drawing_utils as mp_drawing
    print(f"Drawing Utils loaded: {mp_drawing}")
except Exception as e:
    print(f"Error: {e}")
