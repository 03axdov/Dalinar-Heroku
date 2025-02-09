import React from "react"

function CreateLayerPopup({setShowCreateLayerPopup, onSubmit}) {

    return (
        <div className="popup create-layer-popup" onClick={() => setShowCreateLayerPopup(false)}>
            <div className="create-layer-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                
            </div>
        </div>
    )
}


export default CreateLayerPopup