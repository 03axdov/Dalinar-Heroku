import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElementLoading({isPublic=false}) {

    return (
        <div className="dataset-element">
            <div className="dataset-element-header">
                
                <p className="dataset-element-name"></p>

                {!isPublic && <img className="dataset-element-icon dataset-element-options" src={window.location.origin + "/static/images/options.png"} />}
                {isPublic && <span></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image"></div>
        


        </div>
    )
}


export default DatasetElementLoading