import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"

// The default page. Login not required.
function Guide({BACKEND_URL}) {
    
    const [currentInstructions, setCurrentInstructions] = useState("datasets")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")
    const [downloadFramework2, setDownloadFramework2] = useState("tensorflow")

    const [areaImageIsDark, setAreaImageIsDark] = useState(false)
    const [classificationImageIsDark, setClassificationImageIsDark] = useState(false)

    const [imageIsLoaded, setImageIsLoaded] = useState(false)

    return (
        <div className="guide-container">
            <div className="guide-toolbar">
                <div className={"guide-toolbar-element " + (currentInstructions == "datasets" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("datasets")}>
                    Datasets
                </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "dataset-classification" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("dataset-classification")}>
                        Classification
                    </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "dataset-area" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("dataset-area")}>
                        Area
                    </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "datasets-loading" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("datasets-loading")}>
                        Loading Datasets
                    </div>
                <div className={"guide-toolbar-element " + (currentInstructions == "models" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("models")}>
                    Models
                </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "model-layers" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-layers")}>
                        Layers
                    </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "model-building" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-building")}>
                        Building
                    </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "model-compiling" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-compiling")}>
                        Compiling
                    </div>
                    <div className={"guide-toolbar-element guide-toolbar-subelement " + (currentInstructions == "model-training" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-training")}>
                        Training
                    </div>
                
            </div>

            {/* LOADING DATASETS */}
            {currentInstructions == "datasets-loading" && <div className="guide-main">

                <div className="instructions-header">
                    <h1 className="instructions-title">Loading Datasets</h1>
                    <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                        Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                    </p>
                </div>
                <div className="instructions-container">
                    <div className="download-instructions-element">
                        <h1 className="download-instructions-title">Folders as labels</h1>

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework1("tensorflow")} 
                                className="download-framework">
                                    <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework1 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")}/>
                                    <span className={downloadFramework1 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                </div>
                            <div onClick={() => setDownloadFramework1("pytorch")} className="download-framework" >
                                <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework1 == "pytorch" ? "pytorch.png": "pytorchGray.png")}/>
                                <span className={downloadFramework1 == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                            </div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework1} downloadType="folders" BACKEND_URL={BACKEND_URL}/>
                    </div>

                    <div className="download-instructions-element">
                        <h1 className="download-instructions-title">Filenames as labels</h1>

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework2("tensorflow")} 
                                className="download-framework">
                                    <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework2 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")}/>
                                    <span className={downloadFramework2 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                </div>
                            <div onClick={() => setDownloadFramework2("pytorch")} className="download-framework" >
                                <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework2 == "pytorch" ? "pytorch.png": "pytorchGray.png")}/>
                                <span className={downloadFramework2 == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                            </div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework2} downloadType="files" BACKEND_URL={BACKEND_URL}/>
                    </div>
                </div>
            </div>}

            {currentInstructions == "dataset-classification" && <div className="instructions-header">
                <h1 className="instructions-title">Classification Datasets</h1>
                <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                    Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                </p>
            </div>}

            {currentInstructions == "dataset-area" && <div className="instructions-header">
                <h1 className="instructions-title">Area Datasets</h1>
                <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                    Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                </p>
            </div>}

        </div>
    )
}

export default Guide