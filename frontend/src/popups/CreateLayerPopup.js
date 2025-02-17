import React, {useState, useEffect} from "react"

function CreateLayerPopup({BACKEND_URL, setShowCreateLayerPopup, onSubmit, processingCreateLayer, notification}) {

    // Data fields for different layers
    const [type, setType] = useState("dense")

    const [filters, setFilters] = useState(1)   // Used for layers of type ["conv2d"]
    const [kernelSize, setKernelSize] = useState(3) // Used for layers of type ["conv2d"]

    const [nodesCount, setNodesCount] = useState(8) // Used for layers of type ["dense"]

    const [inputX, setInputX] = useState("")    // Used for layers of type ["conv2d", "flatten", "rescale"]
    const [inputY, setInputY] = useState("")    // Used for layers of type ["conv2d", "flatten", "rescale"]
    const [inputZ, setInputZ] = useState("")    // Used for layers of type ["conv2d"]

    const [poolSize, setPoolSize] = useState(2) // Used for layers of type ["maxpool2d"]

    const [rate, setRate] = useState(0.2) // Used for layers of type ["dropout"]

    const [scale, setScale] = useState("1/255.0") // Used for layers of type ["rescale"]
    const [offset, setOffset] = useState(0) // Used for layers of type ["rescale"]

    const [activation, setActivation] = useState("")    // Used for layers of type ["dense", "conv2d"]

    useEffect(() => {   // Empty fields shared by many types
        setInputX("")
        setInputY("")
        setActivation("")
    }, [type])

    return (
        <div className="popup create-layer-popup" onClick={() => setShowCreateLayerPopup(false)}>
            <div className="create-layer-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Add layer</h1>
                <p className="create-layer-popup-description">
                    Machine learning models consist of several layers following each other. Note that ordering is important;
                    some layers can only follow certain layers. Warnings will be shown for invalid combinations.
                </p>

                <form className="create-layer-popup-form" onSubmit={(e) => {
                    e.preventDefault()

                    let data = {
                        "type": type,
                        "activation_function": activation
                    }
 
                    if (type == "dense") {
                        data["nodes_count"] = nodesCount
                    }
                    
                    if (type == "conv2d") {
                        data["filters"] = filters
                        data["kernel_size"] = kernelSize

                        if (!(inputX && inputY && inputZ) && (inputX || inputY || inputZ)) {
                            notification("All dimensions must be specified or all left empty.", "failure")
                            return;
                        }
                        data["input_x"] = inputX
                        if (inputX && (inputX > 512 || inputX <= 0)) {
                            notification("Input width must be positive and no more than 512.", "failure")
                            return;
                        }
                        data["input_y"] = inputY
                        if (inputY && (inputY > 512 || inputY <= 0)) {
                            notification("Input height must be positive and no more than 512.", "failure")
                            return;
                        }
                        data["input_z"] = inputZ
                        if (inputZ && (inputZ > 32 || inputZ <= 0)) {
                            notification("Input depth must be positive and no more than 32.", "failure")
                            return;
                        }
                    }

                    if (type == "maxpool2d") {
                        data["pool_size"] = poolSize
                    }

                    if (type == "flatten") {
                        if ((inputX && !inputY) || (!inputX && inputY)) {
                            notification("Both input dimensions must be specified or both left empty.", "failure")
                            return;
                        }
                        data["input_x"] = inputX
                        if (inputX && (inputX > 512 || inputX <= 0)) {
                            notification("Input width must be positive and no more than 512.", "failure")
                            return;
                        }
                        data["input_y"] = inputY
                        if (inputY && (inputY > 512 || inputY <= 0)) {
                            notification("Input height must be positive and no more than 512.", "failure")
                            return;
                        }
                    }
                    
                    if (type == "dropout") {
                        data["rate"] = rate
                    }

                    if (type == "rescale") {
                        if (scale === null || offset === null) {
                            notification("Please enter both scale and offset", "failure")
                            return;
                        }
                        try {
                            const result = eval(scale); 
                        } catch {
                            notification("Scale must be a valid number.")
                            return;
                        }
                        data["scale"] = scale
                        data["offset"] = offset
                    }

                    if (type == "flatten" || type == "dropout" || type == "rescale") {    // These layers cannot have activation functions
                        data["activation_function"] = ""
                    }

                    onSubmit(data)
                }}>
                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="layer-type">Layer type</label>
                        <select className="create-dataset-inp" id="layer-type" required value={type} onChange={(e) => {
                            setType(e.target.value)
                        }}>
                            <optgroup label="Miscellaneous">
                                <option value="dense">Dense</option>
                                <option value="flatten">Flatten</option>
                                <option value="dropout">Dropout</option>
                            </optgroup>
                            <optgroup label="Preprocessing">
                                <option value="rescale">Rescale</option>
                            </optgroup>
                            <optgroup label="Computer Vision">
                                <option value="conv2d">Conv2D</option>
                                <option value="maxpool2d">MaxPool2D</option>
                            </optgroup>
                            
                            
                        </select>
                    </div>

                    <div className="create-layer-line"></div>

                    {type == "dense" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-nodes-count">Number of nodes</label>
                            <input className="create-dataset-inp" id="layer-nodes-count" type="number" required value={nodesCount} onChange={(e) => {
                                setNodesCount(Math.max(0, Math.min(512, e.target.value)))
                            }} />
                        </div>

                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="dense-activation-function">Activation function</label>
                            <select className="create-dataset-inp" id="dense-activation-function" required value={activation} onChange={(e) => {
                                setActivation(e.target.value)
                            }}>
                                <option value="">-</option>
                                <option value="relu">ReLU</option>
                                <option value="softmax">Softmax</option>
                            </select>
                        </div>
                    </div>}

                    {type == "conv2d" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-filters">Number of filters</label>
                            <input className="create-dataset-inp" id="layer-filters" type="number" required value={filters} onChange={(e) => {
                                setFilters(Math.max(0, Math.min(100, e.target.value)))
                            }} />
                        </div>

                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-kernels">Kernel size</label>
                            <input className="create-dataset-inp" id="layer-kernels" type="number" required value={kernelSize} onChange={(e) => {
                                setKernelSize(Math.max(0, Math.min(100, e.target.value)))
                            }} />
                        </div>

                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label">Input dimensions <span className="create-dataset-required">(optional)</span></label>
                            <div className="create-layer-dimensions">
                                
                                <input className="create-dataset-inp create-layer-dimensions-inp" type="number" placeholder="Width" value={inputX} onChange={(e) => {
                                    setInputX(e.target.value)
                                }} />
                                <input className="create-dataset-inp create-layer-dimensions-inp create-layer-dimensions-inp-margin" placeholder="Height" type="number" value={inputY} onChange={(e) => {
                                    setInputY(e.target.value)
                                }} />
                                <input className="create-dataset-inp create-layer-dimensions-inp create-layer-dimensions-inp-margin" placeholder="Depth" type="number" value={inputZ} onChange={(e) => {
                                    setInputZ(e.target.value)
                                }} />
                                
                            </div>
                        </div>

                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="dense-activation-function">Activation function</label>
                            <select className="create-dataset-inp" id="dense-activation-function" value={activation} onChange={(e) => {
                                setActivation(e.target.value)
                            }}>
                                <option value="">-</option>
                                <option value="relu">ReLU</option>
                                <option value="softmax">Softmax</option>
                            </select>
                        </div>
                        
                    </div>}

                    {type == "maxpool2d" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="pool-size">Pool size</label>
                            <input className="create-dataset-inp" id="pool-size" type="number" required value={poolSize} onChange={(e) => {
                                setPoolSize(Math.max(0, Math.min(99, e.target.value)))
                            }} />
                        </div>
                    </div>}

                    {type == "flatten" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label">Input dimensions <span className="create-dataset-required">(optional)</span></label>
                            <div className="create-layer-dimensions">
                                <input className="create-dataset-inp create-layer-dimensions-inp" type="number" placeholder="Width" value={inputX} onChange={(e) => {
                                    setInputX(e.target.value)
                                }} />
                                <input className="create-dataset-inp create-layer-dimensions-inp create-layer-dimensions-inp-margin" placeholder="Height" type="number" value={inputY} onChange={(e) => {
                                    setInputY(e.target.value)
                                }} />
                            </div>
                        </div>
                    </div>}

                    {type == "dropout" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-rate">Rate</label>
                            <input className="create-dataset-inp" id="layer-rate" type="number" value={rate} step="0.05" onChange={(e) => {
                                setRate(Math.max(0, Math.min(1, e.target.value)))
                            }} />
                        </div>
                    </div>}

                    {type == "rescale" && <div className="create-layer-type-fields">
                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-scale">Scale</label>
                            <input className="create-dataset-inp" id="layer-scale" type="text" value={scale} onChange={(e) => {
                                setScale(e.target.value)
                            }} />
                        </div>

                        <div className="create-layer-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-offset">Offset</label>
                            <input className="create-dataset-inp" id="layer-offset" type="number" value={offset} step="0.01" onChange={(e) => {
                                setOffset(e.target.value)
                            }} />
                        </div>
                    </div>}

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowCreateLayerPopup(false)}>Cancel</button>
                        <button type="submit" className="create-layer-popup-submit">
                            {processingCreateLayer && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!processingCreateLayer ? "Create layer" : "Processing...")}
                        </button>
                    </div>
                    
                </form>
                
            </div>
        </div>
    )
}


export default CreateLayerPopup