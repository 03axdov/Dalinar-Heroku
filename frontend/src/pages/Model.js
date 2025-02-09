import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Model({currentProfile, activateConfirmPopup, notification, BACKEND_URL}) {

    const { id } = useParams();
    const [model, setModel] = useState(null)
    const [layers, setLayers] = useState([])
    const [loading, setLoading] = useState(true)

    const [showDownloadPopup, setShowDownloadPopup] = useState(false)
    const [showModelDescription, setShowModelDescription] = useState(false)
    const pageRef = useRef(null)
    const [descriptionWidth, setDescriptionWidth] = useState(45)    // As percentage

    const [toolbarLeftWidth, setToolbarLeftWidth] = useState(185)   // In pixels
    const [toolbarMainHeight, setToolbarMainHeight] = useState(50)

    const [cursor, setCursor] = useState("")

    const descriptionContainerRef = useRef(null)

    const navigate = useNavigate()


    useEffect(() => {
        getModel()
    }, [])

    useEffect(() => {
        if (currentProfile && model && !loading) {
            if (currentProfile.user && model.owner) {
                if (currentProfile.user != model.owner) {
                    navigate("/models/public/" + id)
                }
            }
            
        }
    }, [currentProfile, model])

    function getModel() {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/' + id,
        })
        .then((res) => {
            setModel(res.data)

            setLayers(res.data.layers)

            // preloadImages(res.data.elements) // Now handled by .hidden-preload
        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading model with id " + id + ".", "failure")

            console.log(err)

        }).finally(() => {
            setLoading(false)
        })
    }

    // FRONTEND FUNCTIONALITY

    function closePopups(exception) {
        
    }

    const resizeLeftToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = toolbarLeftWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth + (e.clientX - startX)

          setToolbarLeftWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const resizeMainToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startY = e.clientY;
        const startHeight = toolbarMainHeight;

        setCursor("n-resize")
    
        const handleMouseMove = (e) => {
          const newHeight = startHeight + (e.clientY - startY)
        
          if (newHeight < 25) { // Hide toolbar
            setToolbarMainHeight(15)
          } else {  // Show toolbar
            setToolbarMainHeight(50)
          }
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const resizeDescriptionHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = descriptionWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth - 100 * ((e.clientX - startX) / descriptionContainerRef.current.offsetWidth);

          setDescriptionWidth(Math.max(35, Math.min(newWidth, 75)));
        };
    
        const handleMouseUp = () => {
            setCursor("")
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
    
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    console.log(layers)

    return (
        <div className="dataset-container" onClick={closePopups} ref={pageRef} style={{cursor: (cursor ? cursor : "")}}>

            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className="model-toolbar-left-inner">
                    <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Layers</p>

                    <div className="dataset-sidebar-button-container">
                        <button type="button" 
                        className={"sidebar-button dataset-upload-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                        title="Add layer">
                            <img className={"dataset-upload-button-icon " + (toolbarLeftWidth < 150 ? "model-upload-button-icon-small" : "")} src={BACKEND_URL + "/static/images/plus.png"} />
                            <span>Add layer</span>
                        </button>
                    </div>

                    {layers.map((layer, idx) => (
                        <div className="model-layer-element" key={idx}>
                            {layer.toString()}
                        </div>
                    ))}
                </div>
                <div className="dataset-toolbar-resizeable" onMouseDown={resizeLeftToolbarHandleMouseDown}></div>
            </div>

            <div className="dataset-main" style={{width: "calc(100% - " + toolbarLeftWidth + "px)"}}>
                <div className="dataset-main-toolbar-outer" style={{height: toolbarMainHeight + "px"}}>
                    <div className="dataset-main-toolbar" style={{display: (toolbarMainHeight > 25 ? "flex" : "none")}}>
                        {model && <div className="dataset-title-container unselectable" title={(!showModelDescription ? "Show description" : "Hide description")} onClick={() => {setShowModelDescription(!showModelDescription)}}>
                           
                            <img className="dataset-title-icon" src={BACKEND_URL + "/static/images/model.svg"}/>
                            
                            <p className="dataset-title">{model && model.name}</p>

                            <img className="dataset-title-expand-icon" src={BACKEND_URL + "/static/images/" + (!showModelDescription ? "plus.png" : "minus.png")} />
                        </div>}

                        {model && <button type="button" title="Edit model" className="dataset-title-button" onClick={() => {
                            navigate("/edit-model/" + model.id)
                        }}>
                            <img className="dataset-title-edit-icon" src={BACKEND_URL + "/static/images/edit.png"}/>
                            Edit model
                        </button>}

                        {model && <button className="dataset-download-button" onClick={() => {
                            setShowDownloadPopup(true)
                        }} title="Download model"><img className="dataset-download-icon" src={BACKEND_URL + "/static/images/download.svg"}/>Download</button>}

                    </div>
                    
                    <div className="dataset-main-toolbar-resize" 
                        onMouseDown={resizeMainToolbarHandleMouseDown} 
                        style={{height: (toolbarMainHeight == 15 ? "15px" : "5px")}}
                        >
                        {toolbarMainHeight == 15 && <img className="toolbar-main-dropdown" src={BACKEND_URL + "/static/images/down.svg"} />}
                    </div>
                </div>

                <div className="dataset-main-display">
                    {showModelDescription && model &&<div className="dataset-description-display-container" ref={descriptionContainerRef}>
                        <div className="dataset-description-image-container" style={{width: "calc(100% - " + descriptionWidth + "%)"}}>
                            <img className="dataset-description-image" src={model.image} />
                        </div>

                        <div className="dataset-description-resize" onMouseDown={resizeDescriptionHandleMouseDown}></div>

                        <div className="dataset-description-display" style={{width: "calc(" + descriptionWidth + "%" + " - 5px)"}}>
                            <div className="model-description-stats">
                                {model.downloaders && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/download.svg"}/>
                                    {model.downloaders.length + (model.downloaders.length == 1 ? " download" : " downloads")}
                                </div>}

                                {layers && <div className="model-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/classification.png"}/>
                                    {layers.length + (layers.length == 1 ? " layer" : " layers")}
                                </div>}
                            </div>

                            <p className="dataset-description-text"><span className="dataset-description-start">Owner: </span>{model.ownername}</p>

                            {(model.description ? <p className="dataset-description-text dataset-description-text-margin"><span className="dataset-description-start">Description: </span>{model.description}</p> : "This dataset does not have a description.")}

                            <button className="hide-description-button" onClick={() => {setShowModelDescription(false)}}>Hide description</button>
                        </div>

                    </div>}
                </div>
            </div>
        </div>
    )

    
}

export default Model