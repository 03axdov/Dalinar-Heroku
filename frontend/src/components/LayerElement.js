import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"

function LayerElement({layer, hoveredLayer, deleteLayer, BACKEND_URL, getModel, notification, hasLine, prevLayer, setWarnings}) {

    const [type, setType] = useState(null)  // Workaround to stop warning when reordering layers.

    const [nodes, setNodes] = useState(layer.nodes_count)   // Used by ["dense"]
    const [filters, setFilters] = useState(layer.filters)   // Used by ["conv2d"]
    const [kernelSize, setKernelSize] = useState(layer.kernel_size) // USed by ["conv2d"]
    const [inputX, setInputX] = useState(layer.input_x)
    const [inputY, setInputY] = useState(layer.input_y)
    const [activation, setActivation] = useState(layer.activation_function)

    const [updated, setUpdated] = useState(false)

    const [errorMessage, setErrorMessage] = useState("")

    const elementRef = useRef(null)

    useEffect(() => {
        setNodes(layer.nodes_count)
        setFilters(layer.filters)
        setKernelSize(layer.kernel_size)
        setInputX(layer.input_x)
        setInputY(layer.input_y)
        setActivation(layer.activation_function)

        setType(layer.layer_type)

    }, [layer])

    useEffect(() => {
        getErrorMessage()
    }, [layer, prevLayer])

    useEffect(() => {
        if (nodes != layer.nodes_count) {
            setUpdated(true)
        } else if (filters != layer.filters) {
            setUpdated(true)
        } else if (kernelSize != layer.kernel_size) {
            setUpdated(true)
        } else if (activation != layer.activation_function) {
            setUpdated(true)
        } else {
            setUpdated(false)
        }
    }, [nodes, filters, kernelSize, activation])

    function updateLayer(e) {
        const data = {
            "id": layer.id,
            "type": layer.layer_type,

            "nodes_count": nodes,
            "filters": filters,
            "kernel_size": kernelSize,

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
        if (!prevLayer) {return}    // Currently no issues that can arise in this case

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
            if (prevType == "dense") {
                errorMessage += "A Conv2D layer cannot follow a Dense layer."
                setWarnings(true)
            }
        }

        setErrorMessage(errorMessage)
    }

    return (<div className="layer-element-outer">

            {type && layer && <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")} ref={elementRef}>

                {errorMessage && <p className="layer-element-warning">
                    <img className="layer-element-warning-icon" src={BACKEND_URL + "/static/images/failure.png"} />
                    <span className="layer-element-warning-text">{errorMessage}</span>
                </p>}

                {type == "dense" && <form className="layer-element-inner">
                    <h1 className="layer-element-title">
                        <img className="layer-element-title-icon" src={BACKEND_URL + "/static/images/dense.svg"} />
                        Dense
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
                    <span className="layer-element-stat-color layer-element-stat-blue"></span>
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
                        <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                            deleteLayer(layer.id)
                        }}/>
                    </h1>

                    {inputX && <div className="layer-element-stat">
                        <span className="layer-element-stat-color layer-element-stat-pink"></span>
                        <label className="layer-element-label" htmlFor="flattenX">Input width</label>
                        <input type="number" className="layer-element-input" id="flattenX" value={inputX} onChange={(e) => {
                            setInputX(e.target.value)
                        }}></input>
                    </div>}

                    {inputY && <div className="layer-element-stat">
                        <span className="layer-element-stat-color layer-element-stat-pink2"></span>
                        <label className="layer-element-label" htmlFor="flattenY">Input height</label>
                        <input type="number" className="layer-element-input" id="flattenY" value={inputY} onChange={(e) => {
                            setInputY(e.target.value)
                        }}></input>
                    </div>}
                </form>}

                <button type="button" 
                className={"layer-element-save " + (!updated ? "layer-element-save-disabled" : "")}
                title={(updated ? "Save changes" : "No changes")}
                onClick={updateLayer}>
                Save changes
                </button>
            </div>}

            {hasLine && type && <div className="layer-element-connection"></div>}
    </div>)
}


export default LayerElement