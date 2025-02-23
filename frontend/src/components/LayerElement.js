import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"

function LayerElement({layer, hoveredLayer, deleteLayer, 
                        BACKEND_URL, setLayers, layers, notification, 
                        prevLayer, setWarnings, provided, 
                        updateWarnings, idx, onMouseEnter, 
                        onMouseLeave, warnings=false, isPublic=false}) {

    const [type, setType] = useState(null)  // Workaround to stop warning when reordering layers.

    const [nodes, setNodes] = useState(layer.nodes_count)   // Used by ["dense"]
    const [filters, setFilters] = useState(layer.filters)   // Used by ["conv2d"]
    const [kernelSize, setKernelSize] = useState(layer.kernel_size) // USed by ["conv2d"]
    const [inputX, setInputX] = useState(layer.input_x || "") // Used by ["dense", "conv2d", "flatten", "rescaling", "resizing"]
    const [inputY, setInputY] = useState(layer.input_y || "") // Used by ["conv2d", "flatten", "rescaling", "resizing"]
    const [inputZ, setInputZ] = useState(layer.input_z || "") // Used by ["conv2d", "resizing"]
    const [poolSize, setPoolSize] = useState(layer.pool_size)
    const [rate, setRate] = useState(layer.rate)   // Used by ["dropout"]
    const [scale, setScale] = useState(layer.scale) // Used by ["rescaling"]
    const [offset, setOffset] = useState(layer.offset)  // Used by ["rescaling"]
    const [mode, setMode] = useState(layer.mode)    // Used by ["randomflip"]
    const [outputX, setOutputX] = useState(layer.output_x)  // Used by ["resizing"]
    const [outputY, setOutputY] = useState(layer.output_y)  // Used by ["resizing"]

    const [activation, setActivation] = useState(layer.activation_function) // Used by ["dense", "conv2d"]

    const [updated, setUpdated] = useState(false)
    const [revertChanges, setRevertChanges] = useState(false)

    const [savingChanges, setSavingChanges] = useState(false)

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
        setMode(layer.mode)
        setOutputX(layer.output_x)
        setOutputY(layer.output_y)

        setActivation(layer.activation_function)

        setType(layer.layer_type)

    }, [layer, revertChanges])

    useEffect(() => {
        getErrorMessage()
    }, [updateWarnings])

    function dimensions_updated(include_z) {
        if (inputX != (layer.input_x || "")) {
            return true
        } else if (inputY != (layer.input_y || "")) {
            return true
        } else if (include_z && inputZ != (layer.input_z || "")) {
            return true
        } else {
            return false
        }
    }

    useEffect(() => {
        setUpdated(false)

        if (type == "dense") {
            if (nodes != layer.nodes_count) {
                setUpdated(true)
            } else if (inputX != layer.input_x) {
                setUpdated(true)
            }
        } 
        else if (type == "conv2d") {
            if (filters != layer.filters) {
                setUpdated(true)
            } else if (kernelSize != layer.kernel_size) {
                setUpdated(true)
            } else if (dimensions_updated(true)) {
                setUpdated(true)
            }
        }
        else if (type == "maxpool2d") {
            if (poolSize != layer.pool_size) {
                setUpdated(true)
            }
        }
        else if (type == "flatten") {
            if (dimensions_updated(false)) {
                setUpdated(true)
            }
        }
        else if (type == "dropout") {
            if (rate != layer.rate) {
                setUpdated(true)
            }
        }
        else if (type == "rescaling") {
            if (scale != layer.scale) {
                setUpdated(true)
            } else if (offset != layer.offset) {
                setUpdated(true)
            } else if (dimensions_updated(true)) {
                setUpdated(true)
            }
        }
        else if (type == "randomflip") {
            if (mode != layer.mode) {
                setUpdated(true)
            }
        }
        else if (type == "resizing") {
            if (dimensions_updated(true)) {
                setUpdated(true)
            } else if (outputX != layer.output_x) {
                setUpdated(true)
            } else if (outputY != layer.output_y) {
                setUpdated(true)
            }
        }

        const NO_ACTIVATION = new Set(["flatten", "dropout", "randomflip", "maxpool2d", "resizing"])
        if (!NO_ACTIVATION.has(type)) { // Do not have activation functions
            if (activation != layer.activation_function) {  
                setUpdated(true)
            }
        }

    }, [nodes, filters, kernelSize, activation, inputX, inputY, inputZ, poolSize, rate, scale, offset, mode, outputX, outputY])   // All layer states


    function checkInputDimensions(include_z) {  // Adds dimensions, returns true if valid else false
        if (!(inputX && inputY && (include_z ? inputZ : true)) && (inputX || inputY || (include_z ? inputZ : false))) {
            notification("All dimensions must be specified or all left empty.", "failure")
            return false;
        }

        if (inputX && inputX <= 0) {
            notification("Input width must be positive.", "failure")
            return false;
        }

        if (inputY && inputY <= 0) {
            notification("Input height must be positive.", "failure")
            return false;
        }
        if (include_z) {
            if (inputZ && inputZ <= 0) {
                notification("Input depth must be positive.", "failure")
                return false;
            }
        }
        
        return true;
    }

    function checkValidity() {
        if (type == "dense") {
            if (inputX && inputX <= 0) {
                notification("Input size must be positive or unspecified.", "failure")
                return false;
            }
        }
        if (type == "flatten") {
            return checkInputDimensions(false)
        }
        if (type == "conv2d") {
            return checkInputDimensions(true)
        }
        if (type == "rescaling") {
            let dimensionsValid = checkInputDimensions(true)
            if (!dimensionsValid) {
                return false
            }
            try {
                const result = eval(scale); 
            } catch {
                notification("Scale must be a valid number.", "failure")
                return false;
            }
        }
        if (type == "resizing") {
            if (!checkInputDimensions(true)) {
                return false
            }
            if (outputX <= 0 || outputY <= 0) {
                notification("Output dimensions must be positive.", "failure")
                return
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
            "mode": mode,
            "output_x": outputX,
            "output_y": outputY,

            "activation_function": activation
        }
        
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    
        
        const URL = window.location.origin + '/api/edit-layer/'
        const config = {headers: {'Content-Type': 'application/json'}}

        if (savingChanges) {return}
        setSavingChanges(true)

        axios.post(URL, data, config)
        .then((res) => {
            
            
            let temp = [...layers]
            for (let i=0; i < temp.length; i++) {
                if (temp[i].id == layer.id) {
                    temp[i] = res.data
                }
            }
            setLayers(temp)

            notification("Successfully updated layer.", "success")
            setUpdated(false)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setSavingChanges(false)
        })
    }

    const VALID_PREV_LAYERS = { // null means that it can be the first layer
        "dense": [null, "dense", "flatten", "dropout"],
        "conv2d": [null, "conv2d", "maxpool2d", "rescaling", "randomflip", "resizing"],
        "maxpool2d": ["conv2d", "maxpool2d", "rescaling", "resizing"],
        "dropout": ["dense", "dropout", "flatten"],
        "flatten": [null, "dense", "dropout", "flatten", "conv2d", "maxpool2d", "rescaling", "resizing"],
        "rescaling": [null, "randomflip", "resizing"],
        "randomflip": [null, "rescaling", "resizing"],
        "resizing": [null]
    }

    const WARNING_MESSAGES = {
        "dense": "A Dense layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["dense"].slice(1).join(", ") + "].",
        "conv2d": "A Conv2D layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["conv2d"].slice(1).join(", ") + "].",
        "maxpool2d": "A MaxPool2D layer must follow one of the following layers: [" + VALID_PREV_LAYERS["maxpool2d"].slice(1).join(", ") + "].",
        "dropout": "A Dropout layer must follow one of the following layers: [" + VALID_PREV_LAYERS["dropout"].slice(1).join(", ") + "].",
        "flatten": "Invalid previous layer.",
        "rescaling": "Must be the first layer or follow another preprocessing layer.",
        "randomflip": "Must be the first layer or follow another preprocessing layer.",
        "resizing": "Must be the first layer."
    }

    function getErrorMessage() {
        setWarnings(false || warnings)

        let type = layer.layer_type
        let prevType = (prevLayer ? prevLayer.layer_type : null)
        setErrorMessage("")

        if (!VALID_PREV_LAYERS[type].includes(prevType)) {
            setWarnings(true)
            setErrorMessage(WARNING_MESSAGES[type])
        }

        if (!prevLayer && (!layer.input_x && !layer.input_y && !layer.input_z)) {
            setWarnings(true)
            setErrorMessage("Input dimensions must be specified on the first layer.")
        }

    }

    function dimensionsX(isFlatten=false) {
        if (!isPublic || inputX) {
            return (<div className="layer-element-stat">
                <span className={"layer-element-stat-color layer-element-stat-" + (!isFlatten ? "gray2" : "pink")}></span>
                <label className="layer-element-label" htmlFor={"dimensionX" + layer.id}>Input width</label>
                {!isPublic && <input type="number" className="layer-element-input" id={"dimensionX" + layer.id} value={inputX} onChange={(e) => {
                    setInputX(e.target.value)
                }}></input>}
                {isPublic && <div className="layer-element-input">{inputX}</div>}
            </div>)
        } else {
            if (isFlatten) {
                return (<div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-pink"></span>
                    <label className="layer-element-label">Input width</label>
                    <div className="layer-element-input">-</div>
                </div>)
            }
            return null
        }
    }

    function dimensionsY(isFlatten=false) {
        if (!isPublic || inputY) {
            return (<div className="layer-element-stat">
                <span className={"layer-element-stat-color layer-element-stat-" + (!isFlatten ? "gray2" : "pink")}></span>
                <label className="layer-element-label" htmlFor={"dimensionY" + layer.id}>Input height</label>
                {!isPublic && <input type="number" className="layer-element-input" id={"dimensionY" + layer.id} value={inputY} onChange={(e) => {
                    setInputY(e.target.value)
                }}></input>}
                {isPublic && <div className="layer-element-input">{inputY}</div>}
            </div>)
        } else {
            if (isFlatten) {
                return (<div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-pink"></span>
                    <label className="layer-element-label">Input height</label>
                    <div className="layer-element-input">-</div>
                </div>)
            }
            return null
        }
    }

    function dimensionsZ() {
        if (!isPublic || inputZ) {
            return (<div className="layer-element-stat">
                <span className="layer-element-stat-color layer-element-stat-gray2"></span>
                <label className="layer-element-label" htmlFor={"dimensionZ" + layer.id}>Input depth</label>
                {!isPublic && <input type="number" className="layer-element-input" id={"dimensionZ" + layer.id} value={inputZ} onChange={(e) => {
                    setInputZ(e.target.value)
                }}></input>}
                {isPublic && <div className="layer-element-input">{inputZ}</div>}
            </div>)
        } else {
            return null
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

                        {(!isPublic || inputX) && <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-purple"></span>
                            <label className="layer-element-label" htmlFor={"denseSize" + layer.id}>Input size</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"denseSize" + layer.id} value={inputX} onChange={(e) => {
                                setInputX(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{inputX}</div>}
                        </div>}
    
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

                        {dimensionsX()}
    
                        {dimensionsY()}

                        {dimensionsZ()}
    
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
    
                        {dimensionsX(true)}
    
                        {dimensionsY(true)}

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

                    {type == "rescaling" && <form className="layer-element-inner">
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
                            {!isPublic && <input type="text" className="layer-element-input" id={"scale" + layer.id} value={scale} onChange={(e) => {
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

                        {dimensionsX()}
    
                        {dimensionsY()}

                        {dimensionsZ()}
    
                    </form>}

                    {type == "randomflip" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/image.png"} />
                            <span className="layer-element-title-text">RandomFlip</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-cyan"></span>
                            <label className="layer-element-label" htmlFor={"mode" + layer.id}>Mode</label>
                            {!isPublic && <select className="layer-element-input layer-element-mode-input" id={"mode" + layer.id} value={mode} onChange={(e) => {
                                    setMode(e.target.value)
                                }}>
                                    <option value="horizontal_and_vertical">horizontal_and_vertical</option>
                                    <option value="horizontal">horizontal</option>
                                    <option value="vertical">vertical</option>
                            </select>}
                            {isPublic && <div title={mode} className="layer-element-input layer-element-mode-input">{mode}</div>}
                        </div> 

                        {dimensionsX()}
    
                        {dimensionsY()}

                        {dimensionsZ()}
                    </form>}

                    {type == "resizing" && <form className="layer-element-inner">
                        <h1 className="layer-element-title">
                            <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/image.png"} />
                            <span className="layer-element-title-text">Resizing</span>
                            {!isPublic && <img className="layer-element-drag" title="Reorder layer" src={BACKEND_URL + "/static/images/drag.svg"} {...provided.dragHandleProps} />}
                            {!isPublic && <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                deleteLayer(layer.id)
                            }}/>}
                        </h1>

                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-green"></span>
                            <label className="layer-element-label" htmlFor={"resizingOutX" + layer.id}>Output width</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"resizingOutX" + layer.id} value={outputX} onChange={(e) => {
                                setOutputX(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{outputX}</div>}
                        </div>
    
                        <div className="layer-element-stat">
                            <span className="layer-element-stat-color layer-element-stat-green"></span>
                            <label className="layer-element-label" htmlFor={"resizingOutY" + layer.id}>Output height</label>
                            {!isPublic && <input type="number" className="layer-element-input" id={"resizingOutY" + layer.id} value={outputY} onChange={(e) => {
                                setOutputY(e.target.value)
                            }}></input>}
                            {isPublic && <div className="layer-element-input">{outputY}</div>}
                        </div>

                        {dimensionsX()}
    
                        {dimensionsY()}

                        {dimensionsZ()}
                    </form>}
    
                    {!isPublic && <button type="button" 
                        className={"layer-element-save " + (!updated ? "layer-element-save-disabled" : "")}
                        title={(updated ? "Save changes" : "No changes")}
                        onClick={updateLayer}>
                        {savingChanges && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                        {(!savingChanges ? "Save changes" : "Updating...")}
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