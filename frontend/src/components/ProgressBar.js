import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import TrainingGraph from "./TrainingGraph"

function ProgressBar({progress, message, BACKEND_URL, training_data=null}) {
    
    return (<div className="progress-bar-outer" onClick={(e) => e.stopPropagation()}>
        <div className={"progress-bar-container-outer " + (training_data ? "progress-bar-long" : "")}>
            <div className="progress-bar-container" style={{marginBottom: (training_data ? "20px" : "0")}}>
                <img className="progress-bar-spinner" src={BACKEND_URL + "/static/images/loading.gif"} />
                <p className="progress-bar-text">{message}</p>
                <div className="progress-bar">
                    <div className="progress-bar-completed" style={{width: (progress + "%")}}></div>
                </div>
            </div>

            {training_data && <TrainingGraph data={training_data} is_training={true} border={false}/>}
        </div>
    </div>)
}


export default ProgressBar