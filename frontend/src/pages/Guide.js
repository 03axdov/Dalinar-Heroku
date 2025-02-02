import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"

// The default page. Login not required.
function Guide() {
    
    const [currentInstructions, setCurrentInstructions] = useState("classification")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")
    const [downloadFramework2, setDownloadFramework2] = useState("tensorflow")

    const [areaImageIsDark, setAreaImageIsDark] = useState(false)
    const [classificationImageIsDark, setClassificationImageIsDark] = useState(false)

    return (
        <div className="guide-container">
            <div className="guide-toolbar">
                <div className={"guide-toolbar-element " + (currentInstructions == "classification" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("classification")}>
                    Classification Labeling
                </div>
                <div className={"guide-toolbar-element " + (currentInstructions == "area" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("area")}>
                    Area Labeling
                </div>
                <div className={"guide-toolbar-element " + (currentInstructions == "download" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("download")}>
                    Loading Datasets
                </div>
                
            </div>

            {/* LOADING DATASETS */}
            {currentInstructions == "download" && <div className="guide-main">

                <div className="instructions-header">
                    <h1 className="instructions-title">Download Help</h1>
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
                                    <img className="download-framework-icon" src={window.location.origin + "/static/images/" + (downloadFramework1 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")}/>
                                    <span className={downloadFramework1 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                </div>
                            <div onClick={() => setDownloadFramework1("pytorch")} className="download-framework" >
                                <img className="download-framework-icon" src={window.location.origin + "/static/images/" + (downloadFramework1 == "pytorch" ? "pytorch.png": "pytorchGray.png")}/>
                                <span className={downloadFramework1 == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                            </div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework1} downloadType="folders"/>
                    </div>

                    <div className="download-instructions-element">
                        <h1 className="download-instructions-title">Filenames as labels</h1>

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework2("tensorflow")} 
                                className="download-framework">
                                    <img className="download-framework-icon" src={window.location.origin + "/static/images/" + (downloadFramework2 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")}/>
                                    <span className={downloadFramework2 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                </div>
                            <div onClick={() => setDownloadFramework2("pytorch")} className="download-framework" >
                                <img className="download-framework-icon" src={window.location.origin + "/static/images/" + (downloadFramework2 == "pytorch" ? "pytorch.png": "pytorchGray.png")}/>
                                <span className={downloadFramework2 == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                            </div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework2} downloadType="files"/>
                    </div>
                </div>
            </div>}

            {/* AREA LABELLING */}
            {currentInstructions == "area" && <div className="guide-main">
                <div className="instructions-header">
                    <h1 className="instructions-title">Area Labelling</h1>
                    <p className="instructions-text">
                        Area labels can be used to highlight sections of images, identifying them as the label used, e.g. a car.
                        See the image below for more information.
                    </p>
                </div>

                <div className="instructions-container">
                    <div className="instructions-area-container" onMouseEnter={() => setAreaImageIsDark(true)} onMouseLeave={() => setAreaImageIsDark(false)}>
                        <img className={"instructions-area-image " + (areaImageIsDark ? "instructions-area-image-disabled" : "")} src={window.location.origin + "/static/images/examplePage.jpg"} />
                        
                        <div className="instructions-area-comment" style={{top: "14%", right: "14%"}}>
                            Clicking on a label or applying its keybind selects it.
                        </div>
                        
                        <div className="instructions-area-comment" style={{top: "65%", right: "1%"}}>
                            Areas added to the current element are listed here.
                            The number of points is shown to the right. Clicking on an area selects it.
                        </div>

                        <div className="instructions-area-comment" style={{top: "78%", right: "25%"}}>
                            Areas consist of an arbitrary number of points. 
                            Clicking on the image with a label or area selected adds a point to that area.
                        </div>

                        <div className="instructions-area-comment" style={{top: "65%", right: "66%"}}>
                            Clicking on a point allows you to move or delete it.
                        </div>
                    </div>
                </div>
            </div>}


            {/* CLASSIFICATION LABELLING */}
            {currentInstructions == "classification" && <div className="guide-main">
                <div className="instructions-header">
                    <h1 className="instructions-title">Classification Labelling</h1>
                    <p className="instructions-text">
                        Classification labels are used to classify elements, identifying them as the label used, e.g. as an image of a specific car brand.
                        See the image below for more information.
                    </p>
                </div>

                <div className="instructions-container">
                    <div className="instructions-area-container" onMouseEnter={() => setClassificationImageIsDark(true)} onMouseLeave={() => setClassificationImageIsDark(false)}>
                        <img className={"instructions-area-image " + (classificationImageIsDark ? "instructions-area-image-disabled" : "")} 
                        src={window.location.origin + "/static/images/exampleClassification.jpg"} />
                        
                        <div className="instructions-area-comment" style={{top: "31%", right: "1%"}}>
                            Added labels are listed here, along with their keybind. Clicking the label or its keybind applies the label.
                        </div>

                        <div className="instructions-area-comment" style={{top: "53%", left: "1%"}}>
                            If an element has been labelled, the color of its label will be shown next to its name.
                        </div>

                        <div className="instructions-area-comment" style={{top: "2%", right: "17%"}}>
                            When applying a label, its color will briefly be shown in this circle.
                        </div>
                        
                    </div>
                </div>
            </div>}
        </div>
    )
}

export default Guide