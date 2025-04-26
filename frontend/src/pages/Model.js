import React, {useEffect, useState, useRef, useCallback} from "react"
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
import ModelMetrics from "../components/ModelMetrics";
import { useTask } from "../contexts/TaskContext";

import { LAYERS, getLayerName, computeParams } from "../layers";
import DescriptionTable from "../components/DescriptionTable";
import { TEMPLATE_DATA } from "../helpers/templates"
import ProgressBar from "../components/ProgressBar";

import throttle from 'lodash.throttle';
import Select from 'react-select';
import { customStylesNoMargin } from "../helpers/styles";
import TitleSetter from "../components/minor/TitleSetter";


// The default page. Login not required.
function Model({currentProfile, activateConfirmPopup, notification, BACKEND_URL, checkLoggedIn, isPublic=false}) {
    const { getTaskResult } = useTask();

    const { id } = useParams();
    const [model, setModel] = useState(null)
    const [layers, setLayers] = useState([])

    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)

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
    const [showModelMetrics, setShowModelMetrics] = useState(false)
    const [trainingMetrics, setTrainingMetrics] = useState([])
    const [isTrained, setIsTrained] = useState(false)

    const pageRef = useRef(null)
    const [descriptionWidth, setDescriptionWidth] = useState(40)    // As percentage

    const [toolbarLeftWidth, setToolbarLeftWidth] = useState(185)   // In pixels
    const [toolbarMainHeight, setToolbarMainHeight] = useState(50)

    const [hoveredLayerTimeout, setHoveredLayerTimeout] = useState(null)
    const [hoveredLayer, setHoveredLayer] = useState(null)  // id of hovered layer

    const [warnings, setWarnings] = useState(new Set([]))
    const [updateWarnings, setUpdateWarnings] = useState(false) // Used to update when warning messages should be refreshed

    const [numParams, setNumParams] = useState("")

    const [cursor, setCursor] = useState("")

    const [currentTemplate, setCurrentTemplate] = useState("")
    const [templateProgress, setTemplateProgress] = useState(0)
    const [loadingTemplate, setLoadingTemplate] = useState(false)

    // For scrolling by grabbing
    const [mouseOnLayer, setMouseOnLayer] = useState(false);
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const scrollLeft = useRef(0);
    const scrollTop = useRef(0);

    const handleMouseDown = (e) => {
        if (mouseOnLayer || e.button === 1) return;
        setIsDragging(true);
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
        startY.current = e.pageY - scrollRef.current.offsetTop;
        scrollTop.current = scrollRef.current.scrollTop;
    };

    const throttledMouseMove = useCallback(throttle((e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const y = e.pageY - scrollRef.current.offsetTop;
        const walkX = (x - startX.current) * 1;
        const walkY = (y - startY.current) * 1;
        scrollRef.current.scrollLeft = scrollLeft.current - walkX;
        scrollRef.current.scrollTop = scrollTop.current - walkY;
    }, 1), [isDragging, startX, startY, scrollLeft, scrollTop]);

    const handleMouseUp = () => {
        setIsDragging(false);
    };
    const handleMouseLeave = () => setIsDragging(false);

    const descriptionContainerRef = useRef(null)

    const navigate = useNavigate()

    useEffect(() => {
        setWarnings(new Set([]))
        getModel()
    }, [])

    useEffect(() => {
        setUpdateWarnings(!updateWarnings)
    }, [layers])

    useEffect(() => {
        if (layers.length > 0 && warnings.size == 0) {
            if (model.model_type.toLowerCase() == "image") {
                setNumParams(computeParams(layers))
            } else {
                setNumParams(computeParams(layers, model.input_sequence_length || 256))
            }
        } else {
            setNumParams("")
        }
    }, [layers, warnings])

    useEffect(() => {
        if (currentProfile && model && !loading) {
            if (currentProfile.user && model.owner) {
                if (currentProfile.user != model.owner) {
                    navigate("/models/public/" + id)
                }
            }
            
        }
    }, [currentProfile, model])

    function getModel(after_training=false) {
        setLoading(true)

        let URL = window.location.origin +
            "/api/models/" + (isPublic ? "public/" : "") + id

        axios({
            method: 'GET',
            url: URL,
        })
        .then((res) => {
            setModel(res.data)

            if (res.data.model_type.toLowerCase() == "image") {
                setCurrentTemplate("cv-small")
            } else {
                setCurrentTemplate("text-medium")
            }

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
            
            if (after_training) {
                setShowModelMetrics(true)
                setShowModelDescription(false)
                setShowTrainModelPopup(false)
            }
        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading model with id " + id + ".", "failure")

            console.log(err)

        }).finally(() => {
            setLoading(false)
        })
    }

    let buildResInterval = null;
    function buildModel(optimizer, learningRate, loss, input_sequence_length=256) {
        if (isPublic) return;
        if (!layers || layers.length == 0) {
            notification("Please add layers before building the model.", "failure")
            return
        }
        if (learningRate == 0) {
            notification("Learning rate must be positive.", "failure")
            return
        }
        if (processingBuildModel) {return}
        setProcessingBuildModel(true)

        const URL = window.location.origin + '/api/build-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id,
            "optimizer": optimizer,
            "learning_rate": learningRate,
            "loss": loss,
        }
        if (model.model_type.toLowerCase() == "text") {
            data["input_sequence_length"] = input_sequence_length
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((res) => {
            buildResInterval = setInterval(() => getTaskResult(
                "build",
                buildResInterval,
                res.data["task_id"],
                () => {
                    notification("Successfully built model.", "success")
                    getModel()
                },
                (data) => notification(data["message"], "failure"),
                () => {},
                () => {
                    setShowModelMetrics(false)
                    setProcessingBuildModel(false)
                    setShowBuildModelPopup(false)
                }
            ), 2000)
        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        })
    }

    let recompileResInterval = null;
    function recompileModel(optimizer, learningRate, loss, input_sequence_length) {
        if (isPublic) return;
        if (processingRecompile) {return}
        setProcessingRecompile(true)

        const URL = window.location.origin + '/api/recompile-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id,
            "optimizer": optimizer,
            "learning_rate": learningRate,
            "loss": loss,
        }
        if (model.model_type.toLowerCase() == "text") {
            data["input_sequence_length"] = input_sequence_length
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((res) => {
            recompileResInterval = setInterval(() => getTaskResult(
                "recompile",
                recompileResInterval,
                res.data["task_id"],
                () => {
                    notification("Successfully recompiled model.", "success")
                    getModel()
                },
                (data) => notification("Recompilation failed: " + data["message"], "failure"),
                () => {},
                () => {
                    setProcessingRecompile(false)
                    setShowBuildModelPopup(false)
                }
            ), 2000)
        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
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

    function resetModelToBuild() {
        if (!currentProfile) {return}

        const URL = window.location.origin + '/api/reset-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": model.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (resetting) {return}
        setResetting(true)

        axios.post(URL, data, config)
        .then((data) => {
            notification("Successfully reset model to last build.", "success")
        }).catch((error) => {
            notification("Error: " + error, "failure")
        }).finally(() => {
            getModel()
            setResetting(false)
        })
    }
    

    // LAYER FUNCTIONALITY

    const layersHandleDragEnd = (result) => {
        if (isPublic) return;
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

    function createLayer(data, callback) {
        if (isPublic) return;
        setProcessingCreateLayer(true)

        // Required to be specified
        data["activation_function"] = data["activation_function"] || ""
        data["input_x"] = data["input_x"] || ""
        data["input_y"] = data["input_y"] || ""
        data["input_z"] = data["input_z"] || ""

        data["model"] = model.id
        
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    
        
        const URL = window.location.origin + '/api/create-layer/'
        const config = {headers: {'Content-Type': 'application/json'}}

        axios.post(URL, data, config)
        .then((data) => {
            if (callback) {
                callback()
                return
            }
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
        if (isPublic) return;
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
            setWarnings((prevWarnings) => {
                const newWarnings = new Set(prevWarnings); // clone the Set
                newWarnings.delete(id);              // remove the item
                return newWarnings;                        // return new Set
            });
            getModel()

            notification("Successfully deleted layer.", "success")

        }).catch((error) => {
            notification("Error: " + error + ".")

        }).finally(() => {
            setLoading(false)
        })
    }

    function deleteLayer(id, message) {
        if (isPublic) return;
        activateConfirmPopup((message || "Are you sure you want to delete this layer? This action cannot be undone."), () => deleteLayerInner(id))
    }

    function updateLayers(updated_layer) {
        if (isPublic) return;
        setLayers(prevLayers => {
            return prevLayers.map(layer =>
                layer.id === updated_layer.id ? updated_layer : layer
            );
        });
    }

    function loadTemplate(e) {
        if (isPublic) return;
        let layers = TEMPLATE_DATA[currentTemplate]

        setLoadingTemplate(true)

        function processTemplateLayers(index = 0) {
            setTemplateProgress((index / layers.length) * 100)
            if (index >= layers.length) {
                setTimeout(() => {
                    setLoadingTemplate(false)
                    getModel()
                    notification("Successfully loaded template.", "success")
                    setTemplateProgress(0)
                }, 200)
                return
            };
        
            createLayer(layers[index], () => {
                processTemplateLayers(index + 1);
            });
        }
        
        processTemplateLayers()
    }

    // FRONTEND FUNCTIONALITY

    const resizeLeftToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = toolbarLeftWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth + (e.clientX - startX)

          if (newWidth < 40) { // Hide toolbar
            setToolbarLeftWidth(15)
          } else {  // Show toolbar
            setToolbarLeftWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
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

    const resizeMainToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startY = e.clientY;
        const startHeight = toolbarMainHeight;

        setCursor("n-resize")
    
        const handleMouseMove = (e) => {
          const newHeight = startHeight + (e.clientY - startY)
        
          if (newHeight < 40) { // Hide toolbar
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

    function getDescriptionTableData() {
        let data = [["Owner", model.ownername]]
        data.push(["Type", model.model_type])
        data.push(["Output type", model.output_type])
        if (model.optimizer) data.push(["Optimizer", model.optimizer])
        if (model.loss_function) data.push(["Loss function", model.loss_function])
        if (model.model_type.toLowerCase() == "text") data.push(["Input sequence length", model.input_sequence_length])
        if (model.evaluated_on) {
            data.push(["Evaluated on", <div className="trained-on-container">

                {model.evaluated_on && <div className="trained-on-element" onClick={() => {
                    const URL = window.location.origin + "/datasets/" + (model.evaluated_on.visibility == "public" ? "public/" : "") + model.evaluated_on.id
                    var win = window.open(URL, '_blank');
                    win.focus();
                }}>
                    {model.evaluated_on.name} - {Math.round(10**6 * model.evaluated_accuracy) / 10**4 + "%"} accuracy
                    <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} alt="External icon" />
                </div>}

                {model.evaluated_on_tensorflow && <div className="trained-on-element" onClick={() => {
                    const URL = "https://www.tensorflow.org/api_docs/python/tf/keras/datasets/" + model.evaluated_on_tensorflow + "/load_data"
                    var win = window.open(URL, '_blank');
                    win.focus();
                }}>
                    <img className="trained-on-tensorflow-icon" src={BACKEND_URL + "/static/images/tensorflowWhite.png"} alt="Tensorflow Logo"/>
                    {model.evaluated_on_tensorflow} - {Math.round(10**6 * model.evaluated_accuracy) / 10**4 + "%"} accuracy
                    <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} alt="External icon" />
                </div>}

            </div>])
        }
        return data
    }

    let template_options_image = [
        {value: "cv-small", label: "Computer Vision (small)"},
        {value: "cv-medium", label: "Computer Vision (medium)"},
        {value: "cv-large", label: "Computer Vision (large)"}
    ]
    let template_options_text = [
        {value: "text-small", label: "Text Model (small)"},
        {value: "text-medium", label: "Text Model (medium)"},
        {value: "text-large", label: "Text Model (large)"}
    ]

    return (
        <div className="dataset-container" ref={pageRef} style={{cursor: (cursor ? cursor : "")}}>
            <TitleSetter title={"Dalinar " + (model ? "- " + model.name : "")} />

            {showPredictionPopup && <PredictionPopup setShowPredictionPopup={setShowPredictionPopup}
            model={model}
            BACKEND_URL={BACKEND_URL}
            notification={notification}>
            </PredictionPopup>}

            {loadingTemplate && <ProgressBar progress={templateProgress} message="Processing..." BACKEND_URL={BACKEND_URL}></ProgressBar>}

            {showTrainModelPopup && <TrainModelPopup setShowTrainModelPopup={setShowTrainModelPopup} 
            currentProfile={currentProfile} 
            BACKEND_URL={BACKEND_URL}
            model_id={model.id}
            model_type={model.model_type.toLowerCase()}
            notification={notification}
            activateConfirmPopup={activateConfirmPopup}
            getModel={getModel}
            setShowModelDescription={setShowModelDescription}
            setShowModelMetrics={setShowModelMetrics}>
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
                activateConfirmPopup={activateConfirmPopup}
                model_type={model ? model.model_type : ""}
                instance_optimizer={model.optimizer}
                instance_loss_function={model.loss_function}></BuildModelPopup>}

            {showCreateLayerPopup && <CreateLayerPopup BACKEND_URL={BACKEND_URL}
                                                    onSubmit={createLayer} 
                                                    setShowCreateLayerPopup={setShowCreateLayerPopup}
                                                    processingCreateLayer={processingCreateLayer}
                                                    notification={notification}
                                                    modelType={model.model_type}></CreateLayerPopup>}

            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className={"model-toolbar-left-inner " + (toolbarLeftWidth == 15 ? "hidden" : "")} >
                    <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Layers</p>

                    {!isPublic && <div className="dataset-sidebar-button-container">
                        <button type="button" 
                        className={"sidebar-button dataset-upload-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                        title="Add layer"
                        onClick={() => setShowCreateLayerPopup(true)}>
                            <img className={"dataset-upload-button-icon " + (toolbarLeftWidth < 150 ? "model-upload-button-icon-small" : "")} src={BACKEND_URL + "/static/images/plus.png"} alt="Plus" />
                            <span>Add layer</span>
                        </button>
                    </div>}

                    
                    {!isPublic && <DragDropContext className="dataset-elements-list" onDragEnd={layersHandleDragEnd}>
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
                                        <span className={"model-sidebar-color model-sidebar-color-" + LAYERS[layer.layer_type].color}></span>

                                        <span className="model-sidebar-layer-name">
                                            {getLayerName(layer)}
                                        </span>

                                        <img title="Delete layer" className="model-sidebar-delete" onClick={(e) => {
                                            e.stopPropagation()
                                            deleteLayer(layer.id)
                                        }} src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross"/>
                                    </div>)}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            </div>)}
                                                        
                        </Droppable>
                    </DragDropContext>}

                    {isPublic && <div className="model-layers-list">
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
                    </div>}
                    
                    {!loading && layers.length == 0 && <p className="gray-text">Layers will show here</p>}

                    {!isPublic && model && model.model_file && <div className="model-reset-button-container">
                        <button type="button" 
                        className={"sidebar-button dataset-upload-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                        title="Reset to build"
                        onClick={() => activateConfirmPopup("Are you sure you want to reset the entire model to the latest build?", resetModelToBuild, "blue")}>
                            <img className={"dataset-upload-button-icon " + (toolbarLeftWidth < 150 ? "model-upload-button-icon-small" : "")} src={BACKEND_URL + "/static/images/" + (resetting ? "loading.gif" : "reset.svg")} alt="Reset" />
                            <span>{(resetting ? "Resetting..." : "Reset to build")}</span>
                    </button></div>}
                </div>
                <div className="dataset-toolbar-resizeable" 
                onMouseDown={resizeLeftToolbarHandleMouseDown}
                style={{width: (toolbarLeftWidth == 15 ? "15px" : "5px")}}>
                    {toolbarLeftWidth == 15 && <img 
                    className="toolbar-main-dropdown" 
                    src={BACKEND_URL + "/static/images/down.svg"} 
                    style={{transform: "rotate(270deg)"}}
                    alt="Dropdown icon" />}
                </div>
                
            </div>

            <div className="dataset-main" style={{width: "calc(100% - " + toolbarLeftWidth + "px)"}}>
                <div className="dataset-main-toolbar-outer" style={{height: toolbarMainHeight + "px"}}>
                    <div className="dataset-main-toolbar" style={{display: (toolbarMainHeight > 25 ? "flex" : "none")}}>
                        {model && <div className="dataset-title-container unselectable" title={(!showModelDescription ? "Show description" : "Hide description")} onClick={() => {setShowModelDescription(!showModelDescription)}}>
                           
                            <img className="dataset-title-icon" src={BACKEND_URL + "/static/images/model.svg"} alt="Model icon" />
                            
                            <p className="dataset-title">{model && model.name}</p>

                            <img className="dataset-title-expand-icon" src={BACKEND_URL + "/static/images/" + (!showModelDescription ? "plus.png" : "minus.png")} alt="Toggle icon" />
                        </div>}

                        {!isPublic && model && <button type="button" title="Edit model" className="model-title-button" onClick={() => {
                            navigate("/edit-model/" + model.id + "?expanded=true")
                        }}>
                            <img className="model-title-edit-icon" src={BACKEND_URL + "/static/images/edit.png"} alt="Edit" />
                            Edit model
                        </button>}

                        {!isPublic && model && <button type="button" 
                        title="Build model" 
                        className="model-build-button" 
                        onClick={() => {
                            if (warnings.size == 0) {
                                setShowBuildModelPopup(true)
                            } else {
                                notification("You must address all warnings before building the model.", "failure")
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/build.svg"} alt="Build" />
                            {model.model_file ? "Rebuild" : "Build"}
                        </button>}

                        {!isPublic && model && <button type="button" 
                        title={model.model_file ? "Train model" : "Model not yet built."}
                        className={"model-evaluate-button no-margin-right " + (model.model_file ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file) {
                              setShowTrainModelPopup(true)  
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/lightbulb.svg"} alt="Lightbulb" />
                            Train
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (isTrained ? "Predict" : "Model not yet trained or trained on unknown dataset.") : "Model not yet built."}
                        className={"model-evaluate-button no-margin-right " + ((model.model_file && isTrained) ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file && isTrained) {
                                setShowPredictionPopup(true)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/prediction.svg"} alt="Prediction" />
                            Predict
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? (isTrained ? "Evaluate model" : "Model not yet trained or trained on unknown dataset.") : "Model not yet built."}
                        className={"model-evaluate-button " + ((model.model_file && isTrained) ? "" : "model-button-disabled ") + (isPublic ? "no-margin-right" : "")}
                        onClick={() => {
                            
                            if ((model.model_file && isTrained)) {
                                if (!currentProfile.user) {
                                    checkLoggedIn("")
                                    return;
                                }
                                setShowEvaluateModelPopup(true)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/evaluate.svg"} alt="Evaluate" />
                            Evaluate
                        </button>}

                        {isPublic && model && currentProfile && currentProfile.user && !model.saved_by.includes(currentProfile.user) && <button className="dataset-save-button" 
                        title="Save model" 
                        onClick={() => saveModel()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/star.svg"} alt="Star" />
                            Save
                        </button>}
                        {isPublic && model && currentProfile && currentProfile.user && model.saved_by.includes(currentProfile.user) && <button className="dataset-save-button"
                        title="Unsave model" 
                        onClick={() => unsaveModel()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue check" />
                            Saved
                        </button>}

                        {model && <button type="button" 
                        title={model.model_file ? "Create copy" : "Model not yet built."}
                        className={"model-build-button model-copy-button " + (model.model_file ? "" : "model-button-disabled")}
                        onClick={() => {
                            if (model.model_file) {
                                checkLoggedIn("/create-model?copy=" + model.id)
                            }
                        }}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/copy.png"} alt="Copy" />
                            Copy
                        </button>}

                        {model && <button style={{marginLeft: 0}} className={"model-download-button model-download-button " + (model.model_file ? "" : "model-button-disabled")} 
                        title={model.model_file ? "Download model" : "You must build the model before downloading it."}
                        onClick={() => setShowDownloadPopup(true)}>
                            <img className="model-download-icon" src={BACKEND_URL + "/static/images/download.svg"} alt="Download" />
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
                        <img className="metrics-icon" src={BACKEND_URL + "/static/images/metrics.png"} alt="Metrics" />
                        {showModelMetrics ? "Hide training metrics" : "Show training metrics"}
                    </button>}

                    {layers.length > 0 && numParams && <div className="model-params-container">
                        {numParams} parameters
                    </div>}

                    {showModelDescription && model && <div className="dataset-description-display-container" ref={descriptionContainerRef}>
                        <div className="dataset-description-image-container" style={{width: "calc(100% - " + descriptionWidth + "%)"}}>
                            <img className="dataset-description-image" src={model.image} alt="Model image" />
                        </div>

                        <div className="dataset-description-resize" onMouseDown={resizeDescriptionHandleMouseDown}></div>

                        <div className="dataset-description-display" style={{width: "calc(" + descriptionWidth + "%" + " - 5px)"}}>
                            <div className="dataset-description-header" title={model.name}>
                                {model.name}
                            </div>

                            <div className="model-description-stats">
                                {model.downloaders && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/download.svg"} alt="Download" />
                                    {model.downloaders.length + (model.downloaders.length == 1 ? " download" : " downloads")}
                                </div>}

                                {layers && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/classification.png"} alt="Classification" />
                                    {layers.length + (layers.length == 1 ? " layer" : " layers")}
                                </div>}
                            </div>

                            <DescriptionTable data={getDescriptionTableData()} />

                            <p className="dataset-description-text dataset-description-description dataset-description-text-margin">{(model.description || "This model does not have a description.")}</p>

                            <button className="hide-description-button" 
                            onClick={() => {setShowModelDescription(false)}}
                            style={{marginTop: "auto"}}>
                                <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/minus.png"} alt="Minus" />
                                Hide description
                            </button>
                        </div>

                    </div>}

                    {!isPublic && !showModelDescription && !showModelMetrics && <DragDropContext className="model-layers-container-outer" onDragEnd={layersHandleDragEnd}>
                        <Droppable droppableId="models-droppable" direction="horizontal">
                        {(provided) => (<div className="model-layers-container"
                        {...provided.droppableProps}
                        ref={(el) => {
                            scrollRef.current = el
                            provided.innerRef(el)
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={throttledMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        >
                            {layers.map((layer, idx) => (<Draggable key={layer.id} draggableId={"" + layer.id} index={idx} >
                                    {(provided) => (<LayerElement BACKEND_URL={BACKEND_URL} 
                                        layer={layer} 
                                        hoveredLayer={hoveredLayer} 
                                        deleteLayer={deleteLayer}
                                        layers={layers}
                                        updateLayers={updateLayers}
                                        notification={notification}
                                        prevLayer={(idx > 0 ? layers[idx - 1] : null)}
                                        warnings={warnings}
                                        setWarnings={setWarnings}
                                        provided={provided}
                                        updateWarnings={updateWarnings}
                                        idx={idx}
                                        isBuilt={model.model_file != null}
                                        onMouseEnter={() => setMouseOnLayer(true)}
                                        onMouseLeave={() => setMouseOnLayer(false)}>

                                    </LayerElement>)}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {!loading && layers.length == 0 && <div className="no-layers-container">
                                <button type="button" 
                                className="sidebar-button dataset-upload-button"
                                title="Add layer"
                                onClick={() => setShowCreateLayerPopup(true)}>
                                    <img className="dataset-upload-button-icon" src={BACKEND_URL + "/static/images/plus.png"} alt="Plus" />
                                    <span>Add layer</span>
                                </button>
                                
                                <p className="model-or">or</p>

                                <Select
                                    options={(model.model_type.toLowerCase() == "image" ? template_options_image : template_options_text)}
                                    value={(model.model_type.toLowerCase() == "image" ? template_options_image : template_options_text)
                                        .find((opt) => opt.value === currentTemplate)}
                                    onChange={(selected) => {
                                        setCurrentTemplate(selected.value)
                                    }}
                                    styles={customStylesNoMargin}
                                    className="w-full"
                                />
                                <button type="button" 
                                className="sidebar-button dataset-upload-button"
                                title="Load template"
                                style={{marginTop: "10px"}}
                                onClick={loadTemplate}>
                                    Load template
                                </button>
                            </div>}
                        </div>)}
                        </Droppable>
                    </DragDropContext>}
                    {isPublic && !showModelDescription && !showModelMetrics && <div className="model-layers-container"
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={throttledMouseMove}
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
                                        updateWarnings={false}
                                        idx={idx}
                                        isBuilt={model.model_file != null}
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
                        val_split={model.val_split} 
                        BACKEND_URL={BACKEND_URL}
                        model={model}
                        trained_on_name={(model.trained_on ? model.trained_on.name : (model.trained_on_tensorflow ? model.trained_on_tensorflow : ""))}/>}
                    
                </div>
            </div>
        </div>
    )

    
}

export default Model