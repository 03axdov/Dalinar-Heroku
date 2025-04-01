import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"

// The default page. Login not required.
function Guide({BACKEND_URL}) {
    
    const [currentInstructions, setCurrentInstructions] = useState("start")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")
    const [downloadFramework2, setDownloadFramework2] = useState("tensorflow")

    const [areaImageIsDark, setAreaImageIsDark] = useState(false)
    const [classificationImageIsDark, setClassificationImageIsDark] = useState(false)

    const [imageIsLoaded, setImageIsLoaded] = useState(false)

    return (
        <div className="guide-container">
            <div className="guide-toolbar">
                <div className="guide-toolbar-element">
                    Guide
                </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "start" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("start")}>
                        Dalinar Overview
                    </div>
                <div className="guide-toolbar-element">
                    Datasets
                </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "dataset-classification" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("dataset-classification")}>
                        Classification
                    </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "dataset-area" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("dataset-area")}>
                        Area
                    </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "datasets-loading" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("datasets-loading")}>
                        Loading Datasets
                    </div>
                <div className="guide-toolbar-element">
                    Models
                </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "model-layers" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-layers")}>
                        Layers
                    </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "model-building" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-building")}>
                        Building
                    </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "model-compiling" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-compiling")}>
                        Compiling
                    </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "model-training" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model-training")}>
                        Training
                    </div>
                
            </div>

            <div className="guide-main-outer">

                {currentInstructions == "start" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Dalinar Overview</h1>
                        <p className="instructions-text">
                            Dalinar is a tool for making machine learning intuitive. It allows users to create datasets as well as machine learning models, all without having to code.
                            Crucially, the visual and intuitive interface makes it easy to experiment with different models, while the datasets provided makes it easier to eventually train these to your needs.
                        </p>
                    </div>

                    <p className="guide-subheader" id="datasets">Datasets</p>
                    <p className="instructions-text">
                        Users are able to create both area and classification datasets. Dalinar currently supports both images and text.
                        Elements are listed to the left with labels and areas, if applicable, to the right.
                    </p>
                    <img className="guide-image" src={BACKEND_URL + "/static/images/examplePage.jpg"} style={{height: "430px"}} />
                    <img className="guide-image" src={BACKEND_URL + "/static/images/exampleClassification.jpg"} style={{height: "430px"}} />
                    
                    <p className="guide-subheader" id="models">Models</p>
                    <p className="instructions-text">
                        Models consist of multiple ordered layers of different types, such as Dense and Conv2D.
                        These all have different parameters that can be tailored to your needs.
                        Once you've construct a model it must be built (i.e. compiled) and can then be trained or exported. 
                    </p>
                    <img className="guide-image" src={BACKEND_URL + "/static/images/examplePageModel.jpg"} style={{height: "430px"}} />
                    <p className="instructions-text" style={{marginBottom: "50px"}}>
                        Please see the more detailed pages for further explanations.
                    </p>
                </div>}
                
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

                {currentInstructions == "dataset-classification" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Classification Datasets</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "dataset-area" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Area Datasets</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-layers" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Layers</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-building" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Building</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-compiling" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Compiling</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-training" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Training</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                </div>}
            </div>

            {currentInstructions == "start" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("datasets").scrollIntoView({behavior: "smooth"});}}>
                    Datasets
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("models").scrollIntoView({behavior: "smooth"});}}>
                    Models
                </div>
            </div>}
        </div>
    )
}

export default Guide