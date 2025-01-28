import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"

// The default page. Login not required.
function Guide() {
    
    const [currentInstructions, setCurrentInstructions] = useState("download")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")

    return (
        <div className="guide-container">
            <div className="guide-toolbar">
                <div className={"guide-toolbar-element " + (currentInstructions == "download" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("download")}>
                Download Help
                    </div>
                <div className={"guide-toolbar-element " + (currentInstructions == "area" ? "guide-toolbar-element-selected": "")}
                onClick={() => setCurrentInstructions("area")}>
                    Area Labels
                </div>
            </div>

            <div className="guide-main">
                {currentInstructions == "download" && <div className="download-instructions-container">
                    <div className="download-instructions-element">

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework1("tensorflow")} 
                                className={"download-framework " + (downloadFramework1 != "tensorflow" ? "download-framework-disabled" : "")}>TensorFlow</div>
                            <div onClick={() => setDownloadFramework1("pytorch")} className={"download-framework " + (downloadFramework1 != "pytorch" ? "download-framework-disabled" : "")} >PyTorch</div>
                        </div>
                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework1} downloadType="folders"/>
                    </div>
                </div>}
            </div>
        </div>
    )
}

export default Guide