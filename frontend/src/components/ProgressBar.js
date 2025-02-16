import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function ProgressBar({progress, message, BACKEND_URL}) {
    

    return (<div className="progress-bar-outer">
        <div className="progress-bar-container">
            <img className="progress-bar-spinner" src={BACKEND_URL + "/static/images/loading.gif"} />
            <p className="progress-bar-text">{message}</p>
            <div className="progress-bar">
                <div className="progress-bar-completed" style={{width: (progress + "%")}}></div>
            </div>
        </div>
    </div>)
}


export default ProgressBar