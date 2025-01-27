import tensorflow as tf
import os
import re

# Define the dataset directory
dataset_dir = './Sports_Cars'

# Get the list of all file paths
file_paths = [os.path.join(dataset_dir, fname) for fname in os.listdir(dataset_dir)]

# Extract labels from filenames using a regular expression
def extract_label(file_path):
    file_name = tf.strings.split(file_path, os.sep)[-1]  # Get the filename
    label = tf.strings.split(file_name, "_")[0]          # Extract the part before "_"
    return label

# Create a mapping of labels to indices
unique_labels = sorted(set([extract_label(fp).numpy().decode() for fp in file_paths]))
label_to_index = {label: idx for idx, label in enumerate(unique_labels)}

# Function to process each file: load the image and assign the corresponding label
def process_file(file_path):
    label = extract_label(file_path)
    label_index = tf.convert_to_tensor(label_to_index[label.numpy().decode()], dtype=tf.int32)
    
    # Load the image and preprocess it
    image = tf.io.read_file(file_path)
    image = tf.image.decode_jpeg(image, channels=3)
    image = tf.image.resize(image, [224, 224])  # Resize to desired size
    image = image / 255.0  # Normalize to [0, 1]
    
    return image, label_index

# Create a tf.data.Dataset
file_paths_dataset = tf.data.Dataset.from_tensor_slices(file_paths)

# Process each file to load the image and label
dataset = file_paths_dataset.map(
    lambda fp: tf.py_function(process_file, [fp], [tf.float32, tf.int32]),
    num_parallel_calls=tf.data.AUTOTUNE
)

# Batch, shuffle, and prefetch for performance
batch_size = 32
dataset = dataset.shuffle(buffer_size=1000).batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)

# Print the label mapping
print("Label to Index Mapping:", label_to_index)