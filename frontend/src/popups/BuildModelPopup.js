import React, {useState} from "react"
import Select from "react-select"
import { customStyles } from "../helpers/styles"

function BuildModelPopup({setShowBuildModelPopup, buildModel, processingBuildModel, BACKEND_URL, isBuilt, recompileModel, processingRecompile, activateConfirmPopup, model_type, instance_optimizer, instance_loss_function}) {

    const [optimizer, setOptimizer] = useState(instance_optimizer || "adam")
    const [learningRate, setLearningRate] = useState(0.001)
    const [loss, setLoss] = useState(instance_loss_function || "categorical_crossentropy")
    const [inputSequenceLength, setInputSequenceLength] = useState(256)

    const optimizerOptions = [
        {value: "adam", label: "adam"},
        {value: "adagrad", label: "adagrad"},
        {value: "adadelta", label: "adadelta"},
        {value: "adamax", label: "adamax"},
        {value: "sgd", label: "sgd"},
        {value: "rmsprop", label: "rmsprop"}
    ]

    const lossOptions = [
        {value: "binary_crossentropy", label: "binary_crossentropy"},
        {value: "categorical_crossentropy", label: "categorical_crossentropy"},
        {value: "sparse_categorical_crossentropy", label: "sparse_categorical_crossentropy"}
    ]

    return (
        <div className="popup build-model-popup" onClick={() => setShowBuildModelPopup(false)}>
            <div className="build-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Build model</h1>
                <p className="create-layer-popup-description">
                    Building a model generates the actual model file. The model can then be trained and downloaded. 
                    Note that rebuilding the model will <span style={{color: "white"}}>reset the weights</span> of all layers with 'Update on build' set to True. Recompiling will not reset these, but only recompiles the last built model (i.e. not any changes made since). 
                    <br></br>
                    <br></br>
                    Note that recompiling will update which layers are trainable, without resetting weights. Trainable will be updated when building regardless of Update on build.
                </p>

                <form className="build-model-form" onSubmit={(e) => {
                    e.preventDefault()
                    if (isBuilt) {
                        activateConfirmPopup("Are you sure you want to rebuild the model? This will reset all parameters for layers with 'Update on build' set to True.", () => buildModel(optimizer, learningRate, loss, inputSequenceLength), "blue")
                    } else {
                        buildModel(optimizer, learningRate, loss, inputSequenceLength)
                    }
                    
                }}>
                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="optimizer">Optimizer</label>

                        <Select
                        inputId="optimizer"
                        options={optimizerOptions}
                        value={optimizerOptions
                            .find((opt) => opt.value === optimizer)}
                        onChange={(selected) => setOptimizer(selected.value)}
                        styles={customStyles}
                        placeholder="Select an optimizer"
                        className="w-full"
                        />
                    </div>

                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="learning_rate">Learning rate</label>
                        <input type="number" className="create-dataset-inp" step="0.005" style={{width: "100px"}} id="learning_rate" required value={learningRate} onChange={(e) => {
                            setLearningRate(Math.max(0, Math.min(1, e.target.value)))
                        }} />
                    </div>

                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="loss">Loss function</label>

                        <Select
                        inputId="loss"
                        options={lossOptions}
                        value={lossOptions
                            .find((opt) => opt.value === loss)}
                        onChange={(selected) => setLoss(selected.value)}
                        styles={customStyles}
                        placeholder="Select a loss function"
                        className="w-full"
                        />
                    </div>
                    
                    {model_type.toLowerCase() == "text" && <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="inputSequenceLength">Input sequence length</label>
                        <input className="create-dataset-inp" type="number" id="inputSequenceLength" required value={inputSequenceLength} onChange={(e) => {
                            setInputSequenceLength(e.target.value)
                        }}></input>
                    </div>}

                    <div className="create-layer-popup-buttons">
                        <button type="button" style={{marginRight: "auto"}} className="create-layer-popup-cancel" onClick={() => setShowBuildModelPopup(false)}>Cancel</button>
                        {isBuilt && <button type="button" className="create-layer-popup-submit build-model-recompile" onClick={() => {
                            recompileModel(optimizer, learningRate, loss, inputSequenceLength)
                        }}>
                            {processingRecompile && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!processingRecompile ? "Recompile" : "Compiling...")}
                        </button>}
                        <button type="submit" className="create-layer-popup-submit">
                            {processingBuildModel && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!processingBuildModel ? (!isBuilt ? "Build model" : "Rebuild model") : "Building...")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}


export default BuildModelPopup