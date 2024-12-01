import React from "react"

function DatasetElement({dataset}) {
    const formattedDate = new Date(dataset.created_at).toLocaleDateString("en-US")

    return (
        <div className="dataset-element">
            <p className="dataset-element-name">{dataset.name}</p>
            {dataset.image && <img className="dataset-element-image" src={dataset.image}/>}
            <p className="truncate dataset-element-description">{dataset.description}</p>

        </div>
    )
}


export default DatasetElement