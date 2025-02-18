import React, { useState } from "react"

// The def ault page. Login not required.
function DownloadCode({name, datatype, framework, downloadType, BACKEND_URL, modelValues}) {

    const [copied, setCopied] = useState(false)

    function copyCode(text) {
        navigator.clipboard.writeText(text)
        .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Clear status after 2 seconds
        })
        .catch(() => {    

        });
    }

    const FOLDERS_TF_TEXT = `import tensorflow as tf

# Define the paths to your dataset directories
train_dir = 'path_to_your_dataset/train'
val_dir = 'path_to_your_dataset/validation'

# Set parameters
batch_size = 32
img_height = 224  # Resize height
img_width = 224   # Resize width

# Load the training dataset
train_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    train_dir,
    image_size=(img_height, img_width),
    batch_size=batch_size,
    label_mode='categorical'  # 'categorical', 'binary', or None
)`

    const FOLDERS_PT_TEXT = `import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# Define transformations for data preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # Resize all images to 224x224
    transforms.ToTensor(),          # Convert image to PyTorch tensor
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # Normalize to ImageNet standards
])

# Define the paths to your dataset directories
train_dir = 'path_to_your_dataset/train'
val_dir = 'path_to_your_dataset/validation'

# Load the training dataset
train_dataset = datasets.ImageFolder(root=train_dir, transform=transform)
    `

    const FILENAMES_TF_TEXT = `import tensorflow as tf
import os
import re

# Define the dataset directory
dataset_dir = './Sports_Cars'

# Get the list of all file paths
file_paths = [os.path.join(dataset_dir, fname) for fname in os.listdir(dataset_dir)]

# Extract labels from filenames using a regular expression
def extract_label(file_path):
    file_name = tf.strings.split(file_path, os.sep)[-1]
    label = tf.strings.split(file_name, "_")[0]
    return label

# Create a mapping of labels to indices
unique_labels = sorted(set([extract_label(fp).numpy().decode() for fp in file_paths]))
label_to_index = {label: idx for idx, label in enumerate(unique_labels)}

# Function to process each file: load the image and assign the corresponding label
def process_file(file_path):
    label = extract_label(file_path)
    label_index = tf.convert_to_tensor(label_to_index[label.numpy().decode()],dtype=tf.int32)

    # Load the image and preprocess it
    image = tf.io.read_file(file_path)
    image = tf.image.decode_jpeg(image,channels=3)
    image = tf.image.resize(image,[512, 512]) # Resize to desired size
    image = image /255.0# Normalize to [0, 1]

    return image, label_index

file_paths_dataset = tf.data.Dataset.from_tensor_slices(file_paths)

# Process each file to load the image and label
dataset = file_paths_dataset.map(
    lambda fp: tf.py_function(process_file,[fp],[tf.float32, tf.int32]),
    num_parallel_calls=tf.data.AUTOTUNE
)

# Batch, shuffle, and prefetch for performance
batch_size = 32
dataset = dataset.shuffle(buffer_size=1000).batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)`

    const FILENAMES_PT_TEXT = `import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image
import os
import re

# Define the dataset directory
dataset_dir = 'path_to_your_dataset'

# Regular expression to extract the label from filename
def extract_label_from_filename(filename):
    return filename.split('_')[0]  # Extract everything before the underscore (_)

# Get the list of all files
file_paths = [os.path.join(dataset_dir, fname) for fname in os.listdir(dataset_dir) if fname.endswith(('.jpg', '.png'))]

# Create a mapping of labels to indices
unique_labels = sorted(set([extract_label_from_filename(os.path.basename(fp)) for fp in file_paths]))
label_to_index = {label: idx for idx, label in enumerate(unique_labels)}

# Define a custom Dataset class
class CustomImageDataset(Dataset):
    def __init__(self, file_paths, label_to_index, transform=None):
        self.file_paths = file_paths
        self.label_to_index = label_to_index
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        file_path = self.file_paths[idx]
        file_name = os.path.basename(file_path)

        # Extract label and map to index
        label_str = extract_label_from_filename(file_name)
        label = self.label_to_index[label_str]

        # Load and transform the image
        image = Image.open(file_path).convert('RGB')
        if self.transform:
            image = self.transform(image)

        return image, label

# Define transformations (resize, convert to tensor, normalize)
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # Resize images
    transforms.ToTensor(),  # Convert to PyTorch tensor
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # Normalize using ImageNet mean/std
])

# Create dataset
dataset = CustomImageDataset(file_paths, label_to_index, transform=transform)`

    const MODEL_TEXT = `import tensorflow as tf

model = tf.keras.models.load_model('Model_#1.keras')

# Get an overview of the model
model.summary()`


    if (datatype.toLowerCase() == "classification" && downloadType == "folders") {
        if (framework.toLowerCase() == "tensorflow") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FOLDERS_TF_TEXT)}>
                        {!copied && <img className="code-copy-icon" src={BACKEND_URL + "/static/images/copy.png"} />}
                        {copied && <img className="code-copied-icon" src={BACKEND_URL + "/static/images/check.png"} />}
                        {copied ? "Copied" : "Copy"}
                    </button>

                    <div className="download-successful-code-inner">
                        <span className="code-line">1</span><span className="code-pink">import</span> tensorflow <span className="code-pink">as</span> tf<br />
                        <span className="code-line">2</span><br />
                        <span className="code-line">3</span><span className="code-green"># Relative path to your datasets</span><br />
                        <span className="code-line">4</span>DATASET_PATH = <span className="code-orange">"./{name.replaceAll(" ", "_")}"</span><br />
                        <span className="code-line">5</span><br />
                        <span className="code-line">6</span><span className="code-green"># Parameters (change as needed)</span><br />
                        <span className="code-line">7</span>batch_size = <span className="code-lightgreen">32</span><br />
                        <span className="code-line">8</span>img_height = <span className="code-lightgreen">512</span>  <span className="code-green code-tab"># Resize height</span><br />
                        <span className="code-line">9</span>img_width = <span className="code-lightgreen">512</span>   <span className="code-green code-tab"># Resize width</span><br />
                        <span className="code-line">10</span><br />
                        <span className="code-line">11</span><span className="code-green"># Load the dataset</span><br />
                        <span className="code-line">12</span>train_dataset = tf.keras.preprocessing.image_dataset_from_directory<span className="code-yellow">(</span><br />
                        <span className="code-line">13</span>    <span className="code-tab"></span>DATASET_PATH,<br />
                        <span className="code-line">14</span>    <span className="code-tab"></span><span className="code-lightblue">image_size</span>=<span className="code-pink">(</span>img_height, img_width<span className="code-pink">)</span>,<br />
                        <span className="code-line">15</span>    <span className="code-tab"></span><span className="code-lightblue">batch_size</span>=batch_size,<br />
                        <span className="code-line">16</span>    <span className="code-tab"></span><span className="code-lightblue">label_mode</span>=<span className="code-orange">'categorical'</span><br />
                        <span className="code-line">17</span><span className="code-yellow">)</span><br />
                    </div>
                    
                </div>
            )
        } else if (framework.toLowerCase() == "pytorch") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FOLDERS_PT_TEXT)}>
                        {!copied && <img className="code-copy-icon" src={BACKEND_URL + "/static/images/copy.png"} />}
                        {copied && <img className="code-copied-icon" src={BACKEND_URL + "/static/images/check.png"} />}
                        {copied ? "Copied" : "Copy"}
                    </button>

                    <div className="download-successful-code-inner">
                        <span className="code-line">1</span><span className="code-pink">import</span> torch<br />
                        <span className="code-line">2</span><span className="code-pink">from</span> torch.utils.data <span className="code-pink">import</span> DataLoader<br />
                        <span className="code-line">3</span><span className="code-pink">from</span> torchvision <span className="code-pink">import</span> datasets, transforms<br />
                        <span className="code-line">4</span><br />
                        <span className="code-line">5</span><span className="code-green"># Define transformations for data preprocessing</span><br />
                        <span className="code-line">6</span>transform = transforms.Compose<span className="code-yellow">(</span><span className="code-pink">[</span><br />
                        <span className="code-line">7</span>
                            <span className="code-tab"></span>
                            transforms.Resize<span className="code-blue">(</span><span className="code-yellow">(</span>
                            <span className="code-lightgreen">512</span>, <span className="code-lightgreen">512</span>
                            <span className="code-yellow">)</span><span className="code-blue">)</span>, 
                            <span className="code-green code-tab"># Resize all images to chosen size</span>
                        <br />
                        <span className="code-line">8</span>
                            <span className="code-tab"></span>
                            transforms.ToTensor<span className="code-blue">(</span><span className="code-blue">)</span>, 
                            <span className="code-green code-tab"># Convert image to PyTorch tensor</span><br />
                        <span className="code-line">9</span><span className="code-tab"></span>transforms.Normalize<span className="code-blue">(</span>
                            <span className="code-lightblue">mean</span>=
                            <span className="code-yellow">[</span><span className="code-lightgreen">0.485, 0.456, 0.406</span>
                            <span className="code-yellow">]</span>, 
                            <span className="code-lightblue">std</span>=
                            <span className="code-yellow">[</span><span className="code-lightgreen">0.229, 0.224, 0.225</span>
                            <span className="code-yellow">]</span><span className="code-blue">)</span> 
                            <span className="code-green code-tab"># Normalize to ImageNet standards</span><br />
                        <span className="code-line">10</span><span className="code-pink">]</span><span className="code-yellow">)</span><br />
                        <span className="code-line">11</span><br />
                        <span className="code-line">12</span><span className="code-green"># Relative path to your dataset</span><br />
                        <span className="code-line">13</span>train_dir = <span className="code-orange">'{"./" + name.replaceAll(" ", "_")}'</span><br />
                        <span className="code-line">14</span><br />
                        <span className="code-line">15</span><span className="code-green"># Load the training dataset</span><br />
                        <span className="code-line">16</span>train_dataset = datasets.ImageFolder
                            <span className="code-yellow">(</span><span className="code-lightblue">root</span>=train_dir, 
                            <span className="code-lightblue">transform</span>=transform<span className="code-yellow">)</span><br />
                    </div>
                </div>
            )
        }
    } else if (datatype.toLowerCase() == "classification" && downloadType == "files") {
        if (framework.toLowerCase() == "tensorflow") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FILENAMES_TF_TEXT)}>
                        {!copied && <img className="code-copy-icon" src={BACKEND_URL + "/static/images/copy.png"} />}
                        {copied && <img className="code-copied-icon" src={BACKEND_URL + "/static/images/check.png"} />}
                        {copied ? "Copied" : "Copy"}
                    </button>

                    <div className="download-successful-code-inner">
                        <span className="code-line">1</span><span className="code-pink">import</span> tensorflow <span className="code-pink">as</span> tf<br/>
                        <span className="code-line">2</span><span className="code-pink">import</span> os<br/>
                        <span className="code-line">3</span><span className="code-pink">import</span> re<br/>
                        <span className="code-line">4</span><br/>
                        <span className="code-line">5</span><span className="code-green"># Define the dataset directory</span><br/>
                        <span className="code-line">6</span>dataset_dir = <span className="code-orange">'./{name.replaceAll(" ", "_")}'</span><br/>
                        <span className="code-line">7</span><br/>
                        <span className="code-line">8</span><span className="code-green"># Get the list of all file paths</span><br/>
                        <span className="code-line">9</span>file_paths = <span className="code-yellow">[</span>
                            os.path.join<span className="code-pink">(</span>
                            dataset_dir, fname<span className="code-pink">)</span> 
                            <span className="code-pink"> for</span> fname <span className="code-pink"> in </span> 
                            os.listdir<span className="code-pink">(</span>dataset_dir<span className="code-pink">)</span>
                            <span className="code-yellow">]</span><br/>
                        <span className="code-line">10</span><br/>
                        <span className="code-line">11</span><span className="code-green"># Extract labels from filenames using a regular expression</span><br/>
                        <span className="code-line">12</span><span className="code-blue">def </span>
                            <span className="code-lightyellow">extract_label</span>
                            <span className="code-yellow">(</span><span className="code-lightblue">file_path</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">13</span><span className="code-tab"></span>file_name = tf.strings.split<span className="code-yellow">(</span>
                            file_path, os.sep<span className="code-yellow">)</span>
                            <span className="code-yellow">[</span>-<span className="code-lightgreen">1</span>
                            <span className="code-yellow">]</span><br/>
                            <span className="code-line">14</span><span className="code-tab"></span>label = tf.strings.split<span className="code-yellow">(</span>
                            file_name, <span className="code-orange">"_"</span><span className="code-yellow">)</span>
                            <span className="code-yellow">[</span>
                            <span className="code-lightgreen">0</span><span className="code-yellow">]</span>  <br />        
                        <span className="code-line">15</span><span className="code-pink code-tab">return</span> label<br/>
                        <span className="code-line">16</span><br/>
                        <span className="code-line">17</span><span className="code-green"># Create a mapping of labels to indices</span><br/>
                        <span className="code-line">18</span>unique_labels = <span className="code-lightyellow">sorted</span>
                            <span className="code-yellow">(</span>
                            <span className="code-cyan">set</span>
                            <span className="code-pink">(</span>
                            <span className="code-blue">[</span>
                            extract_label<span className="code-yellow">(</span>
                            fp<span className="code-yellow">)</span>
                            .numpy<span className="code-yellow">()</span>
                            .decode<span className="code-yellow">()</span> 
                            <span className="code-pink"> for</span> fp 
                            <span className="code-pink"> in </span> file_paths
                            <span className="code-blue">]</span>
                            <span className="code-pink">)</span>
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">19</span>label_to_index = <span className="code-yellow">{"{"}</span>label: idx 
                            <span className="code-pink"> for</span> idx, label 
                            <span className="code-pink"> in </span> 
                            <span className="code-lightyellow">enumerate</span>
                            <span className="code-pink">(</span>unique_labels<span className="code-pink">)</span>
                            <span className="code-yellow">{"}"}</span><br/>
                        <span className="code-line">20</span><br/>
                        <span className="code-line">21</span><span className="code-green"># Function to process each file: load the image and assign the corresponding label</span><br/>
                        <span className="code-line">22</span><span className="code-blue">def </span> 
                            <span className="code-lightyellow">process_file</span>
                            <span className="code-yellow">(</span>
                            <span className="code-lightblue">file_path</span>
                            <span className="code-yellow">)</span>:<br/>
                        <span className="code-line">23</span><span className="code-tab"></span>label = extract_label<span className="code-yellow">(</span>
                            file_path<span className="code-yellow">)</span><br/>
                        <span className="code-line">24</span><span className="code-tab"></span>label_index = tf.convert_to_tensor
                            <span className="code-yellow">(</span>label_to_index
                            <span className="code-pink">[</span>label.numpy
                            <span className="code-blue">()</span>.decode
                            <span className="code-blue">()</span>
                            <span className="code-pink">]</span>, 
                            <span className="code-lightblue">dtype</span>=tf.int32
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">25</span><br/>
                        <span className="code-line">26</span><span className="code-tab"></span><span className="code-green"># Load the image and preprocess it</span><br/>
                        <span className="code-line">27</span><span className="code-tab"></span>image = tf.io.read_file
                            <span className="code-yellow">(</span>file_path
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">28</span><span className="code-tab"></span>image = tf.image.decode_jpeg
                            <span className="code-yellow">(</span>image, 
                            <span className="code-lightblue">channels</span>=
                            <span className="code-lightgreen">3</span>
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">29</span><span className="code-tab"></span>image = tf.image.resize
                            <span className="code-yellow">(</span>image, 
                            <span className="code-pink">[</span>
                            <span className="code-lightgreen">512, 512</span>
                            <span className="code-pink">]</span>
                            <span className="code-yellow">)</span> 
                            <span className="code-green code-tab"> # Resize to desired size</span><br/>
                        <span className="code-line">30</span><span className="code-tab"></span>image = image / 
                            <span className="code-lightgreen">255.0</span>
                            <span className="code-green code-tab"># Normalize to [0, 1]</span><br/>
                        <span className="code-line">31</span><br/>
                        <span className="code-line">32</span><span className="code-tab code-pink">return</span> image, label_index<br/>
                        <span className="code-line">33</span><br/>

                        <span className="code-line">34</span>file_paths_dataset = tf.data.Dataset.from_tensor_slices
                            <span className="code-yellow">(</span>file_paths
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">35</span><br/>
                        <span className="code-line">36</span><span className="code-green"># Process each file to load the image and label</span><br/>
                        <span className="code-line">37</span>dataset = file_paths_dataset.map<span className="code-yellow">(</span><br/>
                            <span className="code-line">38</span><span className="code-tab code-blue">lambda </span> 
                            <span className="code-lightblue">fp</span>: tf.py_function
                            <span className="code-pink">(</span>
                            process_file, 
                            <span className="code-blui">[</span>fp
                            <span className="code-blui">]</span>, 
                            <span className="code-blui">[</span>tf.float32, tf.int32
                            <span className="code-blui">]</span>
                            <span className="code-pink">)</span>,<br/>
                        <span className="code-line">39</span><span className="code-tab code-lightblue">num_parallel_calls</span>=tf.data.AUTOTUNE<br/>
                        <span className="code-line">40</span><span className="code-yellow">)</span><br/>
                        <span className="code-line">41</span><br/>
                        <span className="code-line">42</span><span className="code-green"># Batch, shuffle, and prefetch for performance</span><br/>
                        <span className="code-line">43</span>batch_size = <span className="code-lightgreen">32</span><br/>
                        <span className="code-line">44</span>dataset = dataset.shuffle
                            <span className="code-yellow">(</span>
                            <span className="code-lightblue">buffer_size</span>=
                            <span className="code-lightgreen">1000</span>
                            <span className="code-yellow">)</span>.batch
                            <span className="code-yellow">(</span>batch_size
                            <span className="code-yellow">)</span>.prefetch
                            <span className="code-yellow">(</span>
                            <span className="code-lightblue">buffer_size</span>=tf.data.AUTOTUNE
                            <span className="code-yellow">)</span><br/>
                    </div>
                </div>
            )
        } else if (framework.toLowerCase() == "pytorch") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FILENAMES_PT_TEXT)}>
                        {!copied && <img className="code-copy-icon" src={BACKEND_URL + "/static/images/copy.png"} />}
                        {copied && <img className="code-copied-icon" src={BACKEND_URL + "/static/images/check.png"} />}
                        {copied ? "Copied" : "Copy"}
                    </button>

                    <div className="download-successful-code-inner">
                        <span className="code-line">1</span><span className="code-pink">import</span> torch<br/>
                        <span className="code-line">2</span><span className="code-pink">from</span> torch.utils.data<span className="code-pink"> import</span> Dataset<br/>
                        <span className="code-line">3</span><span className="code-pink">from</span> torchvision<span className="code-pink"> import</span> transforms<br/>
                        <span className="code-line">4</span><span className="code-pink">from</span> PIL<span className="code-pink"> import</span> Image<br/>
                        <span className="code-line">5</span><span className="code-pink">import</span> os<br/>
                        <span className="code-line">6</span><span className="code-pink">import</span> re<br/>
                        <span className="code-line">7</span><br/>
                        <span className="code-line">8</span><span className="code-green"># Define the dataset directory</span><br/>
                        <span className="code-line">9</span>dataset_dir = <span className="code-orange">'path_to_your_dataset'</span><br/>
                        <span className="code-line">10</span><br/>
                        <span className="code-line">11</span><span className="code-green"># Regular expression to extract the label from filename</span><br/>
                        <span className="code-line">12</span><span className="code-blue">def</span> <span className="code-lightyellow">extract_label_from_filename</span><span className="code-yellow">(</span><span className="code-lightblue">filename</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">13</span><span className="code-tab code-pink">return</span> filename.split<span className="code-yellow">(</span><span className="code-orange">'_'</span><span className="code-yellow">)[</span><span className="code-lightgreen">0</span><span className="code-yellow">]</span><br/>
                        <span className="code-line">14</span><br/>
                        <span className="code-line">15</span><span className="code-green"># Get the list of all files</span><br/>
                        <span className="code-line">16</span>file_paths = <span className="code-yellow">[</span>
                            os.path.join<span className="code-pink">(</span>dataset_dir, fname<span className="code-pink">)</span> 
                            <span className="code-pink"> for</span> fname<span className="code-pink"> in</span> os.listdir
                            <span className="code-pink">(</span>dataset_dir<span className="code-pink">)</span>
                            <span className="code-pink"> if</span> fname.endswith<span className="code-pink">(</span><span className="code-blue">(</span>
                            <span className="code-orange">'.jpg'</span>, <span className="code-orange">'.png'</span>
                            <span className="code-blue">)</span><span className="code-pink">)</span><span className="code-yellow">]</span><br/>
                        <span className="code-line">17</span><br/>
                        <span className="code-line">18</span><span className="code-green"># Create a mapping of labels to indices</span><br/>
                        <span className="code-line">19</span>unique_labels = <span className="code-lightyellow">sorted</span>
                            <span className="code-yellow">(</span><span className="code-cyan">set</span>
                            <span className="code-pink">(</span><span className="code-blue">[</span>
                            extract_label_from_filename<span className="code-yellow">(</span>os.path.basename<span className="code-pink">(</span>fp
                            <span className="code-pink">)</span><span className="code-yellow">)</span> 
                            <span className="code-pink"> for</span> fp<span className="code-pink"> in</span> file_paths
                            <span className="code-blue">]</span><span className="code-pink">)</span><span className="code-yellow">)</span><br/>
                        <span className="code-line">20</span>label_to_index =<span className="code-yellow"> {"{"}</span> label: idx 
                            <span className="code-pink"> for</span> idx, label<span className="code-pink"> in</span> 
                            <span className="code-lightyellow"> enumerate</span><span className="code-pink">(</span>unique_labels
                            <span className="code-pink">)</span><span className="code-yellow">{"}"}</span><br/>
                        <span className="code-line">21</span><br/>
                        <span className="code-line">22</span><span className="code-green"># Define a custom Dataset class</span><br/>
                        <span className="code-line">23</span><span className="code-blue">class </span>
                            <span className="code-cyan">CustomImageDataset</span><span className="code-yellow">(</span>
                            <span className="code-cyan">Dataset</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">24</span><span className="code-tab"></span><span className="code-blue">def</span> 
                            <span className="code-lightyellow"> __init__</span><span className="code-yellow">(</span>
                            <span className="code-lightblue">self, file_paths, label_to_index, transform</span>=
                            <span className="code-blue">None</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">25</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-blue">self</span>.file_paths = file_paths<br/>
                        <span className="code-line">26</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-blue">self</span>.label_to_index = label_to_index<br/>
                        <span className="code-line">27</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-blue">self</span>.transform = transform<br/>
                        <span className="code-line">28</span><br/>
                        <span className="code-line">29</span><span className="code-tab"></span><span className="code-blue">def</span> 
                            <span className="code-lightyellow"> __len__</span><span className="code-yellow">(</span>
                            <span className="code-lightblue">self</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">30</span><span className="code-tab"></span><span className="code-tab"></span>
                            <span className="code-pink">return</span><span className="code-lightyellow"> len</span>
                            <span className="code-yellow">(</span><span className="code-blue">self</span>.file_paths
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">31</span><br/>
                        <span className="code-line">32</span><span className="code-tab"></span><span className="code-blue">def</span>
                            <span className="code-lightyellow"> __getitem__</span><span className="code-yellow">(</span>
                            <span className="code-lightblue">self, idx</span><span className="code-yellow">)</span>:<br/>
                        <span className="code-line">33</span><span className="code-tab"></span><span className="code-tab"></span>file_path = <span className="code-blue">self</span>
                        .file_paths<span className="code-yellow">[</span>idx<span className="code-yellow">]</span><br/>
                        <span className="code-line">34</span><span className="code-tab"></span><span className="code-tab"></span>file_name = os.path.basename
                            <span className="code-yellow">(</span>file_path<span className="code-yellow">)</span><br/>
                        <span className="code-line">35</span><br/>
                        <span className="code-line">36</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-green"># Extract label and map to index</span><br/>
                        <span className="code-line">37</span><span className="code-tab"></span><span className="code-tab"></span>label_str = extract_label_from_filename
                            <span className="code-yellow">(</span>file_name
                            <span className="code-yellow">)</span><br/>
                        <span className="code-line">38</span><span className="code-tab"></span><span className="code-tab"></span>label = <span className="code-blue">self</span>
                            .label_to_index<span className="code-yellow">[</span>label_str<span className="code-yellow">]</span><br/>
                        <span className="code-line">39</span><br/>
                        <span className="code-line">40</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-green"># Load and transform the image</span><br/>
                        <span className="code-line">41</span><span className="code-tab"></span><span className="code-tab"></span>image = Image.open
                            <span className="code-yellow">(</span>file_path<span className="code-yellow">)</span>.convert
                            <span className="code-yellow">(</span><span className="code-orange">'RGB'</span><span className="code-yellow">)</span><br/>
                        <span className="code-line">42</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-pink">if </span> 
                            <span className="code-blue">self</span>.transform:<br/>
                        <span className="code-line">43</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-tab"></span>image = 
                            <span className="code-blue"> self</span>.transform<span className="code-yellow">(</span>image<span className="code-yellow">)</span><br/>
                        <span className="code-line">44</span><br/>
                        <span className="code-line">45</span><span className="code-tab"></span><span className="code-tab"></span><span className="code-pink">return</span> image, label<br/>
                        <span className="code-line">46</span><br/>
                        <span className="code-line">47</span>transform = transforms.Compose<span className="code-yellow">(</span><span className="code-pink">[</span><br/>
                        <span className="code-line">48</span><span className="code-tab"></span>transforms.Resize<span className="code-blue">(</span>
                            <span className="code-yellow">(</span><span className="code-lightgreen">512, 512</span>
                            <span className="code-yellow">)</span><span className="code-blue">)</span>,  <span className="code-green code-tab"># Resize images</span><br/>
                        <span className="code-line">59</span><span className="code-tab"></span>transforms.ToTensor<span className="code-blue">()</span>,<br/>
                        <span className="code-line">50</span><span className="code-tab"></span>transforms.Normalize<span className="code-blue">(</span>
                            <span className="code-lightblue">mean</span>=
                            <span className="code-yellow">[</span><span className="code-lightgreen">0.485, 0.456, 0.406</span>
                            <span className="code-yellow">]</span>, <span className="code-lightblue">std</span>=
                            <span className="code-yellow">[</span><span className="code-lightgreen">0.229, 0.224, 0.225</span>
                            <span className="code-yellow">]</span><span className="code-blue">)</span>  <span className="code-green code-tab"># Normalize using ImageNet mean/std</span><br/>
                        <span className="code-line">51</span><span className="code-pink">]</span><span className="code-yellow">)</span><br/>
                        <span className="code-line">52</span><br/>
                        <span className="code-line">53</span><span className="code-green"># Create dataset</span><br/>
                        <span className="code-line">54</span>dataset = CustomImageDataset<span className="code-yellow">(</span>file_paths, label_to_index, 
                            <span className="code-lightblue"> transform</span>=transform<span className="code-yellow">)</span><br/>
                    </div>
                </div>
            )
        }
    } else if (datatype == "model") {
        return (
            <div className="download-successful-code">
                <button className="download-successful-code-copy" onClick={() => copyCode(MODEL_TEXT)}>
                    {!copied && <img className="code-copy-icon" src={BACKEND_URL + "/static/images/copy.png"} />}
                    {copied && <img className="code-copied-icon" src={BACKEND_URL + "/static/images/check.png"} />}
                    {copied ? "Copied" : "Copy"}
                </button>

                <div className="download-successful-code-inner">
                    <span className="code-line">1</span><span className="code-pink">import</span> tensorflow <span className="code-pink"> as</span> tf<br />
                    <span className="code-line">2</span><br />
                    <span className="code-line">3</span>model = tf.keras.models.load_model<span className="code-yellow">(</span>
                        <span className="code-orange">'{modelValues.filename}{modelValues.format}'</span>
                        <span className="code-yellow">)</span><br></br>
                    <span className="code-line">4</span><br></br>
                    <span className="code-line">5</span><span className="code-green"># Get an overview of the model</span><br></br>
                    <span className="code-line">6</span>model.summary<span className="code-yellow">()</span>
                </div>
            </div>   
        )
    }
    
}

export default DownloadCode