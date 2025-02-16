import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CreateLayerPopup from "../components/CreateLayerPopup";
import LayerElement from "../components/LayerElement";
import BuildModelPopup from "../components/BuildModelPopup";
import ModelDownloadPopup from "../components/ModelDownloadPopup";


// The default page. Login not required.
function PublicModel({currentProfile, activateConfirmPopup, notification, BACKEND_URL}) {

    const { id } = useParams();
    const [model, setModel] = useState(null)
    const [layers, setLayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingBuildModel, setProcessingBuildModel] = useState(false)

    const [showCreateLayerPopup, setShowCreateLayerPopup] = useState(false)
    const [showBuildModelPopup, setShowBuildModelPopup] = useState(false)
    const [showAfterDownloadPopup, setShowAfterDownloadPopup] = useState(false)

    const [downloading, setDownloading] = useState(false)

    const [processingCreateLayer, setProcessingCreateLayer] = useState(false)

    const [showModelDescription, setShowModelDescription] = useState(false)
    const pageRef = useRef(null)
    const [descriptionWidth, setDescriptionWidth] = useState(45)    // As percentage

    const [toolbarLeftWidth, setToolbarLeftWidth] = useState(185)   // In pixels
    const [toolbarMainHeight, setToolbarMainHeight] = useState(50)

    const [hoveredLayerTimeout, setHoveredLayerTimeout] = useState(null)
    const [hoveredLayer, setHoveredLayer] = useState(null)  // id of hovered layer

    const [warnings, setWarnings] = useState(false)
    const [updateWarnings, setUpdateWarnings] = useState(false)

    const [cursor, setCursor] = useState("")

    const descriptionContainerRef = useRef(null)

    const navigate = useNavigate()

    // Used to map layer types to colors in sidebar
    const typeToColor = {
        "dense": "purple",
        "conv2d": "lightblue",
        "maxpool2d": "pink2",
        "flatten": "pink",
        "dropout": "blue"
    }

    useEffect(() => {
        getModel()
    }, [])

    useEffect(() => {
        setWarnings(false)
    }, [])

    useEffect(() => {
        setUpdateWarnings(!updateWarnings)
    }, [layers])

    useEffect(() => {
        if (currentProfile && model && !loading) {
            if (currentProfile.user && model.owner) {
                if (currentProfile.user != model.owner) {
                    navigate("/models/public/" + id)
                }
            }
            
        }
    }, [currentProfile, model])

    function getModel() {

        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/' + id,
        })
        .then((res) => {
            setModel(res.data)

            setLayers(res.data.layers)

            // preloadImages(res.data.elements) // Now handled by .hidden-preload
        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading model with id " + id + ".", "failure")

            console.log(err)

        }).finally(() => {
            setLoading(false)
        })
    }

    function downloadModel(e) {
        if (!model.model_file) {return}
        setDownloading(true)
        downloadModelFile()
    }

    const downloadModelFile = async () => {
        try {
          const response = await fetch(model.model_file, {
            headers: {
                'pragma': 'no-cache',
                'cache-control': 'no-cache'
            }
            });
          if (!response.ok) {
            throw new Error("Failed to fetch file");
          }
    
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = model.name + ".keras"
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          setDownloading(false)
          setShowAfterDownloadPopup(true)
        } catch (error) {
          notification("Error downloading model: " + error, "failure");
          console.log(error)
          setDownloading(false)
        }
    };
    

    // LAYER FUNCTIONALITY

    function getLayerName(layer) {
        let type = layer.layer_type
        if (type == "dense") {
            return "Dense - " + layer.nodes_count
        } else if (type == "conv2d") {
            return "Conv2D - (" + layer.filters + ", " + layer.kernel_size + ")"
        } else if (type == "maxpool2d") {
            return "MaxPool2D - " + layer.pool_size
        } else if (type == "flatten") {
            return "Flatten" + (layer.input_x ? " - (" + layer.input_x + ", " + layer.input_y + ")" : "")
        } else if (type == "dropout") {
            return "Dropout (" + layer.rate + ")"
        }
    }

    // FRONTEND FUNCTIONALITY

    const resizeLeftToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = toolbarLeftWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth + (e.clientX - startX)

          setToolbarLeftWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const resizeMainToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startY = e.clientY;
        const startHeight = toolbarMainHeight;

        setCursor("n-resize")
    
        const handleMouseMove = (e) => {
          const newHeight = startHeight + (e.clientY - startY)
        
          if (newHeight < 25) { // Hide toolbar
            setToolbarMainHeight(15)
          } else {  // Show toolbar
            setToolbarMainHeight(50)
          }
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const resizeDescriptionHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = descriptionWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth - 100 * ((e.clientX - startX) / descriptionContainerRef.current.offsetWidth);

          setDescriptionWidth(Math.max(35, Math.min(newWidth, 75)));
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    return (
        <div className="dataset-container" ref={pageRef} style={{cursor: (cursor ? cursor : "")}}>

            {showAfterDownloadPopup && <ModelDownloadPopup setShowDownloadPopup={setShowAfterDownloadPopup} BACKEND_URL={BACKEND_URL}></ModelDownloadPopup>}

            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className="model-toolbar-left-inner">
                    <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Layers</p>
                    
                    <div className="model-layers-list">
                            {layers.map((layer, idx) => (
                                <div key={idx} className="model-sidebar-layer"
                                style={{cursor: "default"}}
                                title={getLayerName(layer)}
                                onMouseEnter={() => {
                                    // Set a timeout to show the preview after 200ms
                                    const timeoutId = setTimeout(() => {
                                        setHoveredLayer(layer.id)
                                    }, 0);  // Currently no delay

                                    // Store the timeout ID so it can be cleared later
                                    setHoveredLayerTimeout(timeoutId);
                                    
                                }}
                                onMouseLeave={() => {
                                    clearTimeout(hoveredLayerTimeout);
                                    setHoveredLayer(null)
                                }}>
                                        <span className={"model-sidebar-color model-sidebar-color-" + typeToColor[layer.layer_type]}></span>

                                        <span className="model-sidebar-layer-name">
                                            {getLayerName(layer)}
                                        </span>
                                </div>
                            ))}
                            </div>
                    
                </div>
                <div className="dataset-toolbar-resizeable" onMouseDown={resizeLeftToolbarHandleMouseDown}></div>
                
            </div>

            <div className="dataset-main" style={{width: "calc(100% - " + toolbarLeftWidth + "px)"}}>
                <div className="dataset-main-toolbar-outer" style={{height: toolbarMainHeight + "px"}}>
                    <div className="dataset-main-toolbar" style={{display: (toolbarMainHeight > 25 ? "flex" : "none")}}>
                        {model && <div className="dataset-title-container unselectable" title={(!showModelDescription ? "Show description" : "Hide description")} onClick={() => {setShowModelDescription(!showModelDescription)}}>
                           
                            <img className="dataset-title-icon" src={BACKEND_URL + "/static/images/model.svg"}/>
                            
                            <p className="dataset-title">{model && model.name}</p>

                            <img className="dataset-title-expand-icon" src={BACKEND_URL + "/static/images/" + (!showModelDescription ? "plus.png" : "minus.png")} />
                        </div>}

                        {model && <button className={"model-download-button model-download-button " + (model.model_file ? "" : "model-button-disabled")} 
                        title={model.model_file ? "Download model" : "This model has not been built."}
                        onClick={downloadModel}>
                            {!downloading && <img className="model-download-icon" src={BACKEND_URL + "/static/images/download.svg"}/>}
                            {downloading && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!downloading ? "Download" : "Downloading...")}
                        </button>}

                    </div>
                    
                    <div className="dataset-main-toolbar-resize" 
                        onMouseDown={resizeMainToolbarHandleMouseDown} 
                        style={{height: (toolbarMainHeight == 15 ? "15px" : "5px")}}
                        >
                        {toolbarMainHeight == 15 && <img className="toolbar-main-dropdown" src={BACKEND_URL + "/static/images/down.svg"} />}
                    </div>
                </div>

                <div className="dataset-main-display" style={{overflow: "hidden"}}>
                    {showModelDescription && model &&<div className="dataset-description-display-container" ref={descriptionContainerRef}>
                        <div className="dataset-description-image-container" style={{width: "calc(100% - " + descriptionWidth + "%)"}}>
                            <img className="dataset-description-image" src={model.image} />
                        </div>

                        <div className="dataset-description-resize" onMouseDown={resizeDescriptionHandleMouseDown}></div>

                        <div className="dataset-description-display" style={{width: "calc(" + descriptionWidth + "%" + " - 5px)"}}>
                            <div className="dataset-description-header" title={model.name}>
                                {model.name}
                            </div>

                            <div className="model-description-stats">
                                {model.downloaders && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/download.svg"}/>
                                    {model.downloaders.length + (model.downloaders.length == 1 ? " download" : " downloads")}
                                </div>}

                                {layers && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/classification.png"}/>
                                    {layers.length + (layers.length == 1 ? " layer" : " layers")}
                                </div>}
                            </div>

                            {model.trained_on && model.trained_on.length > 0 && <div className="model-description-trained">
                                <p className="dataset-description-text trained-on-text dataset-description-start">Trained on:</p>
                                <div className="trained-on-container">
                                    {model.trained_on.map((id, idx) => (
                                        <div key={idx} className="trained-on-element" onClick={() => {
                                            const URL = window.location.origin + "/datasets/" + id
                                            var win = window.open(URL, '_blank');
                                            win.focus();
                                        }}>
                                            {model.trained_on_names[idx]}
                                            <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} />
                                        </div>
                                    ))}
                                </div>
                            </div>}

                            <p className="dataset-description-text"><span className="dataset-description-start">Owner: </span>{model.ownername}</p>

                            {(model.description ? <p className="dataset-description-text dataset-description-description dataset-description-text-margin">{model.description}</p> : "This dataset does not have a description.")}

                            <button className="hide-description-button" onClick={() => {setShowModelDescription(false)}}>Hide description</button>
                        </div>

                    </div>}

                    {!showModelDescription && <div className="model-layers-container">
                            {layers.map((layer, idx) => (<LayerElement key={idx} BACKEND_URL={BACKEND_URL} 
                                        layer={layer} 
                                        hoveredLayer={hoveredLayer} 
                                        deleteLayer={() => {}}
                                        getModel={getModel}
                                        notification={notification}
                                        prevLayer={(idx > 0 ? layers[idx - 1] : null)}
                                        setWarnings={setWarnings}
                                        provided={{
                                            draggableProps: ""
                                        }}   // Just give this object here as not draggable
                                        updateWarnings={updateWarnings}
                                        idx={idx}
                                        isPublic={true}>
                                </LayerElement>)

                            )}
                            {!loading && layers.length == 0 && <div className="no-layers-container">
                                This model does not have any layers.
                            </div>}
                        </div>
                    }
                </div>
            </div>
        </div>
    )

    
}

export default PublicModel