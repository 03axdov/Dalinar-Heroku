import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CreateLayerPopup from "../popups/CreateLayerPopup";
import LayerElement from "../components/LayerElement";
import BuildModelPopup from "../popups/BuildModelPopup";
import ModelDownloadPopup from "../popups/ModelDownloadPopup";
import TrainModelPopup from "../popups/TrainModelPopup"
import EvaluateModelPopup from "../popups/EvaluateModelPopup";
import PredictionPopup from "../popups/PredictionPopup";


// The default page. Login not required.
function Model({currentProfile, activateConfirmPopup, notification, BACKEND_URL}) {

    const { id } = useParams();
    const [model, setModel] = useState(null)
    const [layers, setLayers] = useState([])

    const [loading, setLoading] = useState(true)
    const [processingBuildModel, setProcessingBuildModel] = useState(false)
    const [processingCreateLayer, setProcessingCreateLayer] = useState(false)
    const [processingRecompile, setProcessingRecompile] = useState(false)

    const [showCreateLayerPopup, setShowCreateLayerPopup] = useState(false)
    const [showBuildModelPopup, setShowBuildModelPopup] = useState(false)
    const [showDownloadPopup, setShowDownloadPopup] = useState(false)
    const [showTrainModelPopup, setShowTrainModelPopup] = useState(false)
    const [showEvaluateModelPopup, setShowEvaluateModelPopup] = useState(false)
    const [showPredictionPopup, setShowPredictionPopup] = useState(false)

    const [downloading, setDownloading] = useState(false)
    const [isDownloaded, setIsDownloaded] = useState(false)

    

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

    // For scrolling by grabbing
    const [mouseOnLayer, setMouseOnLayer] = useState(false)
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        if (mouseOnLayer || e.button===1) {return}
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1; // Adjust speed by changing multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };
    
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);

    const descriptionContainerRef = useRef(null)

    const navigate = useNavigate()

    // Used to map layer types to colors in sidebar
    const typeToColor = {
        "dense": "purple",
        "conv2d": "lightblue",
        "maxpool2d": "pink2",
        "flatten": "pink",
        "dropout": "blue",
        "rescaling": "darkblue",
        "randomflip": "cyan",
        "resizing": "green"
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

    let buildResInterval = null;
    function buildModel(optimizer, loss) {

        if (processingBuildModel) {return}
        setProcessingBuildModel(true)

        const URL = window.location.origin + '/api/build-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id,
            "optimizer": optimizer,
            "loss": loss,
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((res) => {
            buildResInterval = setInterval(() => getBuildRes(res.data["task_id"]), 2000)
        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        })
    }

    let buildResOutstanding = 0;
    function getBuildRes(id) {
        if (buildResOutstanding > 0) return;
        buildResOutstanding += 1
        axios({
            method: 'GET',
            url: window.location.origin + '/api/task-result/' + id,
        })
        .then((res) => {
            if (res.data["status"] != "in progress") {
                clearInterval(buildResInterval)

                if (res.data["status"] != "failed") {
                    notification("Successfully built model.", "success")
                    getModel()
                } else {
                    notification("Building failed.", "failure")
                }

                setProcessingBuildModel(false)
                setShowBuildModelPopup(false)

            }
        })
        .catch(error => console.error("Error fetching result:", error))
        .finally(() => {
            buildResOutstanding -= 1
        });
    }

    let recompileResInterval = null;
    function recompileModel(optimizer, loss) {

        if (processingRecompile) {return}
        setProcessingRecompile(true)

        const URL = window.location.origin + '/api/recompile-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id,
            "optimizer": optimizer,
            "loss": loss,
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((res) => {
            recompileResInterval = setInterval(() => getRecompileRes(res.data["task_id"]), 2000)
        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        })
    }

    let recompileResOutstanding = 0;
    function getRecompileRes(id) {
        if (recompileResOutstanding > 0) return;
        recompileResOutstanding += 1
        axios({
            method: 'GET',
            url: window.location.origin + '/api/task-result/' + id,
        })
        .then((res) => {
            if (res.data["status"] != "in progress") {
                clearInterval(recompileResInterval)

                if (res.data["status"] != "failed") {
                    notification("Successfully recompiled model.", "success")
                    getModel()
                } else {
                    notification("Recompilation failed.", "failure")
                }

                setProcessingRecompile(false)
                setShowBuildModelPopup(false)

            }
        })
        .catch(error => console.error("Error fetching result:", error))
        .finally(() => {
            recompileResOutstanding -= 1
        });
    }

    function downloadModel(e, format, filename) {
        if (!model.model_file) {
            notification("Model has not been built.", "failure")
            return
        }
        setDownloading(true)
        downloadModelFile(format, filename)
    }

    const downloadModelFile = async (format, filename) => {
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
          a.download = filename + format
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          setDownloading(false)
          setIsDownloaded(true)
          setShowDownloadPopup(true)
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
            return "Dense - " + layer.nodes_count + (layer.input_x ? " (" + layer.input_x + ")" : "")
        } else if (type == "conv2d") {
            return "Conv2D - (" + layer.filters + ", " + layer.kernel_size + ")"
        } else if (type == "maxpool2d") {
            return "MaxPool2D - " + layer.pool_size
        } else if (type == "flatten") {
            return "Flatten" + (layer.input_x ? " - (" + layer.input_x + ", " + layer.input_y + ")" : "")
        } else if (type == "dropout") {
            return "Dropout (" + layer.rate + ")"
        } else if (type == "rescaling") {
            return "Rescale (" + layer.scale + ", " + layer.offset + ")"
        } else if (type == "randomflip") {
            return "RandomFlip (" + layer.mode + ")"
        } else if (type == "resizing") {
            return "Resizing (" + layer.input_x + ", " + layer.input_y + ")"
        }
    }

    const layersHandleDragEnd = (result) => {
        if (!result.destination) return; // Dropped outside
    
        const reorderLayers = [...layers];
        const [movedItem] = reorderLayers.splice(result.source.index, 1);
        reorderLayers.splice(result.destination.index, 0, movedItem);
        setLayers(reorderLayers);

        let idToIdx = {}

        for (let i=0; i < reorderLayers.length; i++) {
            idToIdx[reorderLayers[i].id] = i
        }
        
        // For updating the order, so it stays the same after refresh
        const URL = window.location.origin + '/api/reorder-model-layers/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id,
            "order": idToIdx
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((data) => {

        }).catch((error) => {
            notification("Error: " + error, "failure")
            
        })
    };

    function createLayer(data) {
        setProcessingCreateLayer(true)

        data["model"] = model.id
        
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    
        
        const URL = window.location.origin + '/api/create-layer/'
        const config = {headers: {'Content-Type': 'application/json'}}

        axios.post(URL, data, config)
        .then((data) => {
            notification("Successfully created layer.", "success")
            
            getModel()
            
            setShowCreateLayerPopup(false)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setProcessingCreateLayer(false)
        })
    }

    function deleteLayerInner(id) {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "layer": id
        }

        const URL = window.location.origin + '/api/delete-layer/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setLoading(true)
        axios.post(URL, data, config)
        .then((data) => {

            getModel()

            notification("Successfully deleted layer.", "success")

        }).catch((error) => {
            notification("Error: " + error + ".")

        }).finally(() => {
            setLoading(false)
        })
    }

    function deleteLayer(id) {
        activateConfirmPopup("Are you sure you want to delete this layer? This action cannot be undone.", () => deleteLayerInner(id))
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

            {showPredictionPopup && <PredictionPopup setShowPredictionPopup={setShowPredictionPopup}
            model={model}
            BACKEND_URL={BACKEND_URL}
            notification={notification}>
            </PredictionPopup>}

            {showTrainModelPopup && <TrainModelPopup setShowTrainModelPopup={setShowTrainModelPopup} 
            currentProfile={currentProfile} 
            BACKEND_URL={BACKEND_URL}
            model_id={model.id}
            model_type={model.model_type.toLowerCase()}
            notification={notification}
            activateConfirmPopup={activateConfirmPopup}
            getModel={getModel}>
            </TrainModelPopup>}

            {showEvaluateModelPopup && <EvaluateModelPopup setShowEvaluateModelPopup={setShowEvaluateModelPopup} 
            currentProfile={currentProfile} 
            BACKEND_URL={BACKEND_URL}
            model_id={model.id}
            model_type={model.model_type.toLowerCase()}
            notification={notification}
            activateConfirmPopup={activateConfirmPopup}>
            </EvaluateModelPopup>}

            {showDownloadPopup && <ModelDownloadPopup setShowDownloadPopup={setShowDownloadPopup} 
                model={model}
                downloadModel={downloadModel}
                isDownloading={downloading}
                isDownloaded={isDownloaded} 
                setIsDownloaded={setIsDownloaded} 
                BACKEND_URL={BACKEND_URL}>
            </ModelDownloadPopup>}

            {showBuildModelPopup && <BuildModelPopup 
                setShowBuildModelPopup={setShowBuildModelPopup} 
                buildModel={buildModel}
                processingBuildModel={processingBuildModel}
                BACKEND_URL={BACKEND_URL}
                isBuilt={model.model_file != null}
                recompileModel={recompileModel}
                processingRecompile={processingRecompile}
                activateConfirmPopup={activateConfirmPopup}></BuildModelPopup>}

            {showCreateLayerPopup && <CreateLayerPopup BACKEND_URL={BACKEND_URL}
                                                    onSubmit={createLayer} 
                                                    setShowCreateLayerPopup={setShowCreateLayerPopup}
                                                    processingCreateLayer={processingCreateLayer}
                                                    notification={notification}></CreateLayerPopup>}

            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className="model-toolbar-left-inner">
                    <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Layers</p>

                    <div className="dataset-sidebar-button-container">
                        <button type="button" 
                        className={"sidebar-button dataset-upload-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                        title="Add layer"
                        onClick={() => setShowCreateLayerPopup(true)}>
                            <img className={"dataset-upload-button-icon " + (toolbarLeftWidth < 150 ? "model-upload-button-icon-small" : "")} src={BACKEND_URL + "/static/images/plus.png"} />
                            <span>Add layer</span>
                        </button>
                    </div>

                    
                    <DragDropContext className="dataset-elements-list" onDragEnd={layersHandleDragEnd}>
                        <Droppable droppableId="models-droppable">
                            
                        {(provided) => (<div className="model-layers-list"
                        {...provided.droppableProps}
                        ref={provided.innerRef}>
                            {layers.map((layer, idx) => (
                                <Draggable key={layer.id} draggableId={"" + layer.id} index={idx}>
                                    {(provided) => (<div className="model-sidebar-layer"
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{...provided.draggableProps.style}}
                                    ref={provided.innerRef}
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

                                        <img title="Delete layer" className="model-sidebar-delete" onClick={(e) => {
                                            e.stopPropagation()
                                            deleteLayer(layer.id)
                                        }} src={BACKEND_URL + "/static/images/cross.svg"} />
                                    </div>)}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            </div>)}
                                                        
                        </Droppable>
                    </DragDropContext>
                    
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

                        {model && <button type="button" title="Edit model" className="model-title-button" onClick={() => {
                            navigate("/edit-model/" + model.id + "?expanded=true")
                        }}>
                            <img className="model-title-edit-icon" src={BACKEND_URL + "/static/images/edit.png"}/>
                            Edit model
                        </button>}

                        {model && <button type="button" 
                        title="Build model" 
                        className="model-build-button" 
                        onClick={() => {
                            setShowBuildModelPopup(true)
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/build.svg"} />
                            {model.model_file ? "Rebuild" : "Build"}
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? "Train model" : "Model not yet built."}
                        className={"model-evaluate-button no-margin-right " + (model.model_file ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file) {
                              setShowTrainModelPopup(true)  
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/lightbulb.svg"} />
                            Train
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (model.trained_on ? "Predict" : "Model not yet trained or trained on unknown dataset.") : "Model not yet built."}
                        className={"model-evaluate-button no-margin-right " + ((model.model_file && model.trained_on) ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file && model.trained_on) {
                                setShowPredictionPopup(true)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/prediction.svg"} />
                            Predict
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (model.trained_on ? "Evaluate model" : "Model not yet trained or trained on unknown dataset.") : "Model not yet built."}
                        className={"model-evaluate-button " + ((model.model_file && model.trained_on) ? "" : "model-button-disabled")}
                        onClick={() => {
                            if ((model.model_file && model.trained_on)) {
                                setShowEvaluateModelPopup(true)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/evaluate.svg"} />
                            Evaluate
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? "Create copy" : "Model not yet built."}
                        className={"model-build-button model-copy-button " + (model.model_file ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file) {
                                navigate("/create-model?copy=" + model.id)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/copy.png"} />
                            Copy
                        </button>}

                        {model && <button style={{marginLeft: 0}} className={"model-download-button model-download-button " + (model.model_file ? "" : "model-button-disabled")} 
                        title={model.model_file ? "Download model" : "You must build the model before downloading it."}
                        onClick={() => setShowDownloadPopup(true)}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/download.svg"}/>
                            Download
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

                            {(model.trained_on || model.trained_on_tensorflow) && <div className="model-description-trained">
                                <p className="dataset-description-text trained-on-text dataset-description-start">Last trained on:</p>
                                <div className="trained-on-container">
                                    {model.trained_on && <div className="trained-on-element" onClick={() => {
                                        const URL = window.location.origin + "/datasets/" + (model.trained_on.visibility == "public" ? "public/" : "") + model.trained_on.id
                                        var win = window.open(URL, '_blank');
                                        win.focus();
                                    }}>
                                        {model.trained_on.name} - {Math.round(10**6 * model.trained_accuracy) / 10**4 + "%"} accuracy
                                        <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} />
                                    </div>}

                                    {model.trained_on_tensorflow && <div className="trained-on-element" onClick={() => {
                                        const URL = "https://www.tensorflow.org/api_docs/python/tf/keras/datasets/" + model.trained_on_tensorflow + "/load_data"
                                        var win = window.open(URL, '_blank');
                                        win.focus();
                                    }}>
                                        <img className="trained-on-tensorflow-icon" src={BACKEND_URL + "/static/images/tensorflowWhite.png"} />
                                        {model.trained_on_tensorflow} - {Math.round(10**6 * model.trained_accuracy) / 10**4 + "%"} accuracy
                                        <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} />
                                    </div>}
                                </div>
                            </div>}

                            {(model.evaluated_on || model.evaluated_on_tensorflow) && <div className="model-description-trained">
                                <p className="dataset-description-text trained-on-text dataset-description-start">Evaluated on:</p>
                                <div className="trained-on-container">

                                    {model.evaluated_on && <div className="trained-on-element" onClick={() => {
                                        const URL = window.location.origin + "/datasets/" + (model.evaluated_on.visibility == "public" ? "public/" : "") + model.evaluated_on.id
                                        var win = window.open(URL, '_blank');
                                        win.focus();
                                    }}>
                                        {model.evaluated_on.name} - {Math.round(10**6 * model.evaluated_accuracy) / 10**4 + "%"} accuracy
                                        <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} />
                                    </div>}

                                    {model.evaluated_on_tensorflow && <div className="trained-on-element" onClick={() => {
                                        const URL = "https://www.tensorflow.org/api_docs/python/tf/keras/datasets/" + model.evaluated_on_tensorflow + "/load_data"
                                        var win = window.open(URL, '_blank');
                                        win.focus();
                                    }}>
                                        <img className="trained-on-tensorflow-icon" src={BACKEND_URL + "/static/images/tensorflowWhite.png"} />
                                        {model.evaluated_on_tensorflow} - {Math.round(10**6 * model.evaluated_accuracy) / 10**4 + "%"} accuracy
                                        <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} />
                                    </div>}

                                </div>
                            </div>}

                            <p className="dataset-description-text"><span className="dataset-description-start">Type: </span>{model.model_type}</p>

                            {model.optimizer && <p className="dataset-description-text"><span className="dataset-description-start">Optimizer: </span>{model.optimizer}</p>}
                            {model.loss_function && <p className="dataset-description-text"><span className="dataset-description-start">Loss function: </span>{model.loss_function}</p>}

                            <p className="dataset-description-text"><span className="dataset-description-start">Owner: </span>{model.ownername}</p>

                            <p className="dataset-description-text dataset-description-description dataset-description-text-margin">{(model.description || "This model does not have a description.")}</p>

                            <button className="hide-description-button" 
                            onClick={() => {setShowModelDescription(false)}}
                            style={{marginTop: "auto"}}>
                                <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/minus.png"} />
                                Hide description
                            </button>
                        </div>

                    </div>}

                    {!showModelDescription && <DragDropContext className="model-layers-container-outer" onDragEnd={layersHandleDragEnd}>
                        <Droppable droppableId="models-droppable" direction="horizontal">
                        {(provided) => (<div className="model-layers-container"
                        {...provided.droppableProps}
                        ref={(el) => {
                            scrollRef.current = el
                            provided.innerRef(el)
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        >
                            {layers.map((layer, idx) => (<Draggable key={layer.id} draggableId={"" + layer.id} index={idx} >
                                    {(provided) => (<LayerElement BACKEND_URL={BACKEND_URL} 
                                        layer={layer} 
                                        hoveredLayer={hoveredLayer} 
                                        deleteLayer={deleteLayer}
                                        layers={layers}
                                        setLayers={setLayers}
                                        notification={notification}
                                        prevLayer={(idx > 0 ? layers[idx - 1] : null)}
                                        warnings={warnings}
                                        setWarnings={setWarnings}
                                        provided={provided}
                                        updateWarnings={updateWarnings}
                                        idx={idx}
                                        onMouseEnter={() => setMouseOnLayer(true)}
                                        onMouseLeave={() => setMouseOnLayer(false)}>

                                    </LayerElement>)}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {!loading && layers.length == 0 && <div className="no-layers-container">
                                This model does not have any layers.
                                <button type="button" 
                                className="sidebar-button dataset-upload-button"
                                title="Add layer"
                                style={{marginTop: "20px"}}
                                onClick={() => setShowCreateLayerPopup(true)}>
                                    <img className="dataset-upload-button-icon" src={BACKEND_URL + "/static/images/plus.png"} />
                                    <span>Add layer</span>
                                </button>
                            </div>}
                        </div>)}
                        </Droppable>
                    </DragDropContext>}

                    
                    
                </div>
            </div>
        </div>
    )

    
}

export default Model