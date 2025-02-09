import React, {useState} from "react"

function CreateLayerPopup({BACKEND_URL, setShowCreateLayerPopup, onSubmit, processingCreateLayer}) {

    // Data fields for different layers
    const [type, setType] = useState("dense")

    const [filters, setFilters] = useState(1)   // Used for layers of type ["conv2d"]
    const [kernelSize, setKernelSize] = useState(3) // Used for layers of type ["conv2d"]

    const [nodesCount, setNodesCount] = useState(8) // Used for layers of type ["dense"]

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
                    }

                    if (type == "dense") {
                        data["nodes_count"] = nodesCount
                    } else if (type == "conv2d") {
                        data["filters"] = filters
                        data["kernel_size"] = kernelSize
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

                    <div className="create-layer-line"></div>

                    {type == "dense" && <div className="create-layer-type-fields">
                        <div className="create-dataset-label-inp no-margin">
                            <label className="create-dataset-label" htmlFor="layer-nodes-count">Number of nodes</label>
                            <input className="create-dataset-inp" id="layer-nodes-count" type="number" required value={nodesCount} onChange={(e) => {
                                setNodesCount(Math.max(0, Math.min(100, e.target.value)))
                            }} />
                        </div>
                    </div>}

                    {type == "conv2d" && <div className="create-layer-type-fields">
                        <div className="create-dataset-label-inp no-margin">
                            <label className="create-dataset-label" htmlFor="layer-nodes-count">Number of filters</label>
                            <input className="create-dataset-inp" id="layer-nodes-count" type="number" required value={filters} onChange={(e) => {
                                setFilters(Math.max(0, Math.min(512, e.target.value)))
                            }} />
                        </div>

                        <div className="create-dataset-label-inp">
                            <label className="create-dataset-label" htmlFor="layer-nodes-count">Kernel size</label>
                            <input className="create-dataset-inp" id="layer-nodes-count" type="number" required value={kernelSize} onChange={(e) => {
                                setKernelSize(Math.max(0, Math.min(100, e.target.value)))
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