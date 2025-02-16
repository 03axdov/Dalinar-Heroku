import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElementLoading({BACKEND_URL, isPublic=false}) {

    return (
        <div className="dataset-element">
            <div className="dataset-element-header" style={{height: "26px"}}>
                
                <p className="dataset-element-name"></p>

                {!isPublic && <img className="dataset-element-icon dataset-element-options" src={BACKEND_URL + "/static/images/options.png"} />}
                {isPublic && <span className="dataset-element-icon"></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image-container">
                <div className="dataset-element-image"></div>
            </div>

        </div>
    )
}


export default DatasetElementLoading