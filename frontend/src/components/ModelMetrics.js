import React, { useState } from 'react';
import TrainingGraph from "../components/TrainingGraph";
import TrainingTable from "../components/TrainingTable";

const ModelMetrics = ({ data, val_split, trained_on_name, model, BACKEND_URL }) => {
    const [epochTypeShown, setEpochTypeShown] = useState("training")    // "training" or "validation"

    return (
    <div className="model-metrics-container">
        <div className="train-model-successful-row">
            <div title={"Last trained on " + trained_on_name} className="model-metrics-title" onClick={() => {
                    if (model.trained_on) {
                        const URL = window.location.origin + "/datasets/" + (model.trained_on.visibility == "public" ? "public/" : "") + model.trained_on.id
                        var win = window.open(URL, '_blank');
                        win.focus();
                    } else {
                        const URL = "https://www.tensorflow.org/api_docs/python/tf/keras/datasets/" + model.trained_on_tensorflow + "/load_data"
                        var win = window.open(URL, '_blank');
                        win.focus();
                    }
                    
                }}>
                <img className="model-metrics-dataset-icon" src={BACKEND_URL + "/static/images/database.svg"} />
                {trained_on_name}
            </div>
            
            {val_split &&<div className="model-metrics-validation">
                <div className="model-metrics-split">
                    Validation split: {val_split}
                </div>
                <div className="train-model-dataset-type-container" style={{marginRight: 0}}>
                    <div className={"train-model-dataset-type-left train-model-dataset-type " + (epochTypeShown == "training" ? "train-model-dataset-type-selected" : "")}
                    onClick={() => setEpochTypeShown("training")}>Training</div>
                    <div className={"train-model-dataset-type-right train-model-dataset-type " + (epochTypeShown == "validation" ? "train-model-dataset-type-selected" : "")}
                    onClick={() => setEpochTypeShown("validation")}>Validation</div>
                </div>
            </div>}
        </div>
        
        <TrainingGraph data={data} is_validation={epochTypeShown == "validation"}/>
        <TrainingTable data={data} show_validation={epochTypeShown == "validation"} />
    </div>
    );
};

export default ModelMetrics;