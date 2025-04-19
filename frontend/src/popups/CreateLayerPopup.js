import React, {useState, useEffect} from "react"
import {LAYERS} from "../layers"

function CreateLayerPopup({BACKEND_URL, setShowCreateLayerPopup, onSubmit, processingCreateLayer, notification, modelType}) {

    // Data fields for different layers
    const [type, setType] = useState("dense")
    
    const [params, setParams] = useState({})

    useEffect(() => {
        let temp = {
            "input_x": "",
            "input_y": "",
            "input_z": "",
            "activation_function": ""
        }
        Object.keys(LAYERS).forEach((key) => {
            let layer = LAYERS[key]
            for (let i=0; i < layer.params.length; i++) {
                let param = layer.params[i]
                temp[param.name] = param.default
            }
        })
        setParams(temp)
    }, [type])

    function checkInputDimensions(layer) {  // Adds dimensions, returns true if valid else false
        let input_x = params["input_x"]
        let input_y = params["input_y"]
        let input_z = params["input_z"]
        let numDims = 0
        if (layer.input_x) {
            numDims += 1
            if (input_x && input_x <= 0 || input_x > 1024) return "Input dimensions must be between 0 and 1024."
        }
        if (layer.input_y) {
            numDims += 1
            if (input_y && input_y <= 0  || input_y > 1024) return "Input dimensions must be between 0 and 1024."
        }
        if (layer.input_z) {
            numDims += 1
            if (input_z && input_z <= 0 || input_z > 1024) return "Input dimensions must be between 0 and 1024."
        }

        let notSpecifiedDims = numDims
        if (layer.input_x && params.input_x) notSpecifiedDims -= 1
        if (layer.input_y && params.input_y) notSpecifiedDims -= 1
        if (layer.input_z && params.input_z) notSpecifiedDims -= 1
        
        if (notSpecifiedDims == numDims || notSpecifiedDims == 0) {
            return ""
        } else {
            return "You must specify all dimensions or none of them."
        }
    }

    function getInputs(type) {
        let layer = LAYERS[type]

        return <div className="create-layer-type-fields">
            {layer.params.map((param, idx) => {
                if (!param.choices) {
                    return (<div key={idx} className="create-layer-label-inp">
                        <label className="create-dataset-label" htmlFor={param.name}>{param.name_readable}</label>
                        <input className="create-dataset-inp" id={param.name} type={param.type} step={(param.step || 1)} value={params[param.name]} onChange={(e) => {
                            let temp = {...params}
                            temp[param.name] = e.target.value
                            setParams(temp)
                        }} {...(param.required ? { required: true } : {})}/>
                    </div>)
                } else {
                    return (<div className="create-layer-label-inp" key={idx}>
                        <label className="create-dataset-label" htmlFor={param.name}>{param.name_readable}</label>
                        <select className="create-dataset-inp" id={param.name} value={params[param.name]} onChange={(e) => {
                            let temp = {...params}
                            temp[param.name] = e.target.value
                            setParams(temp)
                        }}>
                            {param.choices.map((choice, idx2) => (
                                <option key={idx2} value={choice.value}>{(choice.name || choice.value)}</option>
                            ))}
                        </select>
                    </div>)
                }
            })}
            {layer.dimensions && layer.dimensions.map((dimension, idx) => (
                <div className="create-layer-label-inp" key={idx}>
                    <label className="create-dataset-label">{dimension.name}</label>
                    <div className="create-layer-dimensions">
                        {dimension.params.map((param, idx2) => (
                            <input key={idx2} className="create-dataset-inp create-layer-dimensions-inp" type={param.type} placeholder={param.name_readable} value={params[param.name]} onChange={(e) => {
                                let temp = {...params}
                                temp[param.name] = e.target.value
                                setParams(temp)
                            }} {...(param.required ? { required: true } : {})}/>
                        ))}
                    </div>
                </div>
            ))}
            {(layer.input_x || layer.input_y || layer.input_z) && <div className="create-layer-label-inp">
                <label className="create-dataset-label">Input dimensions <span className="create-dataset-required">(optional)</span></label>
                <div className="create-layer-dimensions">
                    {layer.input_x && <input className="create-dataset-inp create-layer-dimensions-inp" type="number" placeholder="Width" value={params["input_x"]} onChange={(e) => {
                        let temp = {...params}
                        temp["input_x"] = e.target.value
                        setParams(temp)
                    }} />}
                    {layer.input_y && <input className="create-dataset-inp create-layer-dimensions-inp" type="number" placeholder="Height" value={params["input_y"]} onChange={(e) => {
                        let temp = {...params}
                        temp["input_y"] = e.target.value
                        setParams(temp)
                    }} />}
                    {layer.input_z && <input className="create-dataset-inp create-layer-dimensions-inp" type="number" placeholder="Depth" value={params["input_z"]} onChange={(e) => {
                        let temp = {...params}
                        temp["input_z"] = e.target.value
                        setParams(temp)
                    }} />}
                </div>
            </div>}
            {layer.activation_function && <div className="create-layer-label-inp">
                <label className="create-dataset-label" htmlFor="activation-function">Activation function</label>
                <select className="create-dataset-inp" id="activation-function" value={params["activation_function"]} onChange={(e) => {
                    let temp = {...params}
                    temp["activation_function"] = e.target.value
                    setParams(temp)
                }}>
                    <option value="">-</option>
                    <option value="relu">ReLU</option>
                    <option value="softmax">Softmax</option>
                    <option value="sigmoid">Sigmoid</option>
                </select>
            </div>}
        </div>
    }

    function isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    }

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
                        "activation_function": params["activation_function"],
                        "input_x": params["input_x"],
                        "input_y": params["input_y"],
                        "input_z": params["input_z"]
                    }

                    let layer = LAYERS[type]
                    for (let i=0; i < layer.params.length; i++) {
                        let param = layer.params[i]
                        if (param.required && !params[param.name] && params[param.name] !== 0) {
                            notification("Please enter " + param.name, "failure")
                            return
                        }
                        
                        if (param.validator) {
                            let message = param.validator(params[param.name])
                            if (message.length > 0) {
                                notification(message, "failure")
                                return
                            }
                        }

                        data[param.name] = params[param.name]
                    }
                    if (layer.input_x || layer.input_y || layer.input_y) {
                        let message = checkInputDimensions(layer)
                        if (message.length > 0) {
                            notification(message, "failure")
                            return
                        }
                    }
 
                    if (!layer.activation_function) {
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
                                <option value="globalaveragepooling1d">GlobalAveragePooling1D</option>
                            </optgroup>
                            {modelType.toLowerCase() == "image" && <optgroup label="Image Preprocessing">
                                <option value="resizing">Resizing</option>
                                <option value="rescaling">Rescaling</option>
                                <option value="randomflip">RandomFlip</option>
                                <option value="randomrotation">RandomRotation</option>
                            </optgroup>}
                            {modelType.toLowerCase() == "image" && <optgroup label="Computer Vision">
                                <option value="conv2d">Conv2D</option>
                                <option value="maxpool2d">MaxPool2D</option>
                            </optgroup>}
                            {modelType.toLowerCase() == "image" && <optgroup label="Pretrained Models">
                                <option value="mobilenetv2">MobileNetV2</option>
                            </optgroup>}
                            {modelType.toLowerCase() == "text" && <optgroup label="Text">
                                <option value="embedding">Embedding</option>
                            </optgroup>}
                            
                        </select>
                    </div>

                    <div className="create-layer-line"></div>

                    {!isEmptyObject(params) && getInputs(type)}

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