import React, { useState } from "react"

// The default page. Login not required.
function DownloadCode({name, datatype, framework, downloadType}) {

    if (downloadType == "folders") {
        if (datatype.toLowerCase() == "classification" && framework.toLowerCase() == "tensorflow") {
            return (
                <div className="download-successful-code">
                    <span className="code-line">1</span><span className="code-pink">import</span> tensorflow <span className="code-pink">as</span> tf<br />
                    <span className="code-line">2</span><br />
                    <span className="code-line">3</span><span className="code-green"># Relative path to your datasets</span><br />
                    <span className="code-line">4</span>DATASET_PATH = <span className="code-orange">"/{name.replaceAll(" ", "_")}"</span><br />
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
            )
        } else if (true) {
            return (
                <div className="download-successful-code">
                    <span className="code-line">1</span><span className="code-pink">import</span> torch<br />
                    <span className="code-line">2</span><span className="code-pink">from</span> torch.utils.data <span className="code-pink">import</span> DataLoader<br />
                    <span className="code-line">3</span><span className="code-pink">from</span> torchvision <span className="code-pink">import</span> datasets, transforms<br />
                    <span className="code-line">4</span><br />
                    <span className="code-line">5</span><span className="code-green"># Define transformations for data preprocessing</span><br />
                    <span className="code-line">7</span>transform = transforms.Compose<span className="code-yellow">(</span><span className="code-pink">[</span><br />
                    <span className="code-line">8</span>
                        <span className="code-tab"></span>
                        transforms.Resize<span className="code-blue">(</span><span className="code-yellow">(</span>
                        <span className="code-lightgreen">512</span>, <span className="code-lightgreen">512</span>
                        <span className="code-yellow">)</span><span className="code-blue">)</span>, 
                        <span className="code-green code-tab"># Resize all images to chosen size</span>
                    <br />
                    <span className="code-line">9</span>
                        <span className="code-tab"></span>
                        transforms.ToTensor<span className="code-blue">(</span><span className="code-blue">)</span>, 
                        <span className="code-green code-tab"># Convert image to PyTorch tensor</span><br />
                    <span className="code-line">10</span><span className="code-tab"></span>transforms.Normalize<span className="code-blue">(</span>
                        <span className="code-lightblue">mean</span>=
                        <span className="code-yellow">[</span><span className="code-lightgreen">0.485, 0.456, 0.406</span>
                        <span className="code-yellow">]</span>, 
                        <span className="code-lightblue">std</span>=
                        <span className="code-yellow">[</span><span className="code-lightgreen">0.229, 0.224, 0.225</span>
                        <span className="code-yellow">]</span><span className="code-blue">)</span> 
                        <span className="code-green code-tab"># Normalize to ImageNet standards</span><br />
                    <span className="code-line">11</span><span className="code-pink">]</span><span className="code-yellow">)</span><br />
                    <span className="code-line">12</span><br />
                    <span className="code-line">13</span><span className="code-green"># Relative path to your dataset</span><br />
                    <span className="code-line">14</span>train_dir = <span className="code-orange">'{"/" + name.replaceAll(" ", "_")}'</span><br />
                    <span className="code-line">15</span><br />
                    <span className="code-line">16</span><span className="code-green"># Load the training dataset</span><br />
                    <span className="code-line">17</span>train_dataset = datasets.ImageFolder
                        <span className="code-yellow">(</span><span className="code-lightblue">root</span>=train_dir, 
                        <span className="code-lightblue">transform</span>=transform<span className="code-yellow">)</span><br />
                </div>
            )
        }
    } else if (downloadType == "files") {
        if (datatype.toLowerCase() == "classification" && framework.toLowerCase() == "tensorflow") {
            return (
                <div className="download-successful-code">
                    
                </div>
            )
        } else if (true) {
            return (
                <div className="download-successful-code">
                    
                </div>
            )
        }
    }
    
}

export default DownloadCode