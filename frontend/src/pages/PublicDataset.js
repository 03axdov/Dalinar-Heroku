import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../components/DownloadPopup"
import DownloadCode from "../components/DownloadCode"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function PublicDataset() {
    const navigate = useNavigate()

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

    const [showDatasetDescription, setShowDatasetDescription] = useState(true)  // True for public datasets

    const [isDownloaded, setIsDownloaded] = useState(false)
    const [downloadFramework, setDownloadFramework] = useState("tensorflow")
    const [downloadType, setDownloadType] = useState("folders")

    const [updateArea, setUpdateArea] = useState(false)

    const pageRef = useRef(null)
    const elementRef = useRef(null)
    const canvasRefs = useRef([])

    const [hoveredAreaId, setHoveredAreaId] = useState(null)


    // AREA FUNCTIONALITY

    const DOT_SIZE = 22
    
    useEffect(() => {
            if (elements.length < 1) {return}
            if (!canvasRefs.current.length) return;
            let areas = elements[elementsIndex].areas
    
            canvasRefs.current.forEach((canvas, idx) => {
                if (!canvas) return; // Skip if canvas is undefined
    
                const ctx = canvas.getContext("2d");
    
                const dpr = window.devicePixelRatio || 1;
                
                const width = canvas.offsetWidth * dpr;
                const height = canvas.offsetHeight * dpr;
                canvas.width = width;
                canvas.height = height;
                ctx.scale(dpr, dpr);
            
                // Get the points for the current area
                const area = areas[idx];
                if (!area) return;
                const points = JSON.parse(area.area_points);
            
                // Convert percentage-based coordinates to pixel values
                const percentageToPixels = (point) => ({
                    x: (point[0] / 100) * canvas.width + DOT_SIZE / 2, // Adjust for the dot's width
                    y: (point[1] / 100) * canvas.height + DOT_SIZE / 2, // Adjust for the dot's height
                });
            
                // Draw lines between points
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
                
                ctx.lineWidth = 3;
                ctx.strokeStyle = idToLabel[area.label].color; // Set the line color here
                
                ctx.beginPath();
            
                points.forEach((point, idx) => {
                    const { x, y } = percentageToPixels(point);
                    if (idx === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
    
                if (points.length > 1) {
                    const { x, y } = percentageToPixels(points[0]);
                    ctx.lineTo(x, y);
                }
            
                ctx.stroke();
                ctx.closePath();
            });
    }, [elements, elementsIndex, canvasRefs, updateArea]);   // When element areas update


    function getTextColor(hex) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
      
        // Apply gamma correction
        const gammaCorrect = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
        const luminance = 0.2126 * gammaCorrect(r) + 0.7152 * gammaCorrect(g) + 0.0722 * gammaCorrect(b);
      
        // Return white or black depending on luminance
        return luminance < 0.5 ? 'white' : 'black';
    }


    // For creating the JSON file that is downloaded for area datasets
    function createJSON() {
        let headers = "Filenames"
        for (let i=0; i < labels.length; i++) {
            headers += "," + labels[i].name
        }

        let res = {}
        let occurences = {}
        for (let i=0; i < elements.length; i++) {
            let temp = {}
            let element = elements[i]

            let name = element.name
            if (occurences[name]) {
                name += "_" + (occurences[name] + 1)
            }

            for (let j=0; j < labels.length; j++) {
                temp[labels[j].name] = []
            }

            for (let j=0; j < element.areas.length; j++) {
                let area = element.areas[j]
                temp[idToLabel[area.label].name] = JSON.parse(area.area_points)
            }

            res[name] = temp
        }

        return JSON.stringify(res); // Combine headers and rows
    }

    function getPoints(area, areaIdx) {
        if (!area) {return}
        let points = JSON.parse(area.area_points)
        return <div key={area.id} className={(hoveredAreaId && hoveredAreaId != area.id ? "display-none" : "")}>
            <canvas ref={(el) => (canvasRefs.current[areaIdx] = el)} 
                    className={"dataset-element-view-canvas " + 
                        (hoveredAreaId ? "dataset-element-view-canvas-background" : "")} 
                    style={{zIndex: 1, width:"100%", 
                            height:"100%", top: 0, 
                            left: 0, position: "absolute"}}></canvas>
            {points.map((point, idx) => (
                <div title="Click to drag" 
                    className="dataset-element-view-point"
                    key={idx} 
                    style={{top: point[1] + "%", 
                            left: point[0] + "%", 
                            "background": (idToLabel[area.label].color),
                            cursor: "default"}}     
                >
                    {idx == 0 && <div 
                    title={idToLabel[area.label].name} 
                    className="dataset-element-view-point-label"
                    style={{background: idToLabel[area.label].color, 
                            color: getTextColor(idToLabel[area.label].color)}}
                    onClick={(e) => e.stopPropagation()}>
                        {idToLabel[area.label].name}
                    </div>}
                </div>
            ))}
        </div>
    }


    // END OF AREA FUNCTIONALITY


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

    useEffect(() => {
        if (dataset) {
            setShowDatasetDescription(false)
        }
    }, [elementsIndex])

    // Handles user button presses
    useEffect(() => {
        const handleKeyDown = (event) => {

            if (loading) {return};  

            let key = getUserPressKeycode(event)
            
            if (key === "ArrowDown" || key === "ArrowRight") {
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
            } else if (key === "ArrowUp" || key === "ArrowLeft") {
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
            if (dataset.datatype == "classification") {
                return <div className="dataset-element-view-image-container">
                        <img ref={elementRef} className="dataset-element-view-image" src={window.location.origin + element.file} />
                </div>
            } else {
                return <div className="dataset-element-view-image-container">
                    <div className="dataset-element-view-image-wrapper">
                        <img onLoad={() => setUpdateArea(!updateArea)} ref={elementRef} className="dataset-element-view-image" src={window.location.origin + element.file} />
                        {elements[elementsIndex].areas && elements[elementsIndex].areas.map((area, idx) => (
                            getPoints(area, idx)
                        ))}
                    </div>
                </div>
            }

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
        saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

        downloadAPICall()

        setDownloadType("folders")
        setIsDownloaded(true)
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
        saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

        downloadAPICall()

        setDownloadType("files")
        setIsDownloaded(true)
    }

    async function areaDatasetDownload() {
        const zip = new JSZip();

        for (let i=0; i < elements.length; i++) {
            const response = await fetch(elements[i].file);
            const blob = await response.blob();

            zip.file(elements[i].name, blob);
        }

        const jsonContent = createJSON();
        const blob = new Blob([jsonContent], { type: 'application/json' });
        zip.file(dataset.name + ".json", blob)
        
        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

        downloadAPICall()
    }

    // FRONTEND FUNCTIONALITY

    return (
        <div className="dataset-container" ref={pageRef}>

            {/* Download popup - Classification */}
            {showDownloadPopup && !isDownloaded && dataset && dataset.datatype == "classification" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={dataset && dataset.datatype == "area"}
            isDownloaded={isDownloaded}
            setIsDownloaded={setIsDownloaded}>
                    <div title="Download .zip file" className="download-element" onClick={labelFoldersDownload}>
                        <p className="download-element-title">Folders for labels <span className="download-recommended">(recommended)</span></p>
                        <p className="download-element-description">
                            Every label will have its own folder containing the elements with that label.
                        </p>

                        <img className="download-element-image" src={window.location.origin + "/static/images/foldersAsLabels.jpg"} />

                    </div>
                    <div title="Download .zip file" className="download-element" onClick={labelFilenamesDownload}>
                        <p className="download-element-title">Labels as filenames</p>
                        <p className="download-element-description">
                            One big folder, with every element named after its label and number, e.g. label1_1.png, label1_2.png, etc.
                        </p>

                        <img className="download-element-image" src={window.location.origin + "/static/images/filenamesAsLabels.jpg"} />


                    </div>
            </DownloadPopup>}

            {/* After download popup - Classification */}
            {showDownloadPopup && isDownloaded && dataset && dataset.datatype == "classification" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={dataset && dataset.datatype == "area"}
            isDownloaded={isDownloaded}
            setIsDownloaded={setIsDownloaded}>
                <h1 className="download-successful-title">Download Successful <img className="download-successful-icon" src={window.location.origin + "/static/images/blueCheck.png"}/></h1>
                <p className="download-successful-instructions">See below for an example of how the dataset can be loaded in Python. Note that the downloaded .zip file must be unpacked
                    and that relative paths must be updated.
                </p>

                <div className="download-frameworks-container">
                    <div onClick={() => setDownloadFramework("tensorflow")} 
                        className={"download-framework " + (downloadFramework != "tensorflow" ? "download-framework-disabled" : "")}>TensorFlow</div>
                    <div onClick={() => setDownloadFramework("pytorch")} className={"download-framework " + (downloadFramework != "pytorch" ? "download-framework-disabled" : "")} >PyTorch</div>
                </div>
                
                <DownloadCode name={dataset.name} datatype={dataset.datatype} framework={downloadFramework} downloadType={downloadType} />
            </DownloadPopup>}

            {/* Download popup - Area */}
            {showDownloadPopup && !isDownloaded && dataset && dataset.datatype == "area" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={dataset && dataset.datatype == "area"}
            setIsDownloaded={setIsDownloaded}><div title="Download .zip file" className="download-element download-element-area" onClick={areaDatasetDownload}>
                    <p className="download-element-title">Download Dataset</p>
                    <p className="download-element-description">
                        Will download as one big folder, with elements retaining their original filenames. A .json file ({dataset.name}.json) will contain the areas of each element.
                    </p>

                    <img className="download-element-image" src={window.location.origin + "/static/images/filenamesAsLabels.jpg"} />
                
                </div>
            </DownloadPopup>}
            
            <div className="dataset-elements">
                <div className="dataset-elements-scrollable">
                    <p className="dataset-sidebar-title">Elements</p>
                    
                    {elements.map((element, idx) => (
                        <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
                        key={element.id} 
                        onClick={() => {
                            
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
                            
                            {dataset && dataset.datatype == "classification" && element.label && idToLabel[element.label] && <span className="dataset-sidebar-color dataset-sidebar-color-element" 
                                style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                >
                                
                            </span>}
     
                        </div>
                    ))}
                    {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                </div>
                
                {/* Shows an element's label */}
                {dataset && dataset.datatype == "classification" && hoveredElement != null && elements[hoveredElement].label &&
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

                    {dataset && <button className="dataset-download-button" onClick={() => setShowDownloadPopup(true)}><img className="dataset-download-icon" src={window.location.origin + "/static/images/download.svg"}/>Download</button>}
                </div>
                
                <div className="dataset-main-display">
                    {elements.length != 0 && !showDatasetDescription && <div className="dataset-element-view-container">
                        {getPreviewElement(elements[elementsIndex])}
                    </div>}

                    {showDatasetDescription && dataset && dataset.description && <div className="dataset-description-display-container">
                        <div className="dataset-description-image-container">
                            <img className="dataset-description-image" src={dataset.image} />
                        </div>

                        <div className="dataset-description-display">
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
                                    <img className="dataset-description-stats-icon" src={window.location.origin + "/static/images/label.png"}/>
                                    {labels.length + (labels.length == 1 ? " label" : " labels")}
                                </div>}
                            </div>

                            <p className="dataset-description-text"><span className="dataset-description-start">Owner: </span>{dataset.ownername}</p><br></br>
                            {(dataset.description ? <p className="dataset-description-text dataset-description-text-margin"><span className="dataset-description-start">Description: </span>{dataset.description}</p> : "This dataset does not have a description.")}

                            {dataset.keywords && dataset.keywords.length > 0 && <div className="dataset-description-keywords">
                                {JSON.parse(dataset.keywords).length > 0 && <span className="gray-text dataset-description-keywords-title">Keywords: </span>}
                                {JSON.parse(dataset.keywords).map((e, i) => (
                                    <div title={e} className="dataset-description-keyword" key={i}>{e}</div>
                                ))}
                            </div>}
                        </div>
                    </div>}
                </div>
                
            </div>

            <div className="dataset-labels">
                <div className="dataset-labels-scrollable">
                    <p className="dataset-sidebar-title">Labels</p>
   
                    <div className={"dataset-labels-container " + ((dataset && dataset.datatype == "area") ? "dataset-labels-container-area" : "")}>
                        {labels.map((label) => (
                            <div className="dataset-sidebar-element default-cursor" key={label.id}>
                                <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                                <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                            </div>
                        ))}
                    </div>

                    {dataset && dataset.datatype == "area" && <div className="dataset-areas-container dataset-areas-container-public">
                        {elements[elementsIndex].areas.map((area, areaIdx) => (
                            <div className="dataset-sidebar-element-area" 
                                title={"Area: " + idToLabel[area.label].name}
                                onMouseEnter={(e) => setHoveredAreaId(area.id)}
                                onMouseLeave={(e) => setHoveredAreaId(null)}
                                key={areaIdx}
                                >
                                    <img className="dataset-element-area-icon" src={window.location.origin + "/static/images/area.svg"} />
                                    <span className="dataset-area-name">{idToLabel[area.label].name}</span>
                                    <span title={"Points: " + JSON.parse(area.area_points).length} 
                                    className="dataset-sidebar-label-keybind no-box-shadow border"
                                    style={{borderColor: (idToLabel[area.label].color)}}>{JSON.parse(area.area_points).length}</span>
                                    
                            </div>
                        ))}
                    </div>}
                </div>
                

            </div>
        </div>
    )

    
}

export default PublicDataset