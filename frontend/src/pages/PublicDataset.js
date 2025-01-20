import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../components/DownloadPopup"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function PublicDataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])    // Label points to label id
    const [labels, setLabels] = useState([])
    
    const [currentText, setCurrentText] = useState("") // Used to display text files

    const [elementsIndex, setElementsIndex] = useState(0)

    const [elementLabelTop, setElementLabelTop] = useState(0)

    const [loading, setLoading] = useState(true)

    const [idToLabel, setIdToLabel] = useState({})

    const [hoveredElement, setHoveredElement] = useState(null)

    const [showDownloadPopup, setShowDownloadPopup] = useState(false)

    const [showDatasetDescription, setShowDatasetDescription] = useState(false)

    const pageRef = useRef(null)

    const navigate = useNavigate()

    useEffect(() => {
        getDataset()
    }, [])


    function getUserPressKeycode(event) {
        const keys = [];
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.shiftKey) keys.push('Shift');
        if (event.altKey) keys.push('Alt');
        if (event.metaKey) keys.push('Meta'); // For Mac's Command key
        if (event.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
          keys.push(event.key); // Add the actual key
        }
        return keys.join('+')
    }

    // Handles user button presses
    useEffect(() => {
        const handleKeyDown = (event) => {

            if (loading) {return};  

            let key = getUserPressKeycode(event)
            
            if (key === "ArrowDown" || key === "ArrowRight") {
                setShowDatasetDescription(false)    
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
            } else if (key === "ArrowUp" || key === "ArrowLeft") {
                setShowDatasetDescription(false)
                setElementsIndex(Math.max(elementsIndex - 1, 0))  
            }
        };
    
        // Attach the event listener
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, false);
        };
    }, [loading, elements, elementsIndex])


    function getDataset() {
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/public/' + id,
        })
        .then((res) => {
            setDataset(res.data)

            setElements(res.data.elements)
            setLabels(res.data.labels)

            // Update keybinds
            parseLabels(res.data.labels)

            setLoading(false)
        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)
            setLoading(false)
        })
    }


    // ELEMENT FUNCTIONALITY

    const IMAGE_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "avif"])
    const TEXT_FILE_EXTENSIONS = new Set(["txt", "doc", "docx"])

    function getPreviewElement(element) {
        const extension = element.file.split(".").pop()
        
        if (IMAGE_FILE_EXTENSIONS.has(extension)) {
            return <img className="dataset-element-view-image" src={window.location.origin + element.file} />

        } else if (TEXT_FILE_EXTENSIONS.has(extension)) {
            
            fetch(element.file)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text()
            })
            .then(text => {
                setCurrentText(text)
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

            return <p className="dataset-element-view-text">{currentText}</p> // Process the text content
            
        } else {
            return <div className="extension-not-found">File of type .{extension} could not be rendered.</div>
        }
    }


    // LABEL FUNCTIONALITY

    function parseLabels(labels) {
        if (labels) {
            let tempObjKeys = {}
            let tempObjIds = {}
            for (let i=0; i < labels.length; i++) {
                if (labels[i].keybind) {
                    tempObjKeys[labels[i].keybind] = labels[i]
                }
                tempObjIds[labels[i].id] = labels[i]
            }

            setIdToLabel(tempObjIds)
        }
    }


    // DOWNLOAD FUNCTIONALITY

    function downloadAPICall() {
        const URL = window.location.origin + '/api/download-dataset/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": dataset.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((data) => {
            console.log("Incremented download count.")
        }).catch((error) => {
            if (error.status == 401) {
                console.log("Did not increment download counter as user is not signed in.")
            } else {
                console.log("Error: ", error)
            }
            
        })
    }

    async function labelFoldersDownload() {
        const zip = new JSZip();

        const labelToFolder = {

        }


        for (let i=0; i < elements.length; i++) {

            let label = idToLabel[elements[i].label]
            if (!labelToFolder[label.id]) {
                labelToFolder[label.id] = zip.folder(label.name)
            }

            const response = await fetch(elements[i].file);
            const blob = await response.blob();

            let extension = elements[i].file.split(".").pop()
            let filename = elements[i].name

            if (filename.split(".").pop() != extension) {
                filename += "." + extension
            }

            labelToFolder[label.id].file(filename, blob);
        }
        

        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, dataset.name + ".zip");

        downloadAPICall()
        
    }

    async function labelFilenamesDownload() {
        const zip = new JSZip();

        const labelToNbr = {

        }


        for (let i=0; i < elements.length; i++) {

            let label = idToLabel[elements[i].label]
            if (!labelToNbr[label.id]) {
                labelToNbr[label.id] = 0
            }

            const response = await fetch(elements[i].file);
            const blob = await response.blob();

            let extension = elements[i].file.split(".").pop()
            let filename = label.name + "_" + labelToNbr[label.id]

            if (filename.split(".").pop() != extension) {
                filename += "." + extension
            }

            zip.file(filename, blob);
            labelToNbr[label.id] += 1
        }
        

        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, dataset.name + ".zip");

        downloadAPICall()
    }


    // FRONTEND FUNCTIONALITY

    return (
        <div className="dataset-container" ref={pageRef}>

            {showDownloadPopup && <DownloadPopup setShowDownloadPopup={setShowDownloadPopup}>
                <div title="Download .zip file" className="download-element" onClick={labelFoldersDownload}>
                    <p className="download-element-title">Folders for labels</p>
                    <p className="download-element-description">
                        Every label will have its own folder containing the elements with that label.
                    </p>

                    <img className="download-element-image" src={window.location.origin + "/static/images/downloadFolders.jpg"} />
                </div>
                <div title="Download .zip file" className="download-element" onClick={labelFilenamesDownload}>
                    <p className="download-element-title">Labels as filenames</p>
                    <p className="download-element-description">
                        One big folder, with every element named after its label and number, e.g. label1_1.png, label1_2.png, etc.
                    </p>

                    <img className="download-element-image" src={window.location.origin + "/static/images/downloadFilenames.jpg"} />
                </div>

            </DownloadPopup>}
            
            <div className="dataset-elements">
                <div className="dataset-elements-scrollable">
                    <p className="dataset-sidebar-title">Elements</p>
                    <div className="dataset-sidebar-button-container">
                        <button className="sidebar-button dataset-download-button" onClick={() => setShowDownloadPopup(true)}><img className="dataset-download-icon" src={window.location.origin + "/static/images/download.svg"}/>Download</button>
                    </div>
                    
                    {elements.map((element, idx) => (
                        <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
                        key={element.id} 
                        onClick={() => {
                            setShowDatasetDescription(false)
                            setElementsIndex(idx)
                        }}
                        onMouseEnter={(e) => {
                            setElementLabelTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                            setHoveredElement(idx)
                        }}
                        onMouseLeave={() => {
                            setHoveredElement(null)
                        }}>

                            {IMAGE_FILE_EXTENSIONS.has(element.file.split(".").pop()) && <img className="element-type-img" src={window.location.origin + "/static/images/image.png"}/>}
                            {TEXT_FILE_EXTENSIONS.has(element.file.split(".").pop()) && <img className="element-type-img" src={window.location.origin + "/static/images/text.png"}/>}

                            <span className="dataset-sidebar-element-name" title={element.name}>{element.name}</span>
                            

                            {element.label && idToLabel[element.label] && <span className="dataset-sidebar-color dataset-sidebar-color-element" 
                                                            style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                                        >
                                
                                
                            </span>}

                            
                        </div>
                    ))}
                    {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                </div>
                
                {/* Shows an element's label */}
                {hoveredElement != null && elements[hoveredElement].label &&
                    <div className="dataset-sidebar-element-label" style={{top: elementLabelTop}}>{idToLabel[elements[hoveredElement].label].name}</div>
                }

            </div>

            <div className="dataset-main">
                <div className="dataset-main-toolbar">
                    {dataset && <div className="dataset-title-container unselectable" onClick={() => {setShowDatasetDescription(!showDatasetDescription)}}>
                        {dataset.datatype == "classification" && <img title="Type: Classification" className="dataset-title-icon" src={window.location.origin + "/static/images/classification.png"}/>}
                        {dataset.datatype == "area" && <img title="Type: Area" className="dataset-title-icon" src={window.location.origin + "/static/images/area.svg"}/>}
                        
                        <p className="dataset-title" title={(!showDatasetDescription ? "Show description" : "Hide description")}>{dataset && dataset.name}</p>

                        <img className="dataset-title-expand-icon" src={window.location.origin + "/static/images/" + (!showDatasetDescription ? "plus.png" : "minus.png")} />
                    </div>}
                    {dataset && <p className="dataset-ownername gray-text">created by {dataset.ownername}</p>}
                </div>
                
                <div className="dataset-main-display">
                    {elements.length != 0 && <div className="dataset-element-view-container">
                        {getPreviewElement(elements[elementsIndex])}
                    </div>}

                    {showDatasetDescription && dataset.description && <div className="dataset-description-display-container">
                        <div className="dataset-description-header">
                            {dataset.name}
                        </div>

                        <div className="dataset-description-row">
                            <div className="dataset-description-image-container">
                                <img className="dataset-description-image" src={dataset.image} />
                            </div>
                        </div>

                        <div className="dataset-description-stats">
                            {dataset.downloaders && <div className="dataset-description-stats-element">
                                <img className="dataset-description-stats-icon" src={window.location.origin + "/static/images/download.svg"}/>
                                {dataset.downloaders.length + (dataset.downloaders.length == 1 ? " download" : " downloads")}
                            </div>}

                            {elements && <div className="dataset-description-stats-element">
                                <img className="dataset-description-stats-icon" src={window.location.origin + "/static/images/text.png"}/>
                                {elements.length + (elements.length == 1 ? " element" : " elements")}
                            </div>}

                            {labels && <div className="dataset-description-stats-element">
                                <img className="dataset-description-stats-icon" src={window.location.origin + "/static/images/image.png"}/>
                                {labels.length + (labels.length == 1 ? " label" : " labels")}
                            </div>}
                        </div>

                        <div className="dataset-description-display">
                            {(dataset.description ? dataset.description : "This dataset does not have a description.")}
                        </div>
                    </div>}
                </div>
                
            </div>

            <div className="dataset-labels">
                <div className="dataset-labels-scrollable">
                    <p className="dataset-sidebar-title">Labels</p>
   
                    {labels.map((label) => (
                        <div className="dataset-sidebar-element default-cursor" key={label.id}>
                            <span className="dataset-sidebar-color" title={(label.color ? label.color : "No color")} style={{background: (label.color ? label.color : "transparent")}}></span>
                            <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                            
                        </div>
                    ))}
                </div>
                

            </div>
        </div>
    )

    
}

export default PublicDataset