import React, {useState} from "react"

function BuildModelPopup({setShowBuildModelPopup, buildModel}) {

    const [optimizer, setOptimizer] = useState("adam")
    const [loss, setLoss] = useState("binary_crossentropy")

    return (
        <div className="popup build-model-popup" onClick={() => setShowBuildModelPopup(false)}>
            <div className="build-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Build model</h1>
                <p className="create-layer-popup-description">
                    Building a model generates the actual model file. The model can then be trained and downloaded. 
                    Note that rebuilding the model will reset it, i.e. updates from training will be erased. A model can be rebuilt as many times as wanted.
                </p>

                <form className="build-model-form">
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
                        <label className="create-dataset-label" htmlFor="loss">Loss function</label>
                        <select className="create-dataset-inp" id="loss" required value={loss} onChange={(e) => {
                            setLoss(e.target.value)
                        }}>
                            <option value="binary_crossentropy">binary_crossentropy</option>
                            <option value="categorical_crossentropy">categorical_crossentropy</option>
                            <option value="sparse_categorical_crossentropy">sparse_categorical_crossentropy</option>

                        </select>
                    </div>
                    <p className="create-layer-popup-description">
                        Note that the difference between categorical crossentropy and sparse categorical crossentropy 
                        will only matter if the model is downloaded and loaded externally.
                    </p>
                </form>
            </div>
        </div>
    )
}


export default BuildModelPopup