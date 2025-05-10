import React, {useState, useEffect} from "react"
import {LAYERS} from "../layers"
import Select from 'react-select';
import { customStyles } from "../helpers/styles";

function CreateLayerPopup({BACKEND_URL, setShowCreateLayerPopup, onSubmit, processingCreateLayer, notification, modelType}) {

    // Data fields for different layers
    const [type, setType] = useState("dense")
    
    const [params, setParams] = useState({})

    const [animateIn, setAnimateIn] = useState(false)

    const getLabeledOption = (value, text) => ({
        value,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
            }} className={"layer-element-stat-" + LAYERS[value].color} />
            {text}
          </div>
        ),
    });

    const commonOptions = [
        getLabeledOption('dense', 'Dense'),
        getLabeledOption('flatten', 'Flatten'),
        getLabeledOption('dropout', 'Dropout'),
        getLabeledOption('globalaveragepooling1d', 'GlobalAveragePooling1D'),
    ];
    
    const imageOptions = [
        {
            label: 'Image Preprocessing',
            options: [
                getLabeledOption('resizing', 'Resizing'),
                getLabeledOption('rescaling', 'Rescaling'),
                getLabeledOption('randomflip', 'RandomFlip'),
                getLabeledOption('randomrotation', 'RandomRotation'),
            ],
        },
        {
            label: 'Computer Vision',
            options: [
                getLabeledOption('conv2d', 'Conv2D'),
                getLabeledOption('maxpool2d', 'MaxPool2D'),
            ],
        },
        {
            label: 'Pretrained Models',
            options: [
                getLabeledOption('mobilenetv2', 'MobileNetV2 - 224x224x3'),
                getLabeledOption('mobilenetv2_96x96', 'MobileNetV2 - 96x96x3'),
               // getLabeledOption('mobilenetv2_32x32', 'MobileNetV2 - 32x32x3'), // Shouldn't be used as this seems pointless
            ],
        },
    ];
    
    const textOptions = [
        {
            label: 'Text',
            options: [
                getLabeledOption('embedding', 'Embedding'),
            ],
        },
    ];
    
    // Final merged structure
    const getLayerTypeOptions = (modelType) => {
        if (modelType.toLowerCase() === 'image') {
            return [
            { label: 'Miscellaneous', options: commonOptions },
            ...imageOptions,
            ];
        } else if (modelType.toLowerCase() === 'text') {
            return [
            { label: 'Miscellaneous', options: commonOptions },
            ...textOptions,
            ];
        } else {
            return [
            { label: 'Miscellaneous', options: commonOptions },
            ];
        }
    };

    const options = getLayerTypeOptions(modelType)
    
    useEffect(() => {
        // Trigger animation on mount
        setAnimateIn(true)
    }, [])

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
            if (layer.dimensions) {
                for (let i=0; i < layer.dimensions.length; i++) {
                    let dimension = layer.dimensions[i]
                    for (let i=0; i < dimension.params.length; i++) {
                        let param = dimension.params[i]
                        temp[param.name] = param.default
                    }
                }
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

    let activation_options = [
        {value:"", label: "-"},
        {value: "relu", label: "ReLU"},
        {value: "softmax", label: "Softmax"},
        {value: "sigmoid", label: "Sigmoid"}
    ]

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
                    let options = []
                    for (let i=0; i < param.choices.length; i++) {
                        let choice = param.choices[i]
                        options.push({
                            value: choice.value, label: choice.name || choice.value
                        })
                    }
                    return (<div className="create-layer-label-inp" key={idx}>
                        <label className="create-dataset-label" htmlFor={param.name}>{param.name_readable}</label>
                        <Select
                        inputId={param.name}
                        options={options}
                        value={options
                            .find((opt) => opt.value === params[param.name])}
                        onChange={(selected) => {
                            let temp = {...params}
                            temp[param.name] = selected.value
                            setParams(temp)
                        }}
                        styles={customStyles}
                        className="w-full"
                        />
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
                <Select
                    inputId="activation-function"
                    options={activation_options}
                    value={activation_options
                        .find((opt) => opt.value === params["activation_function"])}
                    onChange={(selected) => {
                        let temp = {...params}
                        temp["activation_function"] = selected.value
                        setParams(temp)
                    }}
                    styles={customStyles}
                    className="w-full"
                />
            </div>}

            {layer.params.length == 0 && (!layer.dimensions || layer.dimensions.length == 0) && !(layer.input_x || layer.input_y || layer.input_z) && !layer.activation_function && <p
            style={{margin: 0}}
            className="gray-text">
                This layer does not have any parameters to set.
            </p>}
        </div>
    }

    function isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    return (
        <div className="popup create-layer-popup" onClick={() => setShowCreateLayerPopup(false)}>
            <div className={"create-layer-popup-container " + (animateIn ? "slide-in" : "")} onClick={(e) => {
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

                    if (layer.dimensions) {
                        for (let i=0; i < layer.dimensions.length; i++) {
                            let dimension = layer.dimensions[i]
                            for (let i=0; i < dimension.params.length; i++) {
                                let param = dimension.params[i]
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
                        }
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

                    console.log(data)

                    onSubmit(data)
                }}>
                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="layer-type">Layer type</label>
                        <Select
                        inputId="layer-type"
                        options={options}
                        value={options
                            .flatMap((group) => group.options)
                            .find((opt) => opt.value === type)}
                        onChange={(selected) => setType(selected.value)}
                        styles={customStyles}
                        placeholder="Select a layer type"
                        className="w-full"
                        />
                    </div>

                    <div className="create-layer-line"></div>

                    {!isEmptyObject(params) && getInputs(type)}

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowCreateLayerPopup(false)}>Cancel</button>
                        <button type="submit" className="create-layer-popup-submit">
                            {processingCreateLayer && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!processingCreateLayer ? "Create layer" : "Processing...")}
                        </button>
                    </div>
                    
                </form>
                
            </div>
        </div>
    )
}


export default CreateLayerPopup