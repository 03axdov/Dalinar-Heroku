import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function LayerElement({layer, hoveredLayer, deleteLayer, BACKEND_URL}) {

    return (
        <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")}>
            {layer.layer_type == "dense" && <div className="layer-element-inner">
                <h1 className="layer-element-title">
                    Dense
                    <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                        deleteLayer(layer.id)
                    }}/>
                </h1>
                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-purple"></span>
                    Nodes: {layer.nodes_count}
                </div>
            </div>}

            {layer.layer_type == "conv2d" && <div className="layer-element-inner">
                <h1 className="layer-element-title">
                    Conv2D
                    <img className="layer-element-delete" title="Delete layer" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                        deleteLayer(layer.id)
                    }}/>
                </h1>

                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-lightblue"></span>
                    Filters: {layer.filters}
                </div>

                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-blue"></span>
                    Kernel size: {layer.kernel_size}
                </div>
            </div>}
        </div>
    )
}


export default LayerElement