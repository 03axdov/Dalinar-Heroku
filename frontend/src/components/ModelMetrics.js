import React, { useState } from 'react';
import TrainingGraph from "../components/TrainingGraph";
import TrainingTable from "../components/TrainingTable";

const ModelMetrics = ({ data, show_validation, trained_on_name, model, BACKEND_URL }) => {
    const [epochTypeShown, setEpochTypeShown] = useState("training")    // "training" or "validation"

    return (
    <div className="model-metrics-container">
        {trained_on_name && <div className="train-model-successful-row" style={{margin: 0}}>
            <div className="model-metrics-title" onClick={() => {
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
        </div>}
        {show_validation && <div className="train-model-successful-row">
            <div className="train-model-dataset-type-container">
                <div className={"train-model-dataset-type-left train-model-dataset-type " + (epochTypeShown == "training" ? "train-model-dataset-type-selected" : "")}
                onClick={() => setEpochTypeShown("training")}>Training</div>
                <div className={"train-model-dataset-type-right train-model-dataset-type " + (epochTypeShown == "validation" ? "train-model-dataset-type-selected" : "")}
                onClick={() => setEpochTypeShown("validation")}>Validation</div>
            </div>
        </div>}
        <TrainingGraph data={data} is_validation={epochTypeShown == "validation"}/>
        <TrainingTable data={data} show_validation={epochTypeShown == "validation"} />
    </div>
    );
};

export default ModelMetrics;