import React, { useState } from "react"

// The default page. Login not required.
function DownloadCode({name, datatype, framework, downloadType}) {

    function copyCode(text) {
        navigator.clipboard.writeText(text)
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

    if (datatype.toLowerCase() == "classification" && downloadType == "folders") {
        if (framework.toLowerCase() == "tensorflow") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FOLDERS_TF_TEXT)}>
                        <img className="code-copy-icon" src={window.location.origin + "/static/images/copy.png"} />
                        Copy
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
                        <img className="code-copy-icon" src={window.location.origin + "/static/images/copy.png"} />
                        Copy
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
                    <button className="download-successful-code-copy" onClick={() => copyCode(FILES_TF_TEXT)}>
                        <img className="code-copy-icon" src={window.location.origin + "/static/images/copy.png"} />
                        Copy
                    </button>

                    <div className="download-successful-code-inner">
                        <span className="code-pink">import</span> tensorflow <span className="code-pink">as</span> tf<br/>
                        <span className="code-pink">import</span> os<br/>
                        <span className="code-pink">import</span> re<br/>
                        <br/>
                        <span className="code-green"># Define the dataset directory</span><br/>
                        dataset_dir = <span className="code-orange">'./{name.replaceAll(" ", "_")}'</span><br/>
                        <br/>
                        <span className="code-green"># Get the list of all file paths</span><br/>
                            file_paths = <span className="code-yellow">[</span>
                            os.path.join<span className="code-pink">(</span>
                            dataset_dir, fname<span className="code-pink">)</span> 
                            <span className="code-pink">for</span> fname <span className="code-pink">in</span> 
                            os.listdir<span className="code-pink">(</span>dataset_dir<span className="code-pink">)</span>
                            <span className="code-yellow">]</span><br/>
                            <br/>
                        <span className="code-green"># Extract labels from filenames using a regular expression</span><br/>
                        <span className="code-blue">def</span>
                            <span className="code-lightyellow">extract_label</span>
                            <span className="code-yellow">(</span><span className="code-lightblue">file_path</span><span className="code-yellow">)</span>:<br/>
                            <span className="code-tab"></span>file_name = tf.strings.split<span className="code-yellow">(</span>
                            file_path, os.sep<span className="code-yellow">)</span>
                            <span className="code-yellow">[</span>-<span className="code-lightgreen">1</span>
                            <span className="code-yellow">]</span><br/>

                            <span className="code-tab"></span>label = tf.strings.split<span className="code-yellow">(</span>
                            file_name, <span className="code-orange">"_"</span><span className="code-yellow">)</span>
                            <span className="code-yellow">[</span>
                            <span className="code-lightgreen">0</span><span className="code-yellow">]</span>  <br />        
                            <br />
                            <span className="code-pink">return</span> label<br/>
                        <br/>
                        <span className="code-green"># Create a mapping of labels to indices</span><br/>
                        unique_labels = <span className="code-lightyellow">sorted</span>
                            <span className="code-yellow">(</span>
                            <span className="code-cyan">set</span>
                            <span className="code-pink">(</span>
                            <span className="code-blue">[</span>
                            extract_label<span className="code-yellow">(</span>
                            fp<span className="code-yellow">)</span>
                            .numpy<span className="code-yellow">()</span>
                            .decode<span className="code-yellow">()</span> 
                            <span className="code-pink">for</span> fp 
                            <span className="code-pink">in</span> file_paths
                            <span className="code-blue">]</span>
                            <span className="code-pink">)</span>
                            <span className="code-yellow">)</span><br/>
                        label_to_index = <span className="code-yellow">{"{"}</span>label: idx 
                            <span className="code-pink">for</span> idx, label 
                            <span className="code-pink">in</span> 
                            <span className="code-lightyellow">enumerate</span>
                            <span className="code-pink">(</span>unique_labels<span className="code-pink">(</span>
                            <span className="code-yellow">{"}"}</span><br/>
                        <br/>
                        <span className="code-green"># Function to process each file: load the image and assign the corresponding label</span><br/>
                        <span className="code-blue">def</span> 
                            <span className="code-lightyellow">process_file</span>
                            <span className="code-yellow">(</span>
                            <span className="code-lightblue">file_path</span>
                            <span className="code-yellow">)</span>:<br/>
                        <span className="code-tab"></span>label = extract_label<span className="code-yellow">(</span>
                            file_path<span className="code-yellow">)</span><br/>
                        label_index = tf.convert_to_tensor(label_to_index[label.numpy().decode()], dtype=tf.int32)<br/>
                        <br/>
                            # Load the image and preprocess it<br/>
                            image = tf.io.read_file(file_path)<br/>
                            image = tf.image.decode_jpeg(image, channels=3)<br/>
                            image = tf.image.resize(image, [224, 224])  # Resize to desired size<br/>
                            image = image / 255.0  # Normalize to [0, 1]<br/>
                        <br/>
                            return image, label_index<br/>
                        <br/>
                        # Create a tf.data.Dataset<br/>
                        file_paths_dataset = tf.data.Dataset.from_tensor_slices(file_paths)<br/>
                        <br/>
                        # Process each file to load the image and label<br/>
                        dataset = file_paths_dataset.map(<br/>
                            lambda fp: tf.py_function(process_file, [fp], [tf.float32, tf.int32]),<br/>
                            num_parallel_calls=tf.data.AUTOTUNE<br/>
                        )<br/>
                        <br/>
                        # Batch, shuffle, and prefetch for performance<br/>
                        batch_size = 32<br/>
                        dataset = dataset.shuffle(buffer_size=1000).batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)<br/>
                        <br/>
                        # Print the label mapping<br/>
                        print("Label to Index Mapping:", label_to_index)<br/>
                    </div>
                </div>
            )
        } else if (framework.toLowerCase() == "pytorch") {
            return (
                <div className="download-successful-code">
                    <button className="download-successful-code-copy" onClick={() => copyCode(FILES_TF_TEXT)}>
                        <img className="code-copy-icon" src={window.location.origin + "/static/images/copy.png"} />
                        Copy
                    </button>

                    <div className="download-successful-code-inner">

                    </div>
                </div>
            )
        }
    }
    
}

export default DownloadCode