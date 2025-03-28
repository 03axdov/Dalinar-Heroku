import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

import LayerElement from "../components/LayerElement";
import ModelDownloadPopup from "../popups/ModelDownloadPopup";
import PredictionPopup from "../popups/PredictionPopup";
import EvaluateModelPopup from "../popups/EvaluateModelPopup";
import ModelMetrics from "../components/ModelMetrics";
import { LAYERS, getLayerName } from "../layers";


// The default page. Login not required.
function PublicModel({currentProfile, activateConfirmPopup, notification, BACKEND_URL, checkLoggedIn}) {

    const { id } = useParams();
    const [model, setModel] = useState(null)
    const [layers, setLayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [showDownloadPopup, setShowDownloadPopup] = useState(false)
    const [showPredictionPopup, setShowPredictionPopup] = useState(false)
    const [showEvaluateModelPopup, setShowEvaluateModelPopup] = useState(false)

    const [downloading, setDownloading] = useState(false)
    const [isDownloaded, setIsDownloaded] = useState(false)

    const [showModelDescription, setShowModelDescription] = useState(true)
    const [showModelMetrics, setShowModelMetrics] = useState(false)
    const [trainingMetrics, setTrainingMetrics] = useState([])
    const [isTrained, setIsTrained] = useState(false)

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
        if (mouseOnLayer || e.button === 1) {return}
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

    useEffect(() => {
        getModel()
    }, [])

    useEffect(() => {
        setWarnings(false)
    }, [])

    useEffect(() => {
        setUpdateWarnings(!updateWarnings)
    }, [layers])

    function getModel() {

        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/public/' + id,
        })
        .then((res) => {
            setModel(res.data)

            let accuracy = res.data.accuracy
            let val_accuracy = res.data.val_accuracy
            let loss = res.data.loss
            let val_loss = res.data.val_loss
            setTrainingMetrics(accuracy.map((acc, i) => ({
                epoch: i + 1,
                accuracy: acc.toFixed(4),
                val_accuracy: (val_accuracy.length > 0 ? val_accuracy[i].toFixed(4) : -1),
                loss: loss[i].toFixed(4),
                val_loss: (val_loss.length > 0 ? val_loss[i].toFixed(4) : -1),
            })))

            setIsTrained(res.data.trained_on || res.data.trained_on_tensorflow)

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


    function saveModel() {
        if (!currentProfile) {return}

        const URL = window.location.origin + '/api/save-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (saving) {return}
        setSaving(true)

        axios.post(URL, data, config)
        .then((data) => {
            let tempModel = {...model}
            tempModel.saved_by.push(currentProfile.user)
            setModel(tempModel)
        }).catch((error) => {

            notification("Error: " + error, "failure")
            
        }).finally(() => {
            setSaving(false)
        })
    }

    function unsaveModel() {
        if (!currentProfile) {return}

        const URL = window.location.origin + '/api/unsave-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (saving) {return}
        setSaving(true)

        axios.post(URL, data, config)
        .then((data) => {
            let tempModel = {...model}
            tempModel.saved_by = tempModel.saved_by.filter((user) => user != currentProfile.user)
            setModel(tempModel)
        }).catch((error) => {

            notification("Error: " + error, "failure")
            
        }).finally(() => {
            setSaving(false)
        })
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
                                        <span className={"model-sidebar-color model-sidebar-color-" + LAYERS[layer.layer_type].color}></span>

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

                        {model && currentProfile && currentProfile.user && !model.saved_by.includes(currentProfile.user) && <button className="dataset-save-button" 
                        title="Save model" 
                        onClick={() => saveModel()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/star.svg"}/>
                            Save
                        </button>}
                        {model && currentProfile && currentProfile.user && model.saved_by.includes(currentProfile.user) && <button className="dataset-save-button"
                        title="Unsave model" 
                        onClick={() => unsaveModel()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/blueCheck.png"}/>
                            Saved
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (isTrained ? "Predict" : "Model not yet trained or trained on unknown dataset") : "Model not yet built."}
                        className={"model-evaluate-button no-margin-right " + ((model.model_file && isTrained) ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file && isTrained) {
                                setShowPredictionPopup(true)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/prediction.svg"} />
                            Predict
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (isTrained ? "Evaluate model" : "Model not yet trained or trained on unknown dataset") : "Model not yet built."}
                        className={"model-evaluate-button " + ((model.model_file && isTrained) ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (!currentProfile.user) {
                                checkLoggedIn("")
                                return;
                            }
                            if (model.model_file && isTrained) {
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
                                checkLoggedIn("/create-model?copy=" + model.id)
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
                    {trainingMetrics.length > 0 && <button className="toggle-model-metrics" type="button" onClick={() => setShowModelMetrics(!showModelMetrics)}>
                        <img className="metrics-icon" src={BACKEND_URL + "/static/images/metrics.png"}/>
                        {showModelMetrics ? "Hide training metrics" : "Show training metrics"}
                    </button>}


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

                            {model.evaluated_on && <div className="model-description-trained">
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

                    {!showModelDescription && !showModelMetrics && <div className="model-layers-container"
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}>
                            {layers.map((layer, idx) => (<LayerElement key={idx} BACKEND_URL={BACKEND_URL} 
                                        layer={layer} 
                                        hoveredLayer={hoveredLayer} 
                                        deleteLayer={() => {}}
                                        layers={layers}
                                        setLayers={setLayers}
                                        notification={notification}
                                        prevLayer={(idx > 0 ? layers[idx - 1] : null)}
                                        setWarnings={setWarnings}
                                        provided={{
                                            draggableProps: ""
                                        }}   // Just give this object here as not draggable
                                        updateWarnings={updateWarnings}
                                        idx={idx}
                                        onMouseEnter={() => setMouseOnLayer(true)}
                                        onMouseLeave={() => setMouseOnLayer(false)}
                                        isPublic={true}>
                                </LayerElement>)

                            )}
                            {!loading && layers.length == 0 && <div className="no-layers-container">
                                This model does not have any layers.
                            </div>}
                        </div>
                    }

                    {model && showModelMetrics && !showModelDescription && <ModelMetrics data={trainingMetrics} 
                    show_validation={model.val_accuracy && model.val_accuracy.length > 0} 
                    BACKEND_URL={BACKEND_URL}
                    model={model}
                    trained_on_name={(model.trained_on ? model.trained_on.name : (model.trained_on_tensorflow ? model.trained_on_tensorflow : ""))}/>}
                </div>
            </div>
        </div>
    )

    
}

export default PublicModel