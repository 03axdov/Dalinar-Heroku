import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function LayerElement({layer, hoveredLayer, deleteLayer, BACKEND_URL, updateModel}) {

    const [nodes, setNodes] = useState(layer.nodes_count)   // Used by ["dense"]
    const [filters, setFilters] = useState(layer.filters)   // Used by ["conv2d"]
    const [kernelSize, setKernelSize] = useState(layer.kernel_size) // USed by ["conv2d"]

    const [updated, setUpdated] = useState(false)

    useEffect(() => {
        if (nodes != layer.nodes_count) {
            setUpdated(true)
        } else if (filters != layer.filters) {
            setUpdated(true)
        } else if (kernelSize != layer.kernel_size) {
            setUpdated(true)
        } else {
            setUpdated(false)
        }
    }, [layer, nodes, filters, kernelSize])

    function saveChanges(e) {
        updateModel({
            "nodes_count": nodes,
            "filters": filters,
            "kernel_size": kernelSize
        })
        console.log("A")
    }

    return (
        <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")}>
            {layer.layer_type == "dense" && <form className="layer-element-inner">
                <h1 className="layer-element-title">
                    Dense
                    <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                        deleteLayer(layer.id)
                    }}/>
                </h1>
                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-purple"></span>
                    <label className="layer-element-label" htmlFor="denseNodes">Nodes</label>
                    <input type="number" className="layer-element-input" id="denseNodes" value={nodes} onChange={(e) => {
                        setNodes(e.target.value)
                    }}></input>
                </div>
            </form>}

            {layer.layer_type == "conv2d" && <form className="layer-element-inner">
                <h1 className="layer-element-title">
                    Conv2D
                    <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                        deleteLayer(layer.id)
                    }}/>
                </h1>

                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                    <label className="layer-element-label" htmlFor="filters">Filters</label>
                    <input type="number" className="layer-element-input" id="filters" value={filters} onChange={(e) => {
                        setFilters(e.target.value)
                    }}></input>
                </div>

                <div className="layer-element-stat">
                <span className="layer-element-stat-color layer-element-stat-blue"></span>
                    <label className="layer-element-label" htmlFor="kernelSize">Kernel size</label>
                    <input type="number" className="layer-element-input" id="kernelSize" value={kernelSize} onChange={(e) => {
                        setKernelSize(e.target.value)
                    }}></input>
                </div>
            </form>}

            <button type="button" 
            className={"layer-element-save " + (!updated ? "layer-element-save-disabled" : "")}
            title={(updated ? "Save changes" : "No changes")}
            onClick={saveChanges}>
                Save changes
            </button>
        </div>
    )
}


export default LayerElement