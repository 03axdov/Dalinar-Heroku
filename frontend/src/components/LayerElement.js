import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"

function LayerElement({layer, hoveredLayer, deleteLayer, 
                        BACKEND_URL, getModel, notification, 
                        prevLayer, setWarnings, provided, 
                        updateWarnings, idx, onMouseEnter, 
                        onMouseLeave, isPublic=false}) {

    const [type, setType] = useState(null)  // Workaround to stop warning when reordering layers.

    const [nodes, setNodes] = useState(layer.nodes_count)   // Used by ["dense"]
    const [filters, setFilters] = useState(layer.filters)   // Used by ["conv2d"]
    const [kernelSize, setKernelSize] = useState(layer.kernel_size) // USed by ["conv2d"]
    const [inputX, setInputX] = useState(layer.input_x || "") // Used by ["conv2d", "flatten", "rescale"]
    const [inputY, setInputY] = useState(layer.input_y || "") // Used by ["conv2d", "flatten", "rescale"]
    const [inputZ, setInputZ] = useState(layer.input_z || "") // Used by ["conv2d"]
    const [poolSize, setPoolSize] = useState(layer.pool_size)
    const [rate, setRate] = useState(layer.rate)   // Used by ["dropout"]
    const [scale, setScale] = useState(layer.scale) // Used by ["rescale"]
    const [offset, setOffset] = useState(layer.offset)  // Used by ["rescale"]

    const [activation, setActivation] = useState(layer.activation_function) // Used by ["dense", "conv2d"]

    const [updated, setUpdated] = useState(false)
    const [revertChanges, setRevertChanges] = useState(false)

    const [errorMessage, setErrorMessage] = useState("")

    const elementRef = useRef(null)

    useEffect(() => {
        setNodes(layer.nodes_count)
        setFilters(layer.filters)
        setKernelSize(layer.kernel_size)
        setInputX(layer.input_x || "")
        setInputY(layer.input_y || "")
        setInputZ(layer.input_z || "")
        setPoolSize(layer.pool_size)
        setRate(layer.rate)
        setScale(layer.scale)
        setOffset(layer.offset)
        setActivation(layer.activation_function)

        setType(layer.layer_type)

    }, [layer, revertChanges])

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
            } else if (inputX != (layer.input_x || "")) {
                setUpdated(true)
            } else if (inputY != (layer.input_y || "")) {
                setUpdated(true)
            } else if (inputZ != (layer.input_z || "")) {
                setUpdated(true)
            }
        }
        if (type == "maxpool2d") {
            if (poolSize != layer.pool_size) {
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
            if (rate != layer.rate) {
                setUpdated(true)
            }
        }
        if (type == "rescale") {
            if (scale != layer.scale) {
                setUpdated(true)
            } else if (offset != layer.offset) {
                setUpdated(true)
            }
        }

    }, [nodes, filters, kernelSize, activation, inputX, inputY, inputZ, poolSize, rate, scale, offset])


    function checkValidity() {
        if (type == "flatten") {
            if (inputX && !inputY || !inputX && inputY) {
                notification("Both dimensions must be specified or both left empty.", "failure")
                return false
            }
        }
        if (type == "conv2d") {
            if (!(inputX && inputY && inputZ) && (inputX || inputY || inputZ)) {
                notification("All dimensions must be specified or all left empty.", "failure")
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
            "input_z": inputZ,
            "pool_size": poolSize,
            "rate": rate,
            "scale": scale,
            "offset": offset,

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


    const VALID_PREV_LAYERS = { // null means that it can be the first layer
        "dense": [null, "dense", "flatten", "dropout"],
        "conv2d": [null, "conv2d", "maxpool2d", "rescale"],
        "maxpool2d": ["conv2d", "maxpool2d"],
        "dropout": ["dense", "dropout", "flatten"],
        "flatten": [null, "dense", "dropout", "flatten", "conv2d", "maxpool2d"],
        "rescale": [null]
    }

    const WARNING_MESSAGES = {
        "dense": "A Dense layer must be the first one, else follow another Dense layer, a Flatten layer, a Rescale layer, or a Dropout layer.",
        "conv2d": "A Conv2D layer must be the first one, else follow another Conv2d layer or a MaxPool2DLayer.",
        "maxpool2d": "A MaxPool2D layer must follow a Conv2d layer or another MaxPool2D layer.",
        "dropout": "A Dropout layer must follow a Dense layer, a Flatten layer, or another Dropout layer.",
        "flatten": "Invalid previous layer.",
        "rescale": "Invalid previous layer."
    }

    function getErrorMessage() {
        setWarnings(false)

        let type = layer.layer_type
        let prevType = (prevLayer ? prevLayer.layer_type : null)
        setErrorMessage("")

        if (!VALID_PREV_LAYERS[type].includes(prevType)) {
            setWarnings(true)
            setErrorMessage(WARNING_MESSAGES[type])
        }

    }

    
    if (type) {
        return (<div className="layer-element-outer" 
            {...provided.draggableProps}
            style={{...provided.draggableProps.style}}
            ref={provided.innerRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}>
    
                {type && layer && <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")} ref={elementRef}>
    
                    {errorMessage && <p className="layer-element-warning">
                        <img className="layer-element-warning-icon" src={BACKEND_URL + "/static/images/failure.png"} />
                        <span className="layer-element-warning-text">{errorMessage}</span>
                    </p>}
    
                    {type == "dense" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/dense.svg"} />
                            <span className="layer-element-title-text">Dense</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-purple"></span>
                            <label className="layer-element-label" htmlFor={"denseNodes" + layer.id}>Nodes</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"denseNodes" + layer.id} value={nodes} onChange={(e) => {
                                setNodes(Math.max(0, Math.min(e.target.value, 512)))
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{nodes}</div>}
                        </div>
    
                        <div className="layer-element-stat layer-element-activation">
                        <span className="layer-element-stat-color layer-element-stat-gray"></span>
                            <label className="layer-element-label" htmlFor={"activation" + layer.id}>Activation function</label>
                            {!isPublic && <select className="layer-element-input layer-element-activation-input" id={"activation" + layer.id} value={activation} onChange={(e) => {
                                    setActivation(e.target.value)
                                }}>
                                    <option value="">-</option>
                                    <option value="relu">ReLU</option>
                                    <option value="softmax">Softmax</option>
                            </select>}
                            {isPublic && <div className="layer-element-input layer-element-activation-input">{activation || "-"}</div>}
                        </div>
                    </form>}
    
                    {type == "conv2d" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/image.png"} />
                            <span className="layer-element-title-text">Conv2D</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                            <label className="layer-element-label" htmlFor={"filters" + layer.id}>Filters</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"filters" + layer.id} value={filters} onChange={(e) => {
                                setFilters(Math.max(0, Math.min(e.target.value, 100)))
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{filters}</div>}
                        </div>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                            <label className="layer-element-label" htmlFor={"kernelSize" + layer.id}>Kernel size</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"kernelSize" + layer.id} value={kernelSize} onChange={(e) => {
                                setKernelSize(Math.max(0, Math.min(100, e.target.value)))
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{kernelSize}</div>}
                        </div>

                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-gray2"></span>
                            <label className="layer-element-label" htmlFor={"flattenX" + layer.id}>Input width</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"flattenX" + layer.id} value={inputX} onChange={(e) => {
                                setInputX(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputX}</div>}
                        </div>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-gray2"></span>
                            <label className="layer-element-label" htmlFor={"flattenY" + layer.id}>Input height</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"flattenY" + layer.id} value={inputY} onChange={(e) => {
                                setInputY(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputY}</div>}
                        </div>

                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-gray2"></span>
                            <label className="layer-element-label" htmlFor={"flattenZ" + layer.id}>Input depth</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"flattenZ" + layer.id} value={inputZ} onChange={(e) => {
                                setInputZ(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputZ}</div>}
                        </div>
    
                        <div className="layer-element-stat layer-element-activation">
                        <span className="layer-element-stat-color layer-element-stat-gray"></span>
                            <label className="layer-element-label" htmlFor={"activation" + layer.id}>Activation function</label>
                            {!isPublic && <select className="layer-element-input layer-element-activation-input" id={"activation" + layer.id} value={activation} onChange={(e) => {
                                    setActivation(e.target.value)
                                }}>
                                    <option value="">-</option>
                                    <option value="relu">ReLU</option>
                                    <option value="softmax">Softmax</option>
                            </select>}
                            {isPublic && <div className="layer-element-input layer-element-activation-input">{activation || "-"}</div>}
                        </div>
                    </form>}

                    {type == "maxpool2d" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/image.png"} />
                            <span className="layer-element-title-text">MaxPool2D</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-pink2"></span>
                            <label className="layer-element-label" htmlFor={"pool-size" + layer.id}>Pool size</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"pool-size" + layer.id} value={poolSize} onChange={(e) => {
                                setPoolSize(Math.max(0, Math.min(e.target.value, 99)))
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{poolSize}</div>}
                        </div> 
                    </form>}
    
                    {type == "flatten" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/area.svg"} />
                            <span className="layer-element-title-text">Flatten</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-pink"></span>
                            <label className="layer-element-label" htmlFor={"flattenX" + layer.id}>Input width</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"flattenX" + layer.id} value={inputX} onChange={(e) => {
                                setInputX(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputX}</div>}
                        </div>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-pink"></span>
                            <label className="layer-element-label" htmlFor={"flattenY" + layer.id}>Input height</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"flattenY" + layer.id} value={inputY} onChange={(e) => {
                                setInputY(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputY}</div>}
                        </div>
                    </form>}
    
                    {type == "dropout" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/dropout.svg"} />
                            <span className="layer-element-title-text">Dropout</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-blue"></span>
                            <label className="layer-element-label" htmlFor={"rate" + layer.id}>Rate</label>
                            {!isPublic && <input type="number" step="0.05" className="layer-element-input" id={"rate" + layer.id} value={rate} onChange={(e) => {
                                setRate(Math.max(0, Math.min(1, e.target.value)))
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{rate}</div>}
                        </div>
    
                    </form>}

                    {type == "rescale" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/area.svg"} />
                            <span className="layer-element-title-text">Rescale</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-darkblue"></span>
                            <label className="layer-element-label" htmlFor={"scale" + layer.id}>Scale</label>
                            {!isPublic && <input type="number" step="0.01" className="layer-element-input" id={"scale" + layer.id} value={scale} onChange={(e) => {
                                setScale(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{scale}</div>}
                        </div>

                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-darkblue"></span>
                            <label className="layer-element-label" htmlFor={"offset" + layer.id}>Offset</label>
                            {!isPublic && <input type="number" step="0.01" className="layer-element-input" id={"offset" + layer.id} value={offset} onChange={(e) => {
                                setOffset(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{offset}</div>}
                        </div>
    
                    </form>}
    
                    {!isPublic && <button type="button" 
                        className={"layer-element-save " + (!updated ? "layer-element-save-disabled" : "")}
                        title={(updated ? "Save changes" : "No changes")}
                        onClick={updateLayer}>
                        Save changes
                    </button>}
                    {!isPublic && <button type="button" 
                        className="layer-element-revert"
                        title="Revert changes"
                        onClick={() => setRevertChanges(!revertChanges)}>
                        Revert changes
                    </button>}

                    <div className="layer-element-index" title={"Layer #" + (idx+1)}>{idx+1}</div>
                </div>}
    
                
        </div>)

    } else {    // Avoids warnings
        return (<div {...provided.draggableProps}
            style={{...provided.draggableProps.style}}
            ref={provided.innerRef}
            {...provided.dragHandleProps}></div>)
    }
    
}


export default LayerElement