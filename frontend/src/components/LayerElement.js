import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"

function LayerElement({layer, hoveredLayer, deleteLayer, BACKEND_URL, getModel, notification, prevLayer, setWarnings, provided, updateWarnings}) {

    const [type, setType] = useState(null)  // Workaround to stop warning when reordering layers.

    const [nodes, setNodes] = useState(layer.nodes_count)   // Used by ["dense"]
    const [filters, setFilters] = useState(layer.filters)   // Used by ["conv2d"]
    const [kernelSize, setKernelSize] = useState(layer.kernel_size) // USed by ["conv2d"]
    const [inputX, setInputX] = useState(layer.input_x || "") // Used by ["flatten"]
    const [inputY, setInputY] = useState(layer.input_y || "") // Used by ["flatten"]
    const [probability, setProbability] = useState(layer.probability)   // Used by ["dropout"]
    const [activation, setActivation] = useState(layer.activation_function) // Used by ["dense", "conv2d"]

    const [updated, setUpdated] = useState(false)

    const [errorMessage, setErrorMessage] = useState("")

    const elementRef = useRef(null)

    useEffect(() => {
        setNodes(layer.nodes_count)
        setFilters(layer.filters)
        setKernelSize(layer.kernel_size)
        setInputX(layer.input_x || "")
        setInputY(layer.input_y || "")
        setProbability(layer.probability)
        setActivation(layer.activation_function)

        setType(layer.layer_type)

    }, [layer])

    useEffect(() => {
        getErrorMessage()
    }, [updateWarnings])

    useEffect(() => {
        setUpdated(false)

        if (type == "dense") {
            if (nodes != layer.nodes_count) {
                setUpdated(true)
            }
        } 
        if (type == "conv2d") {
            if (filters != layer.filters) {
                setUpdated(true)
            } else if (kernelSize != layer.kernel_size) {
                setUpdated(true)
            }
        }
        if (type != "flatten" && type != "dropout") { // Do not have activation functions
            if (activation != layer.activation_function) {  
                setUpdated(true)
            }
        }
        if (type == "flatten") {
            if (inputX != (layer.input_x || "")) {
                setUpdated(true)
            } else if (inputY != (layer.input_y || "")) {
                setUpdated(true)
            }
        }
        if (type == "dropout") {
            if (probability != layer.probability) {
                setUpdated(true)
            }
        }

    }, [nodes, filters, kernelSize, activation, inputX, inputY, probability])


    function checkValidity() {
        if (type == "flatten") {
            if (inputX && !inputY || !inputX && inputY) {
                notification("Either neither or both of width and height must be specified", "failure")
                return false
            }
        }

        return true;
    }

    function updateLayer(e) {

        let valid = checkValidity()
        if (!valid) {return}

        const data = {
            "id": layer.id,
            "type": layer.layer_type,

            "nodes_count": nodes,
            "filters": filters,
            "kernel_size": kernelSize,
            "input_x": inputX,
            "input_y": inputY,
            "probability": probability,

            "activation_function": activation
        }
        
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    
        
        const URL = window.location.origin + '/api/edit-layer/'
        const config = {headers: {'Content-Type': 'application/json'}}


        axios.post(URL, data, config)
        .then((data) => {
            notification("Successfully updated layer.", "success")
            
            getModel()
            setUpdated(false)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        })
    }

    function getErrorMessage() {
        setWarnings(false)
        if (!prevLayer) {
            setErrorMessage("")
            return
        }    // Currently no issues that can arise in this case

        let errorMessage = ""
        let type = layer.layer_type
        let prevType = prevLayer.layer_type

        if (type == "dense") {
            if (prevType == "conv2d") {
                errorMessage += "A Dense layer cannot follow a Conv2D layer."
                setWarnings(true)
            }
        }

        if (type == "conv2d") {
            if (prevType && prevType != "conv2d") {
                errorMessage += "A Conv2D layer must follow another Conv2d layer."
                setWarnings(true)
            }
        }

        if (type == "dropout") {
            if (prevType == "conv2d") {
                errorMessage += "A Dropout layer cannot follow a Conv2D layer."
                setWarnings(true)
            }
        }

        setErrorMessage(errorMessage)
    }

    
    if (type) {
        return (<div className="layer-element-outer" 
            {...provided.draggableProps}
            style={{...provided.draggableProps.style}}
            ref={provided.innerRef}
            >
    
                {type && layer && <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")} ref={elementRef}>
    
                    {errorMessage && <p className="layer-element-warning">
                        <img className="layer-element-warning-icon" src={BACKEND_URL + "/static/images/failure.png"} />
                        <span className="layer-element-warning-text">{errorMessage}</span>
                    </p>}
    
                    {type == "dense" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/dense.svg"} />
                            Dense
                            <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />
                            <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>
                        </h1>
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-purple"></span>
                            <label className="layer-element-label" htmlFor="denseNodes">Nodes</label>
                            <input type="number" className="layer-element-input" id="denseNodes" value={nodes} onChange={(e) => {
                                setNodes(Math.max(0, Math.min(e.target.value, 512)))
                            }}></input>
                        </div>
    
                        <div className="layer-element-stat layer-element-activation">
                        <span className="layer-element-stat-color layer-element-stat-gray"></span>
                            <label className="layer-element-label" htmlFor="activation">Activation function</label>
                            <select className="layer-element-input layer-element-activation-input" id="activation" value={activation} onChange={(e) => {
                                    setActivation(e.target.value)
                                }}>
                                    <option value="">-</option>
                                    <option value="relu">ReLU</option>
                                    <option value="softmax">Softmax</option>
                                </select>
                        </div>
                    </form>}
    
                    {type == "conv2d" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/image.png"} />
                            Conv2D
                            <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />
                            <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                            <label className="layer-element-label" htmlFor="filters">Filters</label>
                            <input type="number" className="layer-element-input" id="filters" value={filters} onChange={(e) => {
                                setFilters(Math.max(0, Math.min(e.target.value, 100)))
                            }}></input>
                        </div>
    
                        <div className="layer-element-stat">
                        <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                            <label className="layer-element-label" htmlFor="kernelSize">Kernel size</label>
                            <input type="number" className="layer-element-input" id="kernelSize" value={kernelSize} onChange={(e) => {
                                setKernelSize(Math.max(0, Math.min(100, e.target.value)))
                            }}></input>
                        </div>
    
                        <div className="layer-element-stat layer-element-activation">
                        <span className="layer-element-stat-color layer-element-stat-gray"></span>
                            <label className="layer-element-label" htmlFor="activation">Activation function</label>
                            <select className="layer-element-input layer-element-activation-input" id="activation" value={activation} onChange={(e) => {
                                    setActivation(e.target.value)
                                }}>
                                    <option value="">-</option>
                                    <option value="relu">ReLU</option>
                                    <option value="softmax">Softmax</option>
                                </select>
                        </div>
                    </form>}
    
                    {type == "flatten" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/area.svg"} />
                            Flatten
                            <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />
                            <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-pink"></span>
                            <label className="layer-element-label" htmlFor="flattenX">Input width</label>
                            <input type="number" className="layer-element-input" id="flattenX" value={inputX} onChange={(e) => {
                                setInputX(e.target.value)
                            }}></input>
                        </div>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-pink"></span>
                            <label className="layer-element-label" htmlFor="flattenY">Input height</label>
                            <input type="number" className="layer-element-input" id="flattenY" value={inputY} onChange={(e) => {
                                setInputY(e.target.value)
                            }}></input>
                        </div>
                    </form>}
    
                    {type == "dropout" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/dropout.svg"} />
                            Dropout
                            <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />
                            <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-blue"></span>
                            <label className="layer-element-label" htmlFor="probability">Probability</label>
                            <input type="number" step="0.05" className="layer-element-input" id="probability" value={probability} onChange={(e) => {
                                setProbability(Math.max(0, Math.min(1, e.target.value)))
                            }}></input>
                        </div>
    
                    </form>}
    
                    <button type="button" 
                        className={"layer-element-save " + (!updated ? "layer-element-save-disabled" : "")}
                        title={(updated ? "Save changes" : "No changes")}
                        onClick={updateLayer}>
                        Save changes
                    </button>
                </div>}
    
                {/*hasLine && type && <div className="layer-element-connection"></div>*/}   {/* Hide for now */}
        </div>)

    } else {    // Avoids warnings
        return (<div {...provided.draggableProps}
            style={{...provided.draggableProps.style}}
            ref={provided.innerRef}
            {...provided.dragHandleProps}></div>)
    }
    
}


export default LayerElement