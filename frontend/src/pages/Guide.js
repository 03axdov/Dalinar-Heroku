import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import DownloadCode from "../components/DownloadCode"

// The default page. Login not required.
function Guide() {
    
    const [currentInstructions, setCurrentInstructions] = useState("download")
    const [downloadFramework1, setDownloadFramework1] = useState("tensorflow")
    const [downloadFramework2, setDownloadFramework2] = useState("tensorflow")

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
                {currentInstructions == "download" && <div className="instructions-header">
                    <h1 className="instructions-title">Download Help</h1>
                    <p className="instructions-text">Downloaded datasets can easily be loaded into different machine learning frameworks. See below for examples for Tensorflow and Pytorch.
                        Note that the code provided applies to image datasets, and that the method used (folders as labels or filenames as labels) must be taken into account.
                    </p>
                </div>}
                {currentInstructions == "download" && <div className="download-instructions-container">
                    <div className="download-instructions-element">
                        <h1 className="download-instructions-title">Folders as labels</h1>

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework1("tensorflow")} 
                                className={"download-framework " + (downloadFramework1 != "tensorflow" ? "download-framework-disabled" : "")}>TensorFlow</div>
                            <div onClick={() => setDownloadFramework1("pytorch")} className={"download-framework " + (downloadFramework1 != "pytorch" ? "download-framework-disabled" : "")} >PyTorch</div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework1} downloadType="folders"/>
                    </div>

                    <div className="download-instructions-element">
                        <h1 className="download-instructions-title">Filenames as labels</h1>

                        <div className="download-frameworks-container download-frameworks-instructions">
                            <div onClick={() => setDownloadFramework2("tensorflow")} 
                                className={"download-framework " + (downloadFramework2 != "tensorflow" ? "download-framework-disabled" : "")}>TensorFlow</div>
                            <div onClick={() => setDownloadFramework2("pytorch")} className={"download-framework " + (downloadFramework2 != "pytorch" ? "download-framework-disabled" : "")} >PyTorch</div>
                        </div>

                        <DownloadCode name="YOUR_DATASET" datatype="classification" framework={downloadFramework2} downloadType="files"/>
                    </div>
                </div>}
            </div>
        </div>
    )
}

export default Guide