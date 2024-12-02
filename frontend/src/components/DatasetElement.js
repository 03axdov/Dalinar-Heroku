import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function DatasetElement({dataset}) {
    const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US")
    const navigate = useNavigate()

    const [showDateCount, setShowDateCount] = useState(true)

    function mouseEnter() {
        // setShowDateCount(false)
    }

    function mouseLeave() {
        // setShowDateCount(true)
    }

    return (
        <div className="dataset-element" onClick={() => navigate("/datasets/" + dataset.id)} onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}>
            <div className="dataset-element-header">
            <img className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/dataset.png"}/>
                <p className="dataset-element-name">{dataset.name}</p>
                <img className="dataset-element-icon dataset-element-options" src={window.location.origin + "/static/images/options.png"}/>
            </div>
            
            {dataset.image && <img className="dataset-element-image" src={dataset.image}/>}
            

            {showDateCount && <p className="dataset-element-date">{formattedDate}</p>}
            {showDateCount && <p className="dataset-element-count">{dataset.element_count + " element" + (dataset.element_count != 1 ? "s" : "")}</p>}


        </div>
    )
}


export default DatasetElement