import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({dataset, isPublic=false}) {
    const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US")
    const navigate = useNavigate()

    function onClick() {
        const URL = window.location.origin + "/datasets/" + (isPublic ? "public/" : "") +  dataset.id
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <div className="dataset-element" onClick={onClick} >
            <div className="dataset-element-header">
                    
                {dataset.datatype == "classification" && <img title="Classfication" className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/classification.png"}/>}
                {dataset.datatype == "area" && <img title="Area" className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/area.svg"}/>}
                
                <p className="dataset-element-name">{dataset.name}</p>

                {!isPublic && <img title="Edit dataset" className="dataset-element-icon dataset-element-options" src={window.location.origin + "/static/images/options.png"} onClick={(e) => {
                    e.stopPropagation()

                    navigate("/edit-dataset/" + dataset.id)
                }}/>}
                {isPublic && <span></span>} {/* As the container is flex space-between */}
            </div>
            
            {dataset.image && <img className="dataset-element-image" src={dataset.image}/>}
            

            <p className="dataset-element-date">{(!isPublic ? formattedDate : dataset.downloaders.length + " download" + (dataset.downloaders.length != 1 ? "s" : ""))}</p>
            <p className="dataset-element-count">{dataset.elements.length + " element" + (dataset.elements.length != 1 ? "s" : "")}</p>


        </div>
    )
}


export default DatasetElement