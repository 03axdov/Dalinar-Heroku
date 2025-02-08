import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({model, BACKEND_URL, isPublic=false}) {

    const [showDescription, setShowDescription] = useState(false)

    const formattedDate = new Date(model.created_at).toLocaleDateString("en-US")
    const navigate = useNavigate()

    function onClick() {
        const URL = window.location.origin + "/models/" + (isPublic ? "public/" : "") +  model.id
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <div className="dataset-element" onClick={onClick} onMouseEnter={() => setShowDescription(true)} onMouseLeave={() => {setShowDescription(false)}} >
            <div className="dataset-element-header">
                    
                <img title="Model" className="dataset-element-icon dataset-element-icon-type" src={BACKEND_URL + "/static/images/model.svg"}/>
                
                <p className="dataset-element-name" title={model.name}>
                    {model.name}
                    {model.verified && <img title="Verified" className="dataset-element-name-verified" src={BACKEND_URL + "/static/images/blueCheck.png"} />}
                </p>

                {!isPublic && <img title="Edit model" className="dataset-element-icon dataset-element-options" src={BACKEND_URL + "/static/images/options.png"} onClick={(e) => {
                    e.stopPropagation()

                    navigate("/edit-model/" + model.id)
                }}/>}
                {isPublic && <span className="dataset-element-icon-empty"></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image-container">
                {model.imageSmall && <img className="dataset-element-image" src={model.imageSmall}/>}
                {showDescription && model.description && <div className="dataset-element-description-container">
                    <p className="dataset-element-description">{model.description}</p>
                </div>}
            </div>
            
            {!isPublic && <p className="dataset-element-private">{model.visibility}</p>}
            {model.downloaders && <p className="dataset-element-date">{model.downloaders.length + " download" + (model.downloaders.length != 1 ? "s" : "")}</p>}
            {model.layers && <p className="dataset-element-count">{model.layers.length + " layer" + (model.layers.length != 1 ? "s" : "")}</p>}

        </div>
    )
}


export default DatasetElement