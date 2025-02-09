import React, {useState} from "react"

function CreateLayerPopup({BACKEND_URL, setShowCreateLayerPopup, onSubmit, processingCreateLayer}) {

    const [type, setType] = useState("dense")
    const [nodesCount, setNodesCount] = useState(5) // Used for layers of type ["dense"]

    return (
        <div className="popup create-layer-popup" onClick={() => setShowCreateLayerPopup(false)}>
            <div className="create-layer-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Add layer</h1>
                <p className="create-layer-popup-description">
                    Machine learning models consist of several layers following each other. Note that ordering is important;
                    some layers can only follow certain layers. Warnings will be shown for invalid combinations.
                </p>

                <form className="create-layer-popup-form" onSubmit={(e) => {
                    e.preventDefault()

                    let data = {
                        "type": type,
                        "nodes_count": nodesCount
                    }

                    onSubmit(data)
                }}>
                    <div className="create-dataset-label-inp">
                        <label className="create-dataset-label" htmlFor="layer-type">Layer type</label>
                        <select className="create-dataset-inp" id="layer-type" required value={type} onChange={(e) => {
                            setType(e.target.value)
                        }}>
                            <option value="dense">Dense</option>
                            <option value="conv2d">Conv2D</option>
                        </select>
                    </div>

                    {type == "dense" && <div className="create-layer-type-fields">
                        <div className="create-dataset-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-nodes-count">Number of nodes <span className="create-dataset-required">(required)</span></label>
                            <input className="create-dataset-inp" id="layer-nodes-count" type="number" required value={nodesCount} onChange={(e) => {
                                setNodesCount(Math.max(0, Math.min(100, e.target.value)))
                            }} />
                        </div>
                    </div>}

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowCreateLayerPopup(false)}>Cancel</button>
                        <button type="submit" className="create-layer-popup-submit">
                            {processingCreateLayer && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!processingCreateLayer ? "Create layer" : "Processing...")}
                        </button>
                    </div>
                    
                </form>
                
            </div>
        </div>
    )
}


export default CreateLayerPopup