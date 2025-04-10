import React, {useState} from "react"

function BuildModelPopup({setShowBuildModelPopup, buildModel, processingBuildModel, BACKEND_URL, isBuilt, recompileModel, processingRecompile, activateConfirmPopup, model_type, instance_optimizer, instance_loss_function}) {

    const [optimizer, setOptimizer] = useState(instance_optimizer || "adam")
    const [learningRate, setLearningRate] = useState(0.001)
    const [loss, setLoss] = useState(instance_loss_function || "categorical_crossentropy")
    const [inputSequenceLength, setInputSequenceLength] = useState(256)

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
                        <select className="create-dataset-inp" id="optimizer" required value={optimizer} onChange={(e) => {
                            setOptimizer(e.target.value)
                        }}>
                            <option value="adam">adam</option>
                            <option value="adagrad">adagrad</option>
                            <option value="adadelta">adadelta</option>
                            <option value="adamax">adamax</option>
                            <option value="sgd">sgd</option>
                            <option value="rmsprop">rmsprop</option>

                        </select>
                    </div>

                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="learning_rate">Learning rate</label>
                        <input type="number" className="create-dataset-inp" step="0.005" style={{width: "100px"}} id="learning_rate" required value={learningRate} onChange={(e) => {
                            setLearningRate(Math.max(0, Math.min(1, e.target.value)))
                        }} />
                    </div>

                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="loss">Loss function</label>
                        <select className="create-dataset-inp" id="loss" required value={loss} onChange={(e) => {
                            setLoss(e.target.value)
                        }}>
                            <option value="binary_crossentropy">binary_crossentropy</option>
                            <option value="categorical_crossentropy">categorical_crossentropy</option>
                            <option value="sparse_categorical_crossentropy">sparse_categorical_crossentropy</option>

                        </select>
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