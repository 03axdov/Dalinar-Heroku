import React from "react"

function DownloadPopup({setShowDownloadPopup, isArea, setIsDownloaded, isDownloaded, children}) {

    return (
        <div className="popup download-popup" onClick={() => {
            setIsDownloaded(false)
            setShowDownloadPopup(false)
        }}>
            <div className={"download-popup-container " + (isArea ? "download-popup-container-area" : "") + (isDownloaded ? "download-popup-container-downloaded" : "")} onClick={(e) => {
                e.stopPropagation()
            }}>
                {children}
            </div>

        </div>
    )
}


export default DownloadPopup