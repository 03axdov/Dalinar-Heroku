import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function LayerElement({layer, BACKEND_URL}) {

    return (
        <div className="layer-element">
            {layer.layer_type}
        </div>
    )
}


export default LayerElement