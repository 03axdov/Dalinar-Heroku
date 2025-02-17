import React from "react"

function ModelDownloadPopup({setShowDownloadPopup, BACKEND_URL}) {

    return (
        <div className="popup" onClick={() => {
            setShowDownloadPopup(false)
        }}>
            <div className="model-download-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="download-successful-title">Download Successful <img className="download-successful-icon" src={BACKEND_URL + "/static/images/blueCheck.png"}/></h1>
                <p className="download-successful-instructions">An example of how the model can be loaded using TensorFlow will be added in later patches.
                </p>
                
            </div>

        </div>
    )
}


export default ModelDownloadPopup