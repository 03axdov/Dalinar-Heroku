import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../components/DownloadPopup"
import DownloadCode from "../components/DownloadCode"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function PublicDataset({BACKEND_URL}) {
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
    
    const [currentImageWidth, setCurrentImageWidth] = useState(0)    // Only used if current element is an image
    const [currentImageHeight, setCurrentImageHeight] = useState(0)  // Only used if current element is an image

    const [descriptionWidth, setDescriptionWidth] = useState(45)

    const [toolbarLeftWidth, setToolbarLeftWidth] = useState(185)   // In pixels
    const [toolbarRightWidth, setToolbarRightWidth] = useState(185) // In pixels
    const [toolbarMainHeight, setToolbarMainHeight] = useState(50)

    const [cursor, setCursor] = useState("")

    // Update current image dimensions
    useEffect(() => {
        let currentElement = elements[elementsIndex]
        if (!currentElement) {return}
        let extension = currentElement.file.split(".").pop()

        if (IMAGE_FILE_EXTENSIONS.has(extension)) {
            if (currentElement.imageWidth) {setCurrentImageWidth(currentElement.imageWidth)}
            else {setCurrentImageWidth("")}
            
            if (currentElement.imageHeight) {setCurrentImageHeight(currentElement.imageHeight)}
            else {setCurrentImageHeight("")}
        }
    }, [elements, elementsIndex])

    // Zoom functionality
    const elementContainerRef = useRef(null)
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });


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

    // Element Scroll Functionality
    const minZoom = 1
    const maxZoom = 2

    const handleElementScroll = (e) => {
        const rect = elementContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setPosition({ x, y });

        
        const newZoom = Math.min(Math.max(zoom + e.deltaY * -0.00125, minZoom), maxZoom);
        setZoom(newZoom);
    };

    const handleElementMouseMove = (e) => {
        setCursor("")
        if (zoom == 1 || e.buttons != 2) {return}  // Allow user to move with cursor if zoomed in and holding right mouse

        if (e.buttons == 2) {setCursor("grabbing")}
    
        const rect = elementContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
    
        setPosition({ x, y });
    };

    const IMAGE_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "avif"])
    const TEXT_FILE_EXTENSIONS = new Set(["txt", "doc", "docx"])

    function getPreviewElement(element) {
        const extension = element.file.split(".").pop()
        
        if (IMAGE_FILE_EXTENSIONS.has(extension)) {
            if (dataset.datatype == "classification") {
                return <div className="dataset-element-view-image-container"
                    ref={elementContainerRef} 
                    onWheel={handleElementScroll}
                    onMouseMove={handleElementMouseMove}
                    style={{overflow: "hidden"}}>
                        <img ref={elementRef} 
                            className="dataset-element-view-image" 
                            src={element.file} 
                            style={{
                                transform: `scale(${zoom}) translate(${(50 - position.x) * (zoom - 1)}%, ${(50 - position.y) * (zoom - 1)}%)`,
                                transformOrigin: "center",
                                transition: "transform 0.1s ease-out",
                            }}
                            draggable="false"
                            onContextMenu={(e) => e.preventDefault()}/>
                </div>
            } else {
                return <div className="dataset-element-view-image-container-area"
                ref={elementContainerRef}
                onWheel={handleElementScroll}
                onMouseMove={handleElementMouseMove}
                style={{overflow: "hidden"}}>
                    <div className="dataset-element-view-image-wrapper"
                    style={{
                        transform: `scale(${zoom}) translate(${(50 - position.x) * (zoom - 1)}%, ${(50 - position.y) * (zoom - 1)}%)`,
                        transformOrigin: "center",
                        transition: "transform 0.1s ease-out",
                    }}>
                        <img onLoad={() => setUpdateArea(!updateArea)} 
                        ref={elementRef} 
                        className="dataset-element-view-image-area" 
                        src={element.file} 
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}/>
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

    const elementsHandleDragEnd = (result) => {
            if (!result.destination) return; // Dropped outside
        
            const reorderElements = [...elements];
            const [movedItem] = reorderElements.splice(result.source.index, 1);
            reorderElements.splice(result.destination.index, 0, movedItem);
            
            let currId = elements[elementsIndex].id
            setElements(reorderElements);
    
            for (let i=0; i < reorderElements.length; i++) {
                if (reorderElements[i].id == currId) {
                    setElementsIndex(i)
                }
            }

    };
    
    const labelsHandleDragEnd = (result) => {
        if (!result.destination) return; // Dropped outside
    
        const reorderLabels = [...labels];
        const [movedItem] = reorderLabels.splice(result.source.index, 1);
        reorderLabels.splice(result.destination.index, 0, movedItem);
        
        setLabels(reorderLabels);
        
    };

    const descriptionContainerRef = useRef(null)
    
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

    const resizeRightToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = toolbarRightWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth - (e.clientX - startX)

          setToolbarRightWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
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


    return (
        <div className="dataset-container" ref={pageRef} style={{cursor: (cursor ? cursor : "")}}>

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

                        <img className="download-element-image" src={BACKEND_URL + "/static/images/foldersAsLabels.jpg"} />

                    </div>
                    <div title="Download .zip file" className="download-element" onClick={labelFilenamesDownload}>
                        <p className="download-element-title">Labels as filenames</p>
                        <p className="download-element-description">
                            One big folder, with every element named after its label and number, e.g. label1_1.png, label1_2.png, etc.
                        </p>

                        <img className="download-element-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} />


                    </div>
            </DownloadPopup>}

            {/* After download popup - Classification */}
            {showDownloadPopup && isDownloaded && dataset && dataset.datatype == "classification" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={dataset && dataset.datatype == "area"}
            isDownloaded={isDownloaded}
            setIsDownloaded={setIsDownloaded}>
                <h1 className="download-successful-title">Download Successful <img className="download-successful-icon" src={BACKEND_URL + "/static/images/blueCheck.png"}/></h1>
                <p className="download-successful-instructions">See below for an example of how the dataset can be loaded in Python. Note that the downloaded .zip file must be unpacked
                    and that relative paths must be updated.
                </p>

                <div className="download-frameworks-container download-frameworks-instructions">
                    <div onClick={() => setDownloadFramework("tensorflow")} 
                        className="download-framework">
                            <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")}/>
                            <span className={downloadFramework == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                        </div>
                    <div onClick={() => setDownloadFramework("pytorch")} className="download-framework" >
                        <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework == "pytorch" ? "pytorch.png": "pytorchGray.png")}/>
                        <span className={downloadFramework == "pytorch" ? "pytorch": "download-framework-disabled"}>PyTorch</span>
                    </div>
                </div>
                
                <DownloadCode name={dataset.name} datatype={dataset.datatype} framework={downloadFramework} downloadType={downloadType} BACKEND_URL={BACKEND_URL}/>
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

                    <img className="download-element-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} />
                
                </div>
            </DownloadPopup>}
            
            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className="dataset-elements">
                    <div className="dataset-elements-scrollable">
                        <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Elements</p>
                        
                        <DragDropContext className="dataset-elements-list" onDragEnd={elementsHandleDragEnd}>
                            <Droppable droppableId="elements-droppable">
                                {(provided) => (<div className="dataset-elements-list"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}>
                                    {elements.map((element, idx) => (
                                        <Draggable key={element.id} draggableId={"" + element.id} index={idx}>
                                            {(provided) => (<div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected " : "") + (toolbarLeftWidth < 150 ? "dataset-sidebar-element-small" : "")} 
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{...provided.draggableProps.style}}
                                            ref={provided.innerRef}
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

                                                {IMAGE_FILE_EXTENSIONS.has(element.file.split(".").pop()) && <img className="element-type-img" src={BACKEND_URL + "/static/images/image.png"}/>}
                                                {TEXT_FILE_EXTENSIONS.has(element.file.split(".").pop()) && <img className="element-type-img" src={BACKEND_URL + "/static/images/text.png"}/>}

                                                <span className="dataset-sidebar-element-name" title={element.name}>{element.name}</span>
                                                
                                                {dataset && dataset.datatype == "classification" && element.label && idToLabel[element.label] && <span className="dataset-sidebar-color dataset-sidebar-color-element" 
                                                    style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                                    > 
                                                </span>}

                                                {dataset && dataset.datatype == "area" && element.areas && element.areas.length > 0 && <img title="Labelled" 
                                                    className="dataset-sidebar-labeled"
                                                    src={BACKEND_URL + "/static/images/area.svg"} />}
                        
                                            </div>)}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder} 
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                    </div>
                    
                    {/* Shows an element's label */}
                    {dataset && dataset.datatype == "classification" && hoveredElement != null && elements[hoveredElement].label &&
                        <div className="dataset-sidebar-element-label" style={{top: (elementLabelTop + (IMAGE_FILE_EXTENSIONS.has(elements[hoveredElement].file.split(".").pop()) ? 5 : 0))}}>{idToLabel[elements[hoveredElement].label].name}</div>
                    }

                    {dataset && hoveredElement != null && IMAGE_FILE_EXTENSIONS.has(elements[hoveredElement].file.split(".").pop()) &&
                        <img className="dataset-sidebar-element-preview" style={{top: elementLabelTop}} src={elements[hoveredElement].file}/>
                    }

                    
                </div>

                <div className="dataset-toolbar-resizeable" onMouseDown={resizeLeftToolbarHandleMouseDown}></div>
            </div>

            <div className="dataset-main" style={{width: "calc(100% - " + toolbarLeftWidth + "px - " + toolbarRightWidth + "px)"}}>
                <div className="dataset-main-toolbar-outer" style={{height: toolbarMainHeight + "px"}}>
                    <div className="dataset-main-toolbar" style={{display: (toolbarMainHeight > 25 ? "flex" : "none")}}>
                        {dataset && <div className="dataset-title-container unselectable" onClick={() => {setShowDatasetDescription(!showDatasetDescription)}}>
                            {dataset.datatype == "classification" && <img title="Type: Classification" className="dataset-title-icon" src={BACKEND_URL + "/static/images/classification.png"}/>}
                            {dataset.datatype == "area" && <img title="Type: Area" className="dataset-title-icon" src={BACKEND_URL + "/static/images/area.svg"}/>}
                            
                            <p className="dataset-title" title={(!showDatasetDescription ? "Show description" : "Hide description")}>{dataset && dataset.name}</p>

                            <img className="dataset-title-expand-icon" src={BACKEND_URL + "/static/images/" + (!showDatasetDescription ? "plus.png" : "minus.png")} />
                        </div>}

                        {dataset && <button className="dataset-download-button" onClick={() => setShowDownloadPopup(true)}><img className="dataset-download-icon" src={BACKEND_URL + "/static/images/download.svg"} title="Download dataset"/>Download</button>}
                    
                        {elements && elements[elementsIndex] && IMAGE_FILE_EXTENSIONS.has(elements[elementsIndex].file.split(".").pop()) && <div className="resize-form" onSubmit={(e) => {
                            e.preventDefault()
                            resizeElementImage()
                        }}>
                            
                            <label className="resize-label">Width</label>
                            <div className="resize-inp">
                                {currentImageWidth}
                            </div>

                            <label className="resize-label resize-label-margin">Height</label>
                            <div className="resize-inp">
                                {currentImageHeight}
                            </div>
                        </div>}
                    </div>

                    <div className="dataset-main-toolbar-resize" 
                        onMouseDown={resizeMainToolbarHandleMouseDown} 
                        style={{height: (toolbarMainHeight == 15 ? "15px" : "5px")}}
                        >
                        {toolbarMainHeight == 15 && <img className="toolbar-main-dropdown" src={BACKEND_URL + "/static/images/down.svg"} />}
                    </div>
                </div>
                
                <div className="dataset-main-display">
                    {elements.length != 0 && !showDatasetDescription && <div className="dataset-element-view-container">
                        {getPreviewElement(elements[elementsIndex])}
                    </div>}

                    {showDatasetDescription && dataset && dataset.description && <div className="dataset-description-display-container" ref={descriptionContainerRef}>
                        <div className="dataset-description-image-container" style={{width: "calc(100% - " + descriptionWidth + "%)"}}>
                            <img className="dataset-description-image" src={dataset.image} />
                        </div>

                        <div className="dataset-description-resize" onMouseDown={resizeDescriptionHandleMouseDown}></div>

                        <div className="dataset-description-display" style={{width: "calc(" + descriptionWidth + "%" + " - 5px)"}}>
                            <div className="dataset-description-stats">
                                {dataset.downloaders && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/download.svg"}/>
                                    {dataset.downloaders.length + (dataset.downloaders.length == 1 ? " download" : " downloads")}
                                </div>}

                                {elements && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/text.png"}/>
                                    {elements.length + (elements.length == 1 ? " element" : " elements")}
                                </div>}

                                {labels && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/label.png"}/>
                                    {labels.length + (labels.length == 1 ? " label" : " labels")}
                                </div>}
                            </div>

                            {dataset.imageWidth && <p className="dataset-description-text"><span className="dataset-description-start">Default Image Dimensions: </span>({dataset.imageWidth}, {dataset.imageHeight})</p>}

                            <p className="dataset-description-text dataset-description-text-flex" style={{textTransform: "capitalize"}}>
                                <span className="dataset-description-start">Datatype: </span>
                                <img className="dataset-description-icon" src={BACKEND_URL + "/static/images/" + (dataset.datatype == "area" ? "area.svg" : "classification.png")}/>
                                {dataset.datatype}
                            </p>

                            <p className="dataset-description-text"><span className="dataset-description-start">Owner: </span>{dataset.ownername}</p><br></br>
                            {(dataset.description ? <p className="dataset-description-text dataset-description-text-margin"><span className="dataset-description-start">Description: </span>{dataset.description}</p> : "This dataset does not have a description.")}

                            {dataset.keywords && dataset.keywords.length > 0 && <div className="dataset-description-keywords">
                                {dataset.keywords.length > 0 && <span className="gray-text dataset-description-keywords-title">Keywords: </span>}
                                {dataset.keywords.map((e, i) => (
                                    <div title={e} className="dataset-description-keyword" key={i}>{e}</div>
                                ))}
                            </div>}

                            <button className="hide-description-button" onClick={() => {setShowDatasetDescription(false)}}>Hide description</button>
                        </div>
                    </div>}
                </div>
                
            </div>

            <div className="dataset-toolbar-right" style={{width: toolbarRightWidth + "px"}}>
                <div className="dataset-toolbar-resizeable" onMouseDown={resizeRightToolbarHandleMouseDown}></div>
                <div className="dataset-labels">
                    <div className={"dataset-labels-scrollable " + (dataset && dataset.datatype=="area" ? "dataset-labels-nonscrollable" : "")}>
                        <p className={"dataset-sidebar-title " + (toolbarRightWidth < 150 ? "dataset-sidebar-title-small" : "")}>Labels</p>
    
                        <DragDropContext className="dataset-labels-list" onDragEnd={labelsHandleDragEnd}>
                            <div className={"dataset-labels-container " + ((dataset && dataset.datatype == "area") ? "dataset-labels-container-area" : "")}>
                            <Droppable droppableId="labels-droppable" className="dataset-labels-container-inner">

                                    {(provided) => (<div className="dataset-labels-container-inner"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}>
                                        {labels.map((label, idx) => (
                                            <Draggable key={label.id} draggableId={"" + label.id} index={idx}>
                                                {(provided) => (<div className={"dataset-sidebar-element default-cursor " + (toolbarRightWidth < 150 ? "dataset-sidebar-element-small" : "")} key={label.id}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{...provided.draggableProps.style}}
                                                ref={provided.innerRef}>
                                                    <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                                                    <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                                                </div>)}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder} 
                                    </div>)}
                                </Droppable>
                            </div>
                        </DragDropContext>

                        {dataset && dataset.datatype == "area" && <div className="dataset-areas-container dataset-areas-container-public">
                            {elements[elementsIndex].areas.map((area, areaIdx) => (
                                <div className={"dataset-sidebar-element-area " + (toolbarRightWidth < 150 ? "dataset-sidebar-element-small" : "")}
                                    title={"Area: " + idToLabel[area.label].name}
                                    onMouseEnter={(e) => setHoveredAreaId(area.id)}
                                    onMouseLeave={(e) => setHoveredAreaId(null)}
                                    key={areaIdx}
                                    >
                                        <img className="dataset-element-area-icon" src={BACKEND_URL + "/static/images/area.svg"} />
                                        <span className="dataset-area-name">{idToLabel[area.label].name}</span>
                                        <span title={"Points: " + JSON.parse(area.area_points).length} 
                                        className={"dataset-sidebar-label-keybind no-box-shadow border " + (toolbarRightWidth < 150 ? "dataset-sidebar-label-keybind-small" : "")}
                                        style={{borderColor: (idToLabel[area.label].color)}}>{JSON.parse(area.area_points).length}</span>
                                        
                                </div>
                            ))}
                        </div>}
                    </div>
                    

                </div>
            </div>
        </div>
    )

    
}

export default PublicDataset