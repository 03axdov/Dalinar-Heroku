import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({dataset, BACKEND_URL, isPublic=false}) {

    const [showDescription, setShowDescription] = useState(false)
    const [keywords, setKeywords] = useState([])

    const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US")
    const navigate = useNavigate()

    function onClick() {
        const URL = window.location.origin + "/datasets/" + (isPublic ? "public/" : "") +  dataset.id
        var win = window.open(URL, '_blank');
        win.focus();
    }

    useEffect(() => {
        if (dataset.keywords.length > 0) {
            setKeywords(dataset.keywords)
        }
    }, [dataset])

    

    return (
        <div className="dataset-element" onClick={onClick} onMouseEnter={() => setShowDescription(true)} onMouseLeave={() => {setShowDescription(false)}} >
            <div className="dataset-element-header">
                    
                {dataset.datatype == "classification" && <img title="Classification" className="dataset-element-icon dataset-element-icon-type" src={BACKEND_URL + "/static/images/classification.png"}/>}
                {dataset.datatype == "area" && <img title="Area" className="dataset-element-icon dataset-element-icon-type" src={BACKEND_URL + "/static/images/area.svg"}/>}
                
                <p className="dataset-element-name" title={dataset.name}>
                    {dataset.name}
                    {dataset.verified && <img title="Verified" className="dataset-element-name-verified" src={BACKEND_URL + "/static/images/blueCheck.png"} />}
                </p>

                {!isPublic && <img title="Edit dataset" className="dataset-element-icon dataset-element-options" src={BACKEND_URL + "/static/images/options.png"} onClick={(e) => {
                    e.stopPropagation()

                    navigate("/edit-dataset/" + dataset.id)
                }}/>}
                {isPublic && <span className="dataset-element-icon-empty"></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image-container">
                {dataset.image && <img className="dataset-element-image" src={dataset.imageSmall}/>}
                {showDescription && dataset.description && <div className="dataset-element-description-container">
                    <p className="dataset-element-description">{dataset.description}</p>
                    {keywords.length > 0 && <div className="dataset-element-keywords-container">
                        {keywords.map((e, i) => (
                            <div title={e} key={i} className="dataset-element-keyword">{e}</div>
                        ))}
                    </div>}
                </div>}
            </div>
            
            {dataset && !isPublic && <p className="dataset-element-private">{dataset.visibility}</p>}
            <p className="dataset-element-date">{dataset.downloaders.length + " download" + (dataset.downloaders.length != 1 ? "s" : "")}</p>
            <p className="dataset-element-count">{dataset.elements.length + " element" + (dataset.elements.length != 1 ? "s" : "")}</p>
            <p className="dataset-element-labels">{dataset.labels.length + " label" + (dataset.labels.length != 1 ? "s" : "")}</p>
            {dataset && dataset.imageWidth && dataset.imageHeight && <p className="dataset-element-shape">
                {dataset.imageWidth}x{dataset.imageHeight}
            </p>}


        </div>
    )
}


export default DatasetElement