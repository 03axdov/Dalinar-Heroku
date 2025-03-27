import React, { useState } from 'react';
import TrainingGraph from "../components/TrainingGraph";
import TrainingTable from "../components/TrainingTable";

const ModelMetrics = ({ data, show_validation }) => {
    const [epochTypeShown, setEpochTypeShown] = useState("training")    // "training" or "validation"

    return (
    <div className="model-metrics-container">
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