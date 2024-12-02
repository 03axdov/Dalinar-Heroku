import React from "react"

function DatasetElement({dataset}) {
    const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US")

    return (
        <div className="dataset-element">
            <div className="dataset-element-header">
            <img className="dataset-element-icon dataset-element-icon-type" src={window.location.origin + "/static/images/dataset.png"}/>
                <p className="dataset-element-name">{dataset.name}</p>
                <img className="dataset-element-icon dataset-element-options" src={window.location.origin + "/static/images/options.png"}/>
            </div>
            
            {dataset.image && <img className="dataset-element-image" src={dataset.image}/>}
            

        </div>
    )
}


export default DatasetElement