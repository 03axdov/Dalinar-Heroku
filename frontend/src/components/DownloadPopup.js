import React from "react"

function DownloadPopup({setShowDownloadPopup, children}) {

    return (
        <div className="popup download-popup" onClick={() => setShowDownloadPopup(false)}>
            <div className="download-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                {children}
            </div>
        </div>
    )
}


export default DownloadPopup