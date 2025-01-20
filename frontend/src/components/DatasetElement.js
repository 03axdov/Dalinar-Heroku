import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({dataset, isPublic=false}) {

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
            setKeywords(JSON.parse(dataset.keywords))
        }
    }, [dataset])

    

    return (
        <div className="dataset-element" onClick={onClick} onMouseEnter={() => setShowDescription(true)} onMouseLeave={() => {setShowDescription(false)}} >
            <div className="dataset-element-header">
                    
                {dataset.datatype == "classification" && <img title="Classification" className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/classification.png"}/>}
                {dataset.datatype == "area" && <img title="Area" className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/area.svg"}/>}
                
                <p className="dataset-element-name">{dataset.name}</p>

                {!isPublic && <img title="Edit dataset" className="dataset-element-icon dataset-element-options" src={window.location.origin + "/static/images/options.png"} onClick={(e) => {
                    e.stopPropagation()

                    navigate("/edit-dataset/" + dataset.id)
                }}/>}
                {isPublic && <span></span>} {/* As the container is flex space-between */}
            </div>
            
            <div className="dataset-element-image-container">
                {dataset.image && <img className="dataset-element-image" src={dataset.image}/>}
                {showDescription && dataset.description && <div className="dataset-element-description-container">
                    <p className="dataset-element-description">{dataset.description}</p>
                    {keywords.length > 0 && <div className="dataset-element-keywords-container">
                        {keywords.map((e, i) => (
                            <div title={e} key={i} className="dataset-element-keyword">{e}</div>
                        ))}
                    </div>}
                </div>}
            </div>
            
            

            {/* <p className="dataset-element-date">{(!isPublic ? formattedDate : dataset.downloaders.length + " download" + (dataset.downloaders.length != 1 ? "s" : ""))}</p> */}
            <p className="dataset-element-date">{dataset.downloaders.length + " download" + (dataset.downloaders.length != 1 ? "s" : "")}</p>
            <p className="dataset-element-count">{dataset.elements.length + " element" + (dataset.elements.length != 1 ? "s" : "")}</p>


        </div>
    )
}


export default DatasetElement