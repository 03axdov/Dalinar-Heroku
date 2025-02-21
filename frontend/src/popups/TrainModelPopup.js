import React, {useState} from "react"

function TrainModelPopup({setShowTrainModelPopup, BACKEND_URL}) {

    return (
        <div className="popup train-model-popup" onClick={() => setShowTrainModelPopup(false)}>
            
        </div>
    )
}


export default TrainModelPopup