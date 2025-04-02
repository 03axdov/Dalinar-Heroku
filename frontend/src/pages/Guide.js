import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"
import { LAYERS } from "../layers";

// The default page. Login not required.
function Guide({BACKEND_URL}) {
    
    const [currentInstructions, setCurrentInstructions] = useState("start")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")
    const [downloadFramework2, setDownloadFramework2] = useState("tensorflow")

    const containerRef = useRef(null)

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0
        }
    }, [currentInstructions])

    const SUPPORTED_LAYERS = Object.values(LAYERS).map(layer => [layer.name, layer.color]);

    function externalLink(link) {
        const URL = link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <div className="guide-container" ref={containerRef}>
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

                    <div className="instructions-container">
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
                        <p className="instructions-text">
                            Please see the more detailed pages for further explanations.
                        </p>
                    </div>
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
                        <p className="instructions-text">
                            Classification datasets consist of elements and labels. Elements can be either text or images. Each element can be assigned to one label, i.e. multiple elements can belong to the same label.
                            When creating a label, you must specify a name and a color that will identify it, as well as (optionally) a keybind that will be used for labelling.
                        </p>
                    </div>

                    <div className="instructions-container">
                        <img className="guide-image" src={BACKEND_URL + "/static/images/exampleClassification.jpg"} style={{height: "430px"}} />

                        <p className="guide-subheader" id="labelling">Labelling</p>
                        <p className="instructions-text">
                            To label an element you must first select it. This can be done by clicking it in the list of elements to the left, or by scrolling through the elements with arrow keys.
                            The element can then be labelled by clicking on the desired label or pressing the keybind assigned to this label.
                        </p>
                    </div>
                    
                </div>}

                {currentInstructions == "dataset-area" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Area Datasets</h1>
                        <p className="instructions-text">
                            Area datasets consist of elements, labels, and areas. Only image elements are supported for Area Datasets. Areas can be added to elements, with each area belonging to (or identifying) one label.
                            When creating a label, you must specify a name and a color that will identify it, as well as (optionally) a keybind that will be used for labelling.
                            Areas consist of an arbitrary number of points placed throughout the image, and an element can be assigned multiple areas belonging to the same or different labels.
                        </p>
                    </div>

                    <div className="instructions-container">
                        <img className="guide-image" src={BACKEND_URL + "/static/images/examplePage.jpg"} style={{height: "430px"}} />

                        <p className="guide-subheader" id="area-creation">Area Creation</p>
                        <p className="instructions-text">
                            To create an area, first select a label by clicking it or pressing its keybind. You can then create points by clicking on the image.
                            Areas will appear in the list beneath labels, and can then be selected and edited by pressing them.
                            Added points can be selected by clicking on them, and can then be moved or deleted (by pressing Delete or Backspace).
                        </p>
                    </div>
                    
                </div>}

                {currentInstructions == "model-layers" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Layers</h1>
                        <p className="instructions-text">
                            Models consist of several different layers, all of which have different types of parameters. Dalinar currently supports the following layers (click for more detailed descriptions):
                        </p>
                    </div>
                    <div className="instructions-container">
                        <div className="supported-layers-container">
                            {SUPPORTED_LAYERS.map((layer, idx) => (
                                <div className="supported-layer" key={idx} onClick={() => externalLink("https://www.tensorflow.org/api_docs/python/tf/keras/layers/" + layer[0])}>
                                    <span className={"supported-layer-color layer-element-stat-" + layer[1]}></span>
                                    {layer[0]}
                                </div>
                            ))}
                        </div>
                        <p className="instructions-text">
                            Note that some of these are exclusive to either Image or Text models.
                        </p>
                        <p className="guide-subheader" id="ordering-layers">Ordering Layers</p>
                        <p className="instructions-text">
                            The order of layers is of great importance; some layers can only follow certain other layers (or can only be the first layer).
                            Warnings will appear for invalid layer combinations.
                            Layers can be reordered either by dragging the elements in the sidebar to the left, or by dragging the layer elements displayed in the main view while clicking the Drag icon.
                        </p>
                        <p className="guide-subheader" id="layer-properties">Layer Properties</p>
                        <p className="instructions-text">
                            Different layer types have different parameters. Dense layers, for example, have a parameter for the Number of nodes.
                            There are some parameters multiple layers have in common, such as the activation function.
                            Furthermore, for most layers the input dimensions can be specified, though it's optional for all but the first layer.
                            The parameter Trainable can be specified for all layers with weights. If set to false, the layer will not be updated while training.
                        </p>
                        <p className="guide-subheader" id="layer-update">Updating Layers</p>
                        <p className="instructions-text">
                            Created layers can be easily updated by changing parameters and clicking Save changes.
                            It is important to note that this will not immediately update the model itself. See the section on Building for further information.
                            If you want to reset changes made to a layer since the last build, press Revert to build. Note that this will (after an additional prompt) delete the layer if it was not in the last build.
                            All layers have a property called Update on build. If this is set to false, changes to this layer will not be reflected in builds.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-building" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Building</h1>
                        <p className="instructions-text">
                            Building the model is necessary in order to unlock functionality such as training, evaluation, predicting, and downloading.
                            Building the model creates a model file based on the current layers and compiles this file according to specified optimizer and loss function.
                            Changes made between builds will only be reflected in functionality such as training once the model is rebuilt.
                            It is important to note that rebuilding a model will reset all weights of layers that have Update on build set to true, i.e. trained layers will become untrained.
                            If you only want to update the optimizer, loss function, or whether certain layers are trainable see the section on Model Compiling.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-compiling" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Compiling</h1>
                        <p className="instructions-text">
                            Built models can be recompiled in the same popup where they can be rebuilt. Recompiling will compile the model file with the specified optimizer and loss function.
                            Unlike rebuilding this will not reset the weights of any layers.
                            Furthermore, recompiling will reflect changes in the Trainable parameter which can be specified for all layers with weights.
                        </p>
                    </div>
                </div>}

                {currentInstructions == "model-training" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Training</h1>
                        <p className="instructions-text">
                            Built models, see the section on Building, can be trained on any of your own datasets or any datasets you've saved, so long as the type of dataset aligns with that of the model.
                            Metrics, i.e. loss and accuracy, from the last dataset the model was trained on can be viewed by clicking Show metrics in the main view.
                        </p>
                    </div>
                </div>}
            </div>

            {currentInstructions == "start" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("datasets").scrollIntoView({behavior: "smooth"});}}>
                    Datasets
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("models").scrollIntoView({behavior: "smooth"});}}>
                    Models
                </div>
            </div>}
            {currentInstructions == "dataset-classification" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("labelling").scrollIntoView({behavior: "smooth"});}}>
                    Labelling
                </div>
            </div>}
            {currentInstructions == "dataset-area" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("area-creation").scrollIntoView({behavior: "smooth"});}}>
                    Area Creation
                </div>
            </div>}

            {currentInstructions == "model-layers" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("ordering-layers").scrollIntoView({behavior: "smooth"});}}>
                    Ordering Layers
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("layer-properties").scrollIntoView({behavior: "smooth"});}}>
                    Layer Properties
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("layer-update").scrollIntoView({behavior: "smooth"});}}>
                    Updating Layers
                </div>
            </div>}
        </div>
    )
}

export default Guide