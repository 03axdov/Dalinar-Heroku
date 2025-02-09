import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function LayerElement({layer, hoveredLayer, BACKEND_URL}) {

    return (
        <div className={"layer-element " + (hoveredLayer == layer.id ? "layer-element-hovered" : "")}>
            {layer.layer_type == "dense" && <div className="layer-element-inner">
                <h1 className="layer-element-title">Dense</h1>
                <div className="layer-element-stat">
                    <span className="layer-element-stat-color layer-element-stat-purple"></span>
                    Nodes: {layer.nodes_count}
                </div>
            </div>}
        </div>
    )
}


export default LayerElement