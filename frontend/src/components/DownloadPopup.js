import React from "react"

function DownloadPopup({setShowDownloadPopup, isArea, children}) {

    return (
        <div className="popup download-popup" onClick={() => setShowDownloadPopup(false)}>
            <div className={"download-popup-container " + (isArea ? "download-popup-container-area" : "")} onClick={(e) => {
                e.stopPropagation()
            }}>
                {children}
            </div>
        </div>
    )
}


export default DownloadPopup