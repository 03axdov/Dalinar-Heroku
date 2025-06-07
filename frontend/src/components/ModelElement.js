import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({model, BACKEND_URL, isPublic=false}) {

    const [showDescription, setShowDescription] = useState(false)

    const formattedDate = new Date(model.created_at).toLocaleDateString("en-US")
    const navigate = useNavigate()

    function onClick(e) {
        e.preventDefault()
        const URL = window.location.origin + "/models/" + (isPublic ? "public/" : "") +  model.id
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <a className="dataset-element" 
        href={"/models/" + (isPublic ? "public/" : "") + model.id}
        onClick={onClick} 
        onMouseEnter={() => setShowDescription(true)} 
        onMouseLeave={() => {setShowDescription(false)}} >
            <div className="dataset-element-header">
                    
                <img title="Model" className="dataset-element-icon dataset-element-icon-type" src={BACKEND_URL + "/static/images/model.svg"} alt="Model" />
                
                <div className="dataset-element-name" title={model.name}>
                    <p className="dataset-element-name-inner">{model.name}</p>
                    {model.verified && <img title="Verified" className="dataset-element-name-verified" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue checkmark" />}
                </div>

                {!isPublic && <img title="Edit model" className="dataset-element-icon dataset-element-options" src={BACKEND_URL + "/static/images/options.png"} alt="Edit" onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()

                    navigate("/edit-model/" + model.id)
                }}/>}
                {isPublic && <span className="dataset-element-icon-empty"></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image-container">
                {model.imageSmall && <img className="dataset-element-image" src={model.imageSmall} alt="Model image" />}
                {showDescription && model.description && <div className="model-element-description-container">
                    <p className="model-element-description">{model.description}</p>
                </div>}
            </div>
            
            {!isPublic && <p className="dataset-element-private">{model.visibility}</p>}
            {model.downloaders && <p className="dataset-element-date">{model.downloaders.length + " download" + (model.downloaders.length != 1 ? "s" : "")}</p>}
            {model.layers && <p className="dataset-element-count">{model.layers.length + " layer" + (model.layers.length != 1 ? "s" : "")}</p>}
            {model.model_file && <p className="dataset-element-datatype">Built</p>}
            <p className="dataset-element-shape">{model.model_type.charAt(0).toUpperCase() + model.model_type.slice(1)}</p>

        </a>
    )
}


export default DatasetElement