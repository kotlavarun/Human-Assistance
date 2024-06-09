import cv2
import numpy as np
import pyttsx3
import speech_recognition as sr
import time

# Initialize text-to-speech engine
engine = pyttsx3.init()

def speak(message):
    engine.say(message)
    engine.runAndWait()

# Initialize speech recognition
recognizer = sr.Recognizer()
microphone = sr.Microphone() 

def listen_for_exit_command():
    try:
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source)
            audio = recognizer.listen(source, timeout=1, phrase_time_limit=5)
        command = recognizer.recognize_google(audio).lower()
        return command
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        return None
    except sr.RequestError:
        return None
    

# Load YOLO
net = cv2.dnn.readNet("yolov3.weights", "yolov3.cfg")
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]  # Fix indexing issue
classes = []
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]

# Start capturing video
cap = cv2.VideoCapture(0)  # Use 0 for webcam

# Variables to manage warnings
last_warning_time = 0
warning_repeat_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    height, width, channels = frame.shape

    # Detecting objects
    blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(output_layers)

    # Show information on the screen and speak
    class_ids = []
    confidences = []
    boxes = []
    # Store object positions
    object_positions = {'left': 0, 'right': 0, 'center': 0}

    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            if confidence > 0.5:
                # Object detected
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)

                # Rectangle coordinates
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)

                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)

                 # Update object positions
                if center_x < width / 3:
                    object_positions['left'] += 1
                elif center_x > 2 * width / 3:
                    object_positions['right'] += 1
                else:
                    object_positions['center'] += 1

                


    

    # Determine warning message based on object positions
    warning_message = ""
    if object_positions['left'] > 0:
        warning_message = "Move to the right to avoid collision."
    elif object_positions['right'] > 0:
        warning_message = "Move to the left to avoid collision."
    elif object_positions['center'] > 0:
        warning_message = "Object detected in front. Move to left or right to avoid collision."

    # Manage warning repetition and waiting time
    current_time = time.time()
    if warning_message:
        if current_time - last_warning_time > 10:  # Wait for 10 seconds before repeating the warning
            warning_repeat_count = 0
        if warning_repeat_count < 2:  # Repeat warning maximum twice
            speak(warning_message)
            last_warning_time = current_time
            warning_repeat_count += 1

    cv2.imshow("Image", frame)
    # Listen for voice command to exit
    command = listen_for_exit_command()
    if command == "exit":
        print("Voice command 'exit' detected. Exiting...")
        break

cap.release()
cv2.destroyAllWindows()
