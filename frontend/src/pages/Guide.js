import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"
import { LAYERS } from "../layers";
import TitleSetter from "../components/minor/TitleSetter";
import { Helmet } from "react-helmet";

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

    const SUPPORTED_LAYERS = Object.values(LAYERS).map(layer => [layer.name, layer.color, layer.link]);

    function externalLink(link) {
        const URL = link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (<>
        <Helmet>
            <meta
            name="description"
            content="Learn how to use Dalinar to create datasets, train machine learning models, and explore AI tools — all without coding. Step-by-step guides and best practices to help you succeed."
            />
        </Helmet>
        <div className="guide-container" ref={containerRef}>
            
            <TitleSetter title="Dalinar | Guide" />
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
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "dataset-loading" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("dataset-loading")}>
                        Loading Datasets
                    </div>
                <div className="guide-toolbar-element">
                    Models
                </div>
                    <div className={"guide-toolbar-subelement " + (currentInstructions == "model" ? "guide-toolbar-element-selected": "")}
                    onClick={() => setCurrentInstructions("model")}>
                        Model Overview
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
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginTop: "20px" }}>
                            <iframe
                                src="https://www.youtube.com/embed/tQ2lUxumQV4"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Embedded YouTube"
                                style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%"
                                }}
                            ></iframe>
                        </div>
                    </div>

                    <div className="instructions-container">
                        <p className="guide-subheader" id="datasets">Datasets</p>
                        <p className="instructions-text">
                            Users are able to create both area and classification datasets. Dalinar currently supports both images and text.
                            Elements are listed to the left with labels and areas, if applicable, to the right.
                        </p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/examplePage.jpg"} alt="Example page" style={{height: "505px"}} />
                        
                        <p className="guide-subheader" id="models">Models</p>
                        <p className="instructions-text">
                            Models consist of multiple ordered layers of different types, such as Dense and Conv2D.
                            These all have different parameters that can be tailored to your needs.
                            Once you've construct a model it must be built (i.e. compiled) and can then be trained or exported. 
                        </p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/examplePageModel.jpg"} alt="Example model page" style={{height: "505px"}} />
                        <p className="instructions-text">
                            Please see the more detailed pages for further explanations.
                        </p>
                    </div>
                </div>}
                
                {/* LOADING DATASETS */}
                {currentInstructions == "dataset-loading" && <div className="guide-main">

                    <div className="instructions-header">
                        <h1 className="instructions-title">Loading Datasets</h1>
                        <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for TensorFlow and Pytorch.
                            Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                        </p>
                    </div>
                    <div className="instructions-container">
                        <div className="download-instructions-element" id="folders-as-labels">
                            <h1 className="download-instructions-title">Folders as labels</h1>

                            <div className="download-frameworks-container download-frameworks-instructions">
                                <div onClick={() => setDownloadFramework1("tensorflow")} 
                                    className="download-framework">
                                        <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework1 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")} alt="TensorFlow" />
                                        <span className={downloadFramework1 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                    </div>
                                <div onClick={() => setDownloadFramework1("pytorch")} className="download-framework" >
                                    <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework1 == "pytorch" ? "pytorch.png": "pytorchGray.png")} alt="Pytorch" />
                                    <span className={downloadFramework1 == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                                </div>
                            </div>

                            <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework1} downloadType="folders" BACKEND_URL={BACKEND_URL}/>
                        </div>

                        <div className="download-instructions-element" id="filenames-as-labels">
                            <h1 className="download-instructions-title">Filenames as labels</h1>

                            <div className="download-frameworks-container download-frameworks-instructions">
                                <div onClick={() => setDownloadFramework2("tensorflow")} 
                                    className="download-framework">
                                        <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework2 == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")} alt="TensorFlow"/>
                                        <span className={downloadFramework2 == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                                    </div>
                                <div onClick={() => setDownloadFramework2("pytorch")} className="download-framework" >
                                    <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework2 == "pytorch" ? "pytorch.png": "pytorchGray.png")} alt="Pytorch" />
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
                        <img className="guide-image" src={BACKEND_URL + "/static/images/exampleClassification.jpg"} style={{height: "505px"}} alt="Example classification" />

                        <p className="guide-subheader" id="labelling">Labelling</p>
                        <p className="instructions-text">
                            To label an element you must first select it. This can be done by clicking it in the list of elements to the left, or by scrolling through the elements with arrow keys.
                            The element can then be labelled by clicking on the desired label or pressing the keybind assigned to this label.
                            For labelled elements, the label will be displayed at the top right corner of the display.
                        </p>

                        <p className="guide-subheader" id="downloading">Downloading</p>
                        <p className="instructions-text">
                            There are two different formats for downloading image classification datasets, with an additional format for text datasets.
                            The first format is labels as folders. Each label will have a dedicated folder, with elements (files) belonging to that label placed within it.
                            The second format is filenames as labels, where elements are saved with names according to the format {"{label}_{idx}.{file extension}"}.
                            The third format, which is only supported for text datasets, is as a .csv file. Label names will be placed in the first row, and text in the second. Each row represents an element.
                        </p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/dataset-download.jpg"} style={{height: "394px"}} alt="Dataset download" />
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
                        <img className="guide-image" src={BACKEND_URL + "/static/images/examplePage.jpg"} style={{height: "505px"}} alt="Example page" />

                        <p className="guide-subheader" id="area-creation">Area Creation</p>
                        <p className="instructions-text">
                            To create an area, first select a label by clicking it or pressing its keybind. You can then create points by clicking on the image.
                            Areas will appear in the list beneath labels, and can then be selected and edited by pressing them.
                            Added points can be selected by clicking on them, and can then be moved or deleted (by pressing Delete or Backspace).
                        </p>

                        <p className="guide-subheader" id="downloading">Downloading</p>
                        <p className="instructions-text">
                            For area datasets only one download format is supported. This will save the dataset's elements in one folder, with an additional .json file which contains the areas corresponding to each element.
                        </p>
                    </div>
                    
                </div>}

                {currentInstructions == "model" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Overview</h1>
                        <p className="instructions-text">
                            Models consist of several different layers, all of which have different types of parameters.
                            They can either be image models or text models, which will determine which types of datasets are shown when e.g. training or evaluating.
                            Added layers are displayed in the toolbar to the left as well as the main display. Once a model is created or changed, it must be built before it can be trained, downloaded, etc. (see the section on Building).
                        </p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/examplePageModel.jpg"} style={{height: "505px"}} alt="Example page model" />
                    </div>

                    <div className="instructions-container">
                        
                        <p className="guide-subheader" id="downloading">Downloading</p>
                        <p className="instructions-text">
                            Built models can be downloaded as either .h5 or .keras files. These can then be loaded outside of Dalinar, or uploaded when creating a new model in order to create a copy (this can also be done by clicking the Copy button).
                        </p>
                        <div className="guide-center">
                            <img className="guide-image" src={BACKEND_URL + "/static/images/model-download.jpg"} style={{width: "455px", height: "564px"}} alt="Model download" />
                        </div>
                        
                    </div>
                    
                </div>}

                {currentInstructions == "model-layers" && <div className="guide-main">
                    <div className="instructions-header">
                        <h1 className="instructions-title">Model Layers</h1>
                        <p className="instructions-text">
                            Dalinar currently supports the layers listed below (click for more detailed descriptions). Note that some of these are exclusive to either Image or Text models.
                        </p>
                    </div>
                    <div className="instructions-container">
                        <div className="supported-layers-container">
                            {SUPPORTED_LAYERS.map((layer, idx) => (
                                <div className="supported-layer" key={idx} onClick={() => externalLink((layer[2] ? layer[2] : "https://www.tensorflow.org/api_docs/python/tf/keras/layers/" + layer[0]))}>
                                    <span className={"supported-layer-color layer-element-stat-" + layer[1]}></span>
                                    {layer[0]}
                                </div>
                            ))}
                        </div>
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
                        <div className="guide-center">
                            <img className="guide-image" src={BACKEND_URL + "/static/images/layer-element.jpg"} style={{width: "303px", height: "500px"}} alt="Layer element" />
                        </div>
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
                        </p>
                        <div className="guide-center">
                            <img className="guide-image" src={BACKEND_URL + "/static/images/build-model.jpg"} style={{width: "592px", height: "632px"}} alt="Build model" />
                        </div>
                    </div>

                    <div className="instructions-container">
                        <p className="guide-subheader" id="building-updates">Reflecting Updates</p>
                        <p className="instructions-text">
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
                            
                        </p>
                        <div className="guide-center">
                            <img className="guide-image" src={BACKEND_URL + "/static/images/build-model.jpg"} style={{width: "600px", height: "658px"}} alt="Build model" />
                        </div>
                    </div>

                    <div className="instructions-container">
                        <p className="guide-subheader" id="compiling-updates">Reflecting Updates</p>
                        <p className="instructions-text">
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
                        </p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/train-model.jpg"} style={{height: "678px"}} alt="Train model" />
                    </div>

                    <div className="instructions-container">
                        <p className="guide-subheader" id="training-metrics">Training Metrics</p>
                        <p className="instructions-text">Metrics, i.e. loss and accuracy for the different epochs of training, from the last dataset the model was trained on can be viewed by clicking Show metrics in the main view.</p>
                        <img className="guide-image" src={BACKEND_URL + "/static/images/model-metrics.jpg"} alt="Model metrics" />
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
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("downloading").scrollIntoView({behavior: "smooth"});}}>
                    Downloading
                </div>
            </div>}
            {currentInstructions == "dataset-area" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("area-creation").scrollIntoView({behavior: "smooth"});}}>
                    Area creation
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("downloading").scrollIntoView({behavior: "smooth"});}}>
                    Downloading
                </div>
            </div>}
            {currentInstructions == "dataset-loading" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("folders-as-labels").scrollIntoView({behavior: "smooth"});}}>
                    Folders as labels
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("filenames-as-labels").scrollIntoView({behavior: "smooth"});}}>
                    Filenames as labels
                </div>
            </div>}

            {currentInstructions == "model" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("downloading").scrollIntoView({behavior: "smooth"});}}>
                    Downloading
                </div>
            </div>}

            {currentInstructions == "model-layers" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("ordering-layers").scrollIntoView({behavior: "smooth"});}}>
                    Ordering layers
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("layer-properties").scrollIntoView({behavior: "smooth"});}}>
                    Layer properties
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("layer-update").scrollIntoView({behavior: "smooth"});}}>
                    Updating layers
                </div>
            </div>}

            {currentInstructions == "model-building" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("building-updates").scrollIntoView({behavior: "smooth"});}}>
                    Reflecting updates
                </div>
            </div>}

            {currentInstructions == "model-compiling" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("compiling-updates").scrollIntoView({behavior: "smooth"});}}>
                    Reflecting updates
                </div>

            </div>}

            {currentInstructions == "model-training" && <div className="guide-toolbar-right">
                <div className="guide-toolbar-element-right">
                    On this page
                </div>
                <div className="guide-toolbar-subelement-right" onClick={() => {document.getElementById("training-metrics").scrollIntoView({behavior: "smooth"});}}>
                    Training metrics
                </div>
            </div>}
        </div>
    </>)
}

export default Guide