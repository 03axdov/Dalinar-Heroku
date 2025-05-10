import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../popups/DownloadPopup"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";
import DownloadCode from "../components/DownloadCode";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ProgressBar from "../components/ProgressBar";
import DescriptionTable from "../components/DescriptionTable"
import TitleSetter from "../components/minor/TitleSetter";
import CreateLabel from "../popups/dataset/CreateLabel";
import EditLabel from "../popups/dataset/EditLabel";
import EditElement from "../popups/dataset/EditElement";
import { Helmet } from "react-helmet";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function Dataset({currentProfile, activateConfirmPopup, notification, BACKEND_URL, isPublic=false}) {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])    // Label points to label id
    const [labels, setLabels] = useState([])
    const [elementsIndex, setElementsIndex] = useState(0)
    const currentElementRef = useRef(null);

    const [originalText, setOriginalText] = useState("")
    const [currentText, setCurrentText] = useState("")
    const [textChanged, setTextChanged] = useState(false)

    const [showElementPreview, setShowElementPreview] = useState(false)
    const [showElementPreviewTimeout, setShowElementPreviewTimeout] = useState(null);

    // For loading animations
    const [loading, setLoading] = useState(true)
    const [uploadLoading, setUploadLoading] = useState(false)
    const [uploadPercentage, setUploadPercentage] = useState(0) // Used for the loading bar
    const [loadingLabelCreate, setLoadingLabelCreate] = useState(false)
    const [loadingLabelEdit, setLoadingLabelEdit] = useState(false)
    const [loadingLabelDelete, setLoadingLabelDelete] = useState(false)
    const [loadingElementEdit, setLoadingElementEdit] = useState(false)
    const [loadingElementDelete, setLoadingElementDelete] = useState(false)
    const [loadingResizeImage, setLoadingResizeImage] = useState(false)

    const [saving, setSaving] = useState(false)
    
    const [displayCreateLabel, setDisplayCreateLabel] = useState(false)

    const [elementLabelTop, setElementLabelTop] = useState(0)
    
    const [labelKeybinds, setLabelKeybinds] = useState({})  // Key: keybind, value: pointer to label
    const [idToLabel, setIdToLabel] = useState({})  // Key: id, value: label

    const [hoveredElement, setHoveredElement] = useState(null)
    const [hoveredLabel, setHoveredLabel] = useState(null)
    const [datasetMainLabelColor, setDatasetMainLabelColor] = useState("transparent") // Used to load image in low res first

    const [editingLabel, setEditingLabel] = useState(null) // Either null or pointer to label

    const [editingElement, setEditingElement] = useState(null)
    const [editingElementIdx, setEditingElementIdx] = useState(null)

    const [showDownloadPopup, setShowDownloadPopup] = useState(false)

    const [showDatasetDescription, setShowDatasetDescription] = useState(isPublic)

    const [isDownloaded, setIsDownloaded] = useState(false)
    const [downloadFramework, setDownloadFramework] = useState("tensorflow")
    const [downloadType, setDownloadType] = useState("folders")
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadingPercentage, setDownloadingPercentage] = useState(false)

    const hiddenFolderInputRef = useRef(null);
    const hiddenFileInputRef = useRef(null);

    const pageRef = useRef(null)

    const [inputFocused, setInputFocused] = useState(false);  // Don't use keybinds if input is focused

    const [currentImageWidth, setCurrentImageWidth] = useState(0)    // Only used if current element is an image
    const [currentImageHeight, setCurrentImageHeight] = useState(0)  // Only used if current element is an image

    const [descriptionWidth, setDescriptionWidth] = useState(40)    // As percentage

    const [toolbarLeftWidth, setToolbarLeftWidth] = useState(185)   // In pixels
    const [toolbarRightWidth, setToolbarRightWidth] = useState(185) // In pixels
    const [toolbarMainHeight, setToolbarMainHeight] = useState(50)

    const [imageMouseDown, setImageMouseDown] = useState(false)
    const [rectanglePreviewOffset, setRectanglePreviewOffset] = useState(0) // x, y
    const [rectanglePreviewDimensions, setRectanglePreviewDimensions] = useState([0,0]) // x, y

    const [displayAreas, setDisplayAreas] = useState(false)

    const [cursor, setCursor] = useState("")

    const datasetMainDisplayRef = useRef(null)

    // Update current image dimensions
    useEffect(() => {
        let currentElement = elements[elementsIndex]
        if (!currentElement) {return}

        if (dataset && dataset.dataset_type.toLowerCase() == "image") {
            if (currentElement.imageWidth) {setCurrentImageWidth(currentElement.imageWidth)}
            else {setCurrentImageWidth("")}
            
            if (currentElement.imageHeight) {setCurrentImageHeight(currentElement.imageHeight)}
            else {setCurrentImageHeight("")}
        } else if (dataset && dataset.dataset_type.toLowerCase() == "text") {
            setTextChanged(false)
            setCurrentText(currentElement.text)
            setOriginalText(currentElement.text)
        }   

    }, [elements, elementsIndex])

    // Zoom functionality
    const elementContainerRef = useRef(null)
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });


    // AREA DATASET FUNCTIONALITY
    const [labelSelected, setLabelSelected] = useState(null)    // Id of selected label
    const [updateArea, setUpdateArea] = useState(false)
    const [hoveredAreaId, setHoveredAreaId] = useState(null)

    const [pointSelected, setPointSelected] = useState([-1,-1]) // ID of area, idx of point
    const [pointSelectedCoords, setPointSelectedCoords] = useState([0,0])   // x,y of selected point (%)
    const [selectedArea, setSelectedArea] = useState(null) // the area
    const [selectedAreaIdx, setSelectedAreaIdx] = useState(null)

    const canvasRefs = useRef([])
    const elementRef = useRef(null)

    const DOT_SIZE = 18

    // For drawing lines for area datasets
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
                x: (point[0] / 100) * canvas.offsetWidth + DOT_SIZE / 2,
                y: (point[1] / 100) * canvas.offsetHeight + DOT_SIZE / 2,
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
    }, [elements, elementsIndex, canvasRefs, updateArea, labels]);   // When element areas update


    function polarAngle(p1, p2) {
        return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    }
    
    function reorderPoints(points) {
        if (points.length <= 1) return points;
    
        const startPoint = points[0];
    
        // Sort the remaining points by polar angle relative to the start point
        const sortedPoints = points.slice(1).sort((a, b) => 
            polarAngle(startPoint, a) - polarAngle(startPoint, b)
        );
    
        return [startPoint, ...sortedPoints];
    }

    function updatePoints(area, newPoint, pointIdx, remove=false) {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/edit-area/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let updatedPoints = JSON.parse(area.area_points)
        if (!remove) {
            updatedPoints[pointIdx] = [newPoint[0], newPoint[1]]
        } else {
            updatedPoints.splice(pointIdx, 1)
        }

        if (!updatedPoints) {return}

        updatedPoints = reorderPoints(updatedPoints)

        const data = {
            "area": area.id,
            "area_points": JSON.stringify(updatedPoints)
        }

        setLoading(true)
        axios.post(URL, data, config)
        .then((res) => {
            let temp = [...elements]
            if (res.data.deleted == false) {
                temp[elementsIndex].areas[selectedAreaIdx].area_points = JSON.stringify(updatedPoints)
            } else {
                notification("Successfully deleted area.", "success")
                temp[elementsIndex].areas.splice(selectedAreaIdx, 1)
            }
            
            setElements(temp)
            
        })
        .catch((err) => {
            notification("Error: " + err + ".", "failure")
            console.log(err)
        }).finally(() => {
            setPointSelected([-1,-1])
            setLoading(false)
        })
    }


    function pointOnDrag(e) {
        if (pointSelected[0] === -1 || pointSelected[1] === -1) return;

        const imageElement = elementRef.current;
        const boundingRect = imageElement.getBoundingClientRect();
    
        // Adjust for zoom (assuming zoom is a numeric value like 1 to 5)
        const zoomAdjustedLeft = (e.clientX - boundingRect.left) / zoom;
        const zoomAdjustedTop = (e.clientY - boundingRect.top) / zoom;
    
        const clickX = Math.max(0, zoomAdjustedLeft - (DOT_SIZE / 2));
        const clickY = Math.max(0, zoomAdjustedTop - (DOT_SIZE / 2));
    
        const newX = Math.round((clickX / (boundingRect.width / zoom)) * 1000) / 10;  // Round to 1 decimal
        const newY = Math.round((clickY / (boundingRect.height / zoom)) * 1000) / 10;
    
        setPointSelectedCoords([newX, newY]);

    }

    function getPoints(area, areaIdx) {
        if (!area) {return}
        let points = JSON.parse(area.area_points)
        return <div key={area.id} className={(hoveredAreaId && hoveredAreaId != area.id ? "display-none" : "")}>
            <canvas ref={(el) => (canvasRefs.current[areaIdx] = el)} 
                    className={"dataset-element-view-canvas " + 
                        (hoveredAreaId ? "dataset-element-view-canvas-background" : "") +
                        (displayAreas ? "" : "hidden")} 
                    style={{zIndex: 1, width:"100%", 
                            height:"100%", top: 0, 
                            left: 0, position: "absolute", 
                            display: (pointSelected[0] == area.id ? "none" : "block")}}></canvas>
            {points.map((point, idx) => (
                <div title={(isPublic ? "" : "Click to drag" )}
                    className={"dataset-element-view-point " + 
                        ((pointSelected[0] == area.id && pointSelected[1] == idx) ? "dataset-element-view-point-selected" : "") +
                        (displayAreas ? "" : "hidden")} 
                    key={idx} 
                    style={{top: ((pointSelected[0] == area.id && pointSelected[1] == idx) ? pointSelectedCoords[1] : point[1]) + "%", 
                            left: ((pointSelected[0] == area.id && pointSelected[1] == idx) ? pointSelectedCoords[0] : point[0]) + "%", 
                            "background": (idToLabel[area.label].color),
                            "cursor": (isPublic ? "default" : "pointer")
                        }} 
                    onClick={(e) => {
                        e.stopPropagation()
                        if (isPublic) return;
                        if (pointSelected[0] != area.id || pointSelected[1] != idx) {
                            setPointSelectedCoords([point[0], point[1]])
                            setSelectedAreaIdx(areaIdx)
                            setSelectedArea(area)
                            setLabelSelected(null)
                            setPointSelected([area.id, idx])
                        } else {
                            updatePoints(area, pointSelectedCoords, idx)
                        }
                    }}
                    
                >
                    {idx == 0 && <div 
                    className="dataset-element-view-point-label"
                    style={{background: idToLabel[area.label].color, 
                            color: getTextColor(idToLabel[area.label].color),
                            display: ((pointSelected[0] == area.id && pointSelected[1] == 0) ? "none" : "block"),
                            pointerEvents: "none"}}
                    onClick={(e) => e.stopPropagation()}>
                        {(idToLabel[area.label] ? idToLabel[area.label].name : "")}
                        {idToLabel[area.label] && <span> ({areaIdx + 1})</span>}
                    </div>}
                </div>
            ))}
        </div>
    }

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

    // For Area datasets

    const handleImageMouseDown = (event) => {
        event.preventDefault();
        if (isPublic) return;
        const imageElement = elementRef.current;
        if (imageElement ) {

            let areas = elements[elementsIndex].areas

            const boundingRect = imageElement.getBoundingClientRect();

            const startX = Math.max(0, event.clientX - boundingRect.left - (DOT_SIZE / 2)); // X coordinate relative to image, the offset depends on size of dot
            const startY = Math.max(0, event.clientY - boundingRect.top - (DOT_SIZE / 2));  // Y coordinate relative to image

            const startXPercent = Math.round((startX / boundingRect.width) * 100 * 10) / 10   // Round to 1 decimal
            const startYPercent = Math.round((startY / boundingRect.height) * 100 * 10) / 10

            setRectanglePreviewDimensions([0, 0])
            setRectanglePreviewOffset([0, 0])
            setImageMouseDown(true)
        
            const handleMouseMove = (e) => {
                const newX = Math.max(0, e.clientX - boundingRect.left - (DOT_SIZE / 2)); // X coordinate relative to image, the offset depends on size of dot
                const newY = Math.max(0, e.clientY - boundingRect.top - (DOT_SIZE / 2));  // Y coordinate relative to image

                const newXPercent = Math.round((newX / boundingRect.width) * 100 * 10) / 10   // Round to 1 decimal
                const newYPercent = Math.round((newY / boundingRect.height) * 100 * 10) / 10

                setRectanglePreviewOffset([Math.min(startXPercent, newXPercent), Math.min(startYPercent, newYPercent)])
                setRectanglePreviewDimensions([Math.abs(startXPercent - newXPercent), Math.abs(startYPercent - newYPercent)])
                  
            };
        
            const handleMouseUp = (e) => {

                const endX = Math.max(0, e.clientX - boundingRect.left - (DOT_SIZE / 2)); // X coordinate relative to image, the offset depends on size of dot
                const endY = Math.max(0, e.clientY - boundingRect.top - (DOT_SIZE / 2));  // Y coordinate relative to image

                const endXPercent = Math.round((endX / boundingRect.width) * 100 * 10) / 10   // Round to 1 decimal
                const endYPercent = Math.round((endY / boundingRect.height) * 100 * 10) / 10

                if ((Math.abs(endXPercent - startXPercent) < 0.1 || Math.abs(endYPercent - startYPercent) < 0.1 || !labelSelected)) {   // Only create one point
                    createPoint(areas, endXPercent, endYPercent)
                } else {    // Create square
                    const points = [[startXPercent, startYPercent],
                                    [endXPercent, startYPercent],
                                    [endXPercent, endYPercent],
                                    [startXPercent, endYPercent]]
                    createPoints(points)
                }

                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);

                setImageMouseDown(false)
                setRectanglePreviewOffset([0,0])
                setRectanglePreviewDimensions([0,0])
            };
        
            document.addEventListener("mousemove", handleMouseMove);

            document.addEventListener("mouseup", handleMouseUp);
        }
    
        
    }


    function createPoints(points) {  // Points is an array of [clickXPercent, clickYPercent]
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';
        
        const URL = window.location.origin + '/api/create-area/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "element": elements[elementsIndex].id,
            "label": labelSelected,
            "area_points": JSON.stringify(points)
        }

        setLoading(true)
        axios.post(URL, data, config)
        .then((res) => {
            let temp = [...elements]
            temp[elementsIndex].areas.push(res.data)

            setLabelSelected(null)
            setPointSelected([-1,-1])
            setSelectedAreaIdx(temp[elementsIndex].areas.length - 1)
            setSelectedArea(res.data)

            setElements(temp)
            
        })
        .catch((err) => {
            notification("Error: " + err + ".", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    function createPoint(areas, clickXPercent, clickYPercent) {
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        if (selectedAreaIdx === null) {    // Create new area
            const URL = window.location.origin + '/api/create-area/'
            const config = {headers: {'Content-Type': 'application/json'}}
    
            const data = {
                "element": elements[elementsIndex].id,
                "label": labelSelected,
                "area_points": JSON.stringify([[clickXPercent, clickYPercent]])
            }
    
            setLoading(true)
            axios.post(URL, data, config)
            .then((res) => {
                let temp = [...elements]
                temp[elementsIndex].areas.push(res.data)

                setLabelSelected(null)
                setPointSelected([-1,-1])
                setSelectedAreaIdx(temp[elementsIndex].areas.length - 1)
                setSelectedArea(res.data)

                setElements(temp)
                
            })
            .catch((err) => {
                notification("Error: " + err + ".", "failure")
                console.log(err)
            }).finally(() => {
                setLoading(false)
            })

        } else {    // Update existing area for this label and element

            const URL = window.location.origin + '/api/edit-area/'
            const config = {headers: {'Content-Type': 'application/json'}}

            let updatedPoints = JSON.parse(areas[selectedAreaIdx].area_points)
            updatedPoints.push([clickXPercent, clickYPercent])
    
            const data = {
                "area": areas[selectedAreaIdx].id,
                "area_points": JSON.stringify(updatedPoints)
            }

            updatedPoints = reorderPoints(updatedPoints)
    
            setLoading(true)
            axios.post(URL, data, config)
            .then((res) => {
                let temp = [...elements]
                temp[elementsIndex].areas[selectedAreaIdx].area_points = JSON.stringify(updatedPoints)
                setElements(temp)
                
            })
            .catch((err) => {
                notification("Error: " + err, "failure")
                console.log(err)
            }).finally(() => {
                setLoading(false)
            })
        }
    }

    function deleteArea(area, elementIdx, areaIdx) {
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/delete-area/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "area": area.id,
        }

        axios.post(URL, data, config)
        .then((res) => {
            let temp = [...elements]
            temp[elementIdx].areas.splice(areaIdx, 1)

            setHoveredAreaId(null)
            if (selectedAreaIdx == areaIdx) {
                setSelectedArea(null)
                setSelectedAreaIdx(null)
            }

            setElements(temp)
            notification("Successfully deleted area.", "success")
            
        })
        .catch((err) => {
            notification("Error: " + err + ".", "failure")
            console.log(err)
        })
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


    // END OF DATATYPE AREA FUNCTIONALITY

    const [ALLOWED_FILE_EXTENSIONS, setALLOWED_FILE_EXTENSIONS] = useState(new Set())

    function inputOnFocus() {
        setInputFocused(true)
    }
    function inputOnBlur() {
        setInputFocused(false)
    }

    const navigate = useNavigate()

    useEffect(() => {
        getDataset()
    }, [])

    useEffect(() => {
        if (dataset) {
            setShowDatasetDescription(false)
        }
        if (datasetMainDisplayRef.current) {
            datasetMainDisplayRef.current.scrollTop = 0
        }
    }, [elementsIndex])

    useEffect(() => {
        if (isPublic) return;
        if (currentProfile && dataset && !loading) {
            if (currentProfile.user && dataset.owner) {
                if (currentProfile.user != dataset.owner) {
                    navigate("/datasets/public/" + id)
                }
            }
            
        }
    }, [currentProfile, dataset])


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
        setDisplayAreas(false)
        if (!currentElementRef.current) return;
        currentElementRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        
    }, [elementsIndex])

    // Handles user button presses
    useEffect(() => {
        const handleKeyDown = (event) => {

            if (loading || inputFocused) {return};  

            let key = getUserPressKeycode(event)
            
            if (key === "ArrowDown" || key === "ArrowRight") {    
                event.preventDefault()
                if (loading) {
                    notification("Cannot switch element while loading.", "failure")
                    return;
                }
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
   
            } else if (key === "ArrowUp" || key === "ArrowLeft") {
                event.preventDefault()
                if (loading) {
                    notification("Cannot switch element while loading.", "failure")
                    return;
                }
                setElementsIndex(Math.max(elementsIndex - 1, 0))  

            } else if (labelKeybinds[key]) {
                if (isPublic) return;
                labelOnClick(labelKeybinds[key])
            } else if (key === "Backspace" || key === "Delete") {  // For datatype area, deleting points
                if (isPublic) return;
                if (pointSelected[0] != -1 || pointSelected[1] != -1) {
                    updatePoints(selectedArea, [], pointSelected[1], true) // Remove point
                }
            }
        };
    
        // Attach the event listener
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, false);
        };
    }, [loading, elements, elementsIndex, inputFocused, labelSelected, pointSelected])


    function getDataset() {
        setLoading(true)

        let URL = window.location.origin + "/api/datasets/" +
            (isPublic ? "public/" : "") + id

        axios({
            method: 'GET',
            url: URL,
        })
        .then((res) => {
            setDataset(res.data)

            setALLOWED_FILE_EXTENSIONS(res.data.dataset_type.toLowerCase() == "image" ? new Set(["png", "jpg", "jpeg", "webp", "avif"]) : new Set(["txt", "doc", "docx"]))

            setElements(res.data.elements)

            setLabels(res.data.labels)

            // Update keybinds
            parseLabels(res.data.labels)

        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading dataset with id " + id + ".", "failure")

            console.log(err)

        }).finally(() => {
            setLoading(false)
        })
    }

    function saveDataset() {
        if (!currentProfile) {return}

        const URL = window.location.origin + '/api/save-dataset/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": dataset.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (saving) {return}
        setSaving(true)

        axios.post(URL, data, config)
        .then((data) => {
            let tempDataset = {...dataset}
            tempDataset.saved_by.push(currentProfile.user)
            setDataset(tempDataset)
        }).catch((error) => {

            notification("Error: " + error, "failure")
            
        }).finally(() => {
            setSaving(false)
        })
    }

    function unsaveDataset() {
        if (!currentProfile) {return}

        const URL = window.location.origin + '/api/unsave-dataset/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": dataset.id
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (saving) {return}
        setSaving(true)

        axios.post(URL, data, config)
        .then((data) => {
            let tempDataset = {...dataset}
            tempDataset.saved_by = tempDataset.saved_by.filter((user) => user != currentProfile.user)
            setDataset(tempDataset)
        }).catch((error) => {

            notification("Error: " + error, "failure")
            
        }).finally(() => {
            setSaving(false)
        })
    }

    // ELEMENT FUNCTIONALITY

    // Element Scroll Functionality (doesn't work for area datasets because of the way points work)
    const minZoom = 1
    const maxZoom = 3

    const handleElementScroll = (e) => {

        const rect = elementContainerRef.current.getBoundingClientRect();

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newZoom = Math.min(Math.max(zoom + e.deltaY * -0.00125, minZoom), maxZoom);

        if (newZoom > zoom) {
            if (zoom < 1.25) {
                setPosition({ x: x, y: y }); 
            } else if (zoom < 3) {
                const newX = position.x - (position.x - x) / 10
                const newY = position.y - (position.y - y) / 10
                setPosition({ x: newX, y: newY }); 
            }
        }
        

        
        setZoom(newZoom);
    };
    

    
    const [lastMousePos, setLastMousePos] = useState(null);

    const handleElementMouseMove = (e) => {
        setCursor("")
        if (zoom === 1 || e.buttons !== 2) {
            setLastMousePos(null); // Reset when not grabbing
            return;
        }
    
        if (e.buttons === 2) {
            setCursor("grabbing");
        }
    
        const rect = elementContainerRef.current.getBoundingClientRect();
        const currentX = e.clientX;
        const currentY = e.clientY;
    
        if (lastMousePos) {
            const dx = currentX - lastMousePos.x;
            const dy = currentY - lastMousePos.y;
    
            const DAMPENING = 1 / (zoom * 1.5);  // try values like 0.3 - 0.7

            const percentX = (dx / rect.width) * 100 * DAMPENING;
            const percentY = (dy / rect.height) * 100 * DAMPENING;

    
            setPosition(prev => ({
                x: prev.x - percentX,
                y: prev.y - percentY,
            }));
        }
    
        setLastMousePos({ x: currentX, y: currentY });
    
    };

    function getPreviewElement(element) {
        const extension = (element.file ? element.file.split(".").pop().split("?")[0] : "")
        
        if (ALLOWED_FILE_EXTENSIONS.has(extension) && dataset.dataset_type.toLowerCase() == "image") {
            if (dataset.datatype == "classification") {
                return <div className="dataset-element-view-image-container" 
                    ref={elementContainerRef} 
                    onWheel={handleElementScroll}
                    onMouseMove={handleElementMouseMove}
                    style={{overflow: "hidden"}}>
                        {element.label && idToLabel[element.label] && <div className="dataset-element-view-label">
                            <span className="text-label-color" style={{background: idToLabel[element.label].color}}></span>
                            {idToLabel[element.label].name}
                        </div>}
                        <img ref={elementRef} 
                        className="dataset-element-view-image" 
                        src={element.file} 
                        alt="Element image"
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
                onClick={(e) => {
                    if (isPublic) return;
                    if (pointSelected[0] == -1 && pointSelected[1] == -1) { // Don't do this if a point is selected
                        setLabelSelected(null)
                        setSelectedArea(null)
                        setSelectedAreaIdx(null)
                    }
                    
                }}
                ref={elementContainerRef}
                onWheel={handleElementScroll}
                onMouseMove={handleElementMouseMove}
                style={{overflow: "hidden"}}>
                    {selectedArea && <div className="dataset-element-view-label">
                        <span className="text-label-color" style={{background: idToLabel[selectedArea.label].color}}></span>
                        {idToLabel[selectedArea.label].name}
                        <span className="gray-text" style={{marginLeft: "5px"}}>({selectedAreaIdx + 1})</span>
                    </div>}
                    {labelSelected && <div className="dataset-element-view-label">
                        <span className="text-label-color" style={{background: idToLabel[labelSelected].color}}></span>
                        {idToLabel[labelSelected].name}
                    </div>}
                    <div className="dataset-element-view-image-wrapper" 
                    onMouseMove={(e) => pointOnDrag(e)}
                    style={{
                        transform: `scale(${zoom}) translate(${(50 - position.x) * (zoom - 1)}%, ${(50 - position.y) * (zoom - 1)}%)`,
                        transformOrigin: "center",
                        transition: "transform 0.1s ease-out",
                    }}
                    onClick={(e) => e.stopPropagation()}>
                        <img onLoad={() => {
                            setDisplayAreas(true)
                            setUpdateArea(!updateArea)
                        }} 
                        ref={elementRef} 
                        alt="Element image"
                        className="dataset-element-view-image-area" 
                        src={element.file} 
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        onMouseDown={(e) => {
                            if (isPublic) return;
                            if ((pointSelected[0] == -1 && pointSelected[1] == -1) && (labelSelected != null || selectedArea != null) && (e.button === 0)) {    // Only left click
                                handleImageMouseDown(e)
                            }
                        }}
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}/>
                        {elements[elementsIndex].areas && elements[elementsIndex].areas.map((area, idx) => (
                            getPoints(area, idx)
                        ))}

                        {!isPublic && imageMouseDown && labelSelected && rectanglePreviewDimensions[0] > 0 && rectanglePreviewDimensions[1] > 0 && <div 
                        className="dataset-rectangle-preview"
                        style={{
                            width: "calc(" + rectanglePreviewDimensions[0] + "% + " + Math.round(5 / (1 + (zoom - 1)* 3)) + "px)",
                            height: "calc(" + rectanglePreviewDimensions[1] + "% + " + Math.round(5 / (1 + (zoom - 1)* 3)) + "px)",
                            left: "calc(" + rectanglePreviewOffset[0] + "% + " + Math.round(5 / (1 + (zoom - 1)* 3)) + "px)",
                            top: "calc(" + rectanglePreviewOffset[1] + "% + " + Math.round(5 / (1 +(zoom - 1)* 3)) + "px)",
                            background: idToLabel[labelSelected].color + "50"
                        }}>
                            
                        </div>}
                    </div>
                </div>
            }
            

        } else if (dataset.dataset_type.toLowerCase() == "text") {
            return <div className="dataset-element-view-text-container">
                {element.label && idToLabel[element.label] && <div className="dataset-element-view-label" style={{background: "var(--toolbar)", border: "none"}}>
                    <span className="text-label-color" style={{background: idToLabel[element.label].color}}></span>
                    {idToLabel[element.label].name}
                </div>}
                {!isPublic && <div className="dataset-text-save-button-container">
                    <button className={"dataset-text-save-button " + (!textChanged ? "dataset-text-save-button-disabled" : "")} type="button" onClick={(e) => {
                        if (textChanged) {
                            updateElement(e, "", true)
                        }
                        
                    }}>Save changes</button>
                </div>}
                
                {!isPublic && <textarea className="dataset-element-view-text" style={{display: (currentText ? "block" : "none")}} value={currentText} onChange={(e) => {
                    if (!e.target.value) {
                        notification("Cannot remove all text.", "failure")
                        return;
                    };
                    if (e.target.value != originalText) setTextChanged(true)
                    else {setTextChanged(false)}
                    setCurrentText(e.target.value)
                }}>
                </textarea>}
                {isPublic && <p className="dataset-element-view-text" style={{display: (currentText ? "block" : "none")}}>
                    {currentText}
                </p>}
            </div>
            
        } else {
            return <div className="extension-not-found">File of type .{extension} could not be rendered.</div>
        }
    }


    function folderInputClick() {
        if (hiddenFolderInputRef.current) {
            hiddenFolderInputRef.current.click();
        }
    }

    function fileInputClick() {
        if (hiddenFileInputRef.current) {
            hiddenFileInputRef.current.click();
        }
    }

    async function elementFilesUploaded(e) {
        if (isPublic) return;
        let files = e.target.files

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let totalSize = 0
        for (let i=0; i < files.length; i++) {
            let file = files[i]
            totalSize += file.size
        }

        if (totalSize > 1 * 10**9) {
            notification("A maximum of 1 Gb can be uploaded at a time.", "failure")
            return;
        }
        
        createElements(files)

    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function uploadWithRetry(url, formData, config, retries = 5, delayMs = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                await axios.post(url, formData, config);
                return;  // success
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    let waitTime = delayMs * (i + 1); // default backoff
    
                    const retryAfter = error.response.headers['retry-after'];
                    if (retryAfter) {
                        const parsed = parseInt(retryAfter, 10);
                        // Retry-After can be seconds or HTTP date. Assume seconds if numeric.
                        waitTime = isNaN(parsed) ? delayMs * (i + 1) : parsed * 1000;
                    }
    
                    console.warn(`Rate limited. Waiting ${waitTime} ms before retry... (${i + 1}/${retries})`);
                    await delay(waitTime);
                } else {
                    throw error;  // non-rate-limit errors
                }
            }
        }
        throw new Error("Upload failed after multiple retries due to rate limits.");
    }
    
    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }
    
    function createElements(files) {
        if (isPublic) return;
        setUploadLoading(true);
    
        const URL = window.location.origin + '/api/create-elements/';  // plural endpoint
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    
        const fileChunks = chunkArray([...files].filter(f => ALLOWED_FILE_EXTENSIONS.has(f.name.split(".").pop())), 10);
        let completedUploads = 0;
    
        const uploadChunk = async (chunk) => {
            const formData = new FormData();
            chunk.forEach((file, i) => formData.append('files', file));  // Django: request.FILES.getlist("files")
            formData.append('dataset', dataset.id);
            if (elements.length > 0) formData.append("index", elements.length);
    
            await uploadWithRetry(URL, formData, config);
        };
    
        async function uploadAllChunks() {
            await Promise.all(fileChunks.map(async (chunk, i) => {
                try {
                    await uploadChunk(chunk);
                } catch (e) {
                    console.error("Chunk upload failed:", e);
                    notification("Upload failed for one or more batches.", "failure");
                } finally {
                    completedUploads++;
                    setUploadPercentage((completedUploads / fileChunks.length) * 100);
                }
            }));
        
            setTimeout(() => {
                setUploadPercentage(0);
                setUploadLoading(false);
                notification("Successfully uploaded files.", "success");
                getDataset();
            }, 200);
        }
    
        uploadAllChunks();
    }


    // isText used when updating text
    function updateElement(e, editingElementName, isText=false) {
        e.preventDefault()
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/edit-element/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "name": (isText ? elements[elementsIndex].name : editingElementName),
            "id": (isText ? elements[elementsIndex].id : editingElement),
            "text": currentText
        }

        if (loadingElementEdit) {return}

        setLoading(true)
        if (!isText) {
            setLoadingElementEdit(true)
        }


        axios.post(URL, data, config)
        .then((res) => {
            if (res.data) {
                if (!isText) {
                    elements[editingElementIdx] = res.data
                }
            }
            notification("Successfully updated element.", "success")
            setEditingElementIdx(null)
            setEditingElement(null)
        })
        .catch((err) => {
            notification("Error: " + err + ".", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
            if (!isText) {
                setLoadingElementEdit(false)
            } else {
                setOriginalText(currentText)
                setTextChanged(false)
            }
        })
    }

    function deleteElement(e) {
        e.preventDefault()
        if (isPublic) return;

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "element": editingElement
        }

        const URL = window.location.origin + '/api/delete-element/'
        const config = {headers: {'Content-Type': 'application/json'}}

        if (loadingElementDelete) {return}
        setLoading(true)
        setLoadingElementDelete(true)

        axios.post(URL, data, config)
        .then((data) => {
            console.log("Success: ", data)
            notification("Successfully deleted element.", "success")

            if (elementsIndex != 0) {
                setElementsIndex(elementsIndex - 1)
            }
            
            getDataset()

            setEditingElement(null)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")

        }).finally(() => {
            setLoading(false)
            setLoadingElementDelete(false)
        })
    }


    function resizeElementImage() {
        if (isPublic) return;
        if (currentImageWidth <= 0 || currentImageWidth > 1024 || currentImageHeight <= 0 || currentImageHeight > 1024) {
            notification("Dimensions must be between 0 and 750.", "failure")
            return
        }
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "id": elements[elementsIndex].id,
            "width": currentImageWidth,
            "height": currentImageHeight
        }

        const URL = window.location.origin + '/api/resize-element-image/'
        const config = {headers: {'Content-Type': 'application/json'}}

        if (loading || loadingResizeImage) {return}

        setLoading(true)
        setLoadingResizeImage(true)
        axios.post(URL, data, config)
        .then((res) => {

            let tempElements = [...elements]
            tempElements[elementsIndex] = res.data
            setElements(tempElements)

            notification("Successfully resized image.", "success")
        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setLoading(false)
            setLoadingResizeImage(false)
        })
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

            setLabelKeybinds(tempObjKeys)
            setIdToLabel(tempObjIds)
        }
    }


    function getLabels() {
        setLoading(true)
        
        axios({
            method: 'GET',
            url: window.location.origin + '/api/dataset-labels?dataset=' + id,
        })
        .then((res) => {
            setLabels(res.data.results)

            parseLabels(res.data.results)

            setLoading(false)
        }).catch((err) => {
            notification("An error occured when loading labels for dataset with id " + id + ".", "failure")
            console.log(err)
            setLoading(false)
        })
    }
    
    function createLabelSubmit(createLabelName, createLabelColor, createLabelKeybind) {
        if (isPublic) return;

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', createLabelName)
        formData.append('color', createLabelColor)
        formData.append('keybind', createLabelKeybind)
        formData.append('dataset', dataset.id)
        if (labels.length > 0) {    // So it's added to bottom of list
            formData.append("index", labels.length)
        }

        const URL = window.location.origin + '/api/create-label/'
        const config = {headers: {'Content-Type': 'application/json'}}
        
        if (loadingLabelCreate) {return}
        setLoadingLabelCreate(true)


        axios.post(URL, formData, config)
        .then((data) => {
            notification("Successfully created label.", "success")
            
            getLabels()
            setDisplayCreateLabel(false)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setLoadingLabelCreate(false)
        })

    }


    function labelOnClick(label) {
        if (isPublic) return;
        if (dataset.datatype == "classification") {
            axios.defaults.withCredentials = true;
            axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
            axios.defaults.xsrfCookieName = 'csrftoken';
    
            const URL = window.location.origin + '/api/edit-element-label/'
            const config = {headers: {'Content-Type': 'application/json'}}
    
            const data = {
                "label": label.id,
                "id": elements[elementsIndex].id
            }
    
            setLoading(true)
    
            setDatasetMainLabelColor(label.color)
            setTimeout(() => {
                setDatasetMainLabelColor("transparent")
            }, 100)
    
            axios.post(URL, data, config)
            .then((res) => {
    
                if (res.data) {
                    elements[elementsIndex] = res.data
                }
    
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))

            })
            .catch((err) => {
                notification("Error: " + err + ".", "failure")
                console.log(err)
            }).finally(() => {
                setLoading(false)
            })
        } else if (dataset.datatype == "area") {
            if (labelSelected != label.id) {
                setSelectedAreaIdx(null)
                setSelectedArea(null)
                setSelectedAreaIdx(null)
                setPointSelected([-1, -1])
                setLabelSelected(label.id)
            } else {
                setLabelSelected(null)
            }
            
        }
        
    }

    function removeCurrentElementLabel() {
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/remove-element-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "id": elements[elementsIndex].id
        }

        setLoading(true)
        axios.post(URL, data, config)
        .then((res) => {

            let tempElements = [...elements]
            tempElements[elementsIndex].label = null

            setElements(tempElements)
        })
        .catch((err) => {
            notification("Error: " + err + ".", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    function editLabelOnSubmit(editingLabelName, editingLabelColor, editingLabelKeybind) {
        if (isPublic) return;

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "label": editingLabel.id,
            "name": editingLabelName,
            "color": editingLabelColor,
            "keybind": editingLabelKeybind
        }

        const URL = window.location.origin + '/api/edit-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        if (loadingLabelEdit) {return}
        setLoadingLabelEdit(true)

        axios.post(URL, data, config)
        .then((data) => {
            notification("Successfully updated label.", "success")
            console.log("Success: ", data)
            
            getLabels()

            setEditingLabel(null)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")

        }).finally(() => {
            setLoadingLabelEdit(false)
        })
    }

    function deleteLabelInner() {
        if (isPublic) return;
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "label": editingLabel.id
        }

        const URL = window.location.origin + '/api/delete-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        if (loadingLabelDelete) {return}
        setLoadingLabelDelete(true)
        setLoading(true)

        axios.post(URL, data, config)
        .then((data) => {

            let tempElements = [...elements]
            for (let i=0; i < tempElements.length; i++) {
                if (tempElements[i].label == editingLabel) {
                    tempElements[i].label = null;     
                }  
                if (dataset.datatype == "area") {
                    tempElements[i].areas = tempElements[i].areas.filter((area) => {return area.label != editingLabel})
                }
            }
            setElements(tempElements)

            notification("Successfully deleted label.", "success")
            getLabels()

            setEditingLabel(null)

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")

        }).finally(() => {
            setLoading(false)
            setLoadingLabelDelete(false)
        })
    }

    function deleteLabel(e) {
        e.preventDefault()
        if (isPublic) return;

        activateConfirmPopup("Are you sure you want to delete this label? This action cannot be undone.", deleteLabelInner)
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

        }).catch((error) => {
            if (error.status == 401) {
                console.log("Did not increment download counter as user is not signed in.")
            } else {
                console.log("Error: ", error)
            }
            
        })
    }

    function afterDownload() {
        downloadAPICall()
        setIsDownloading(false)
        setDownloadingPercentage(0)
        setIsDownloaded(true)
    }

    async function labelFoldersDownload() {
        if (labels.length == 0) {
            notification("Cannot download datasets without labels.", "failure")
            return;
        }
        
        const zip = new JSZip();

        const labelToFolder = {
            
        }

        setDownloadingPercentage(0)
        setIsDownloading(true)

        let NUM_ELEMENTS = elements.length
        for (let i=0; i < elements.length; i++) {

            let label = idToLabel[elements[i].label]
            if (label && !labelToFolder[label.id]) {
                labelToFolder[label.id] = zip.folder(label.name)
            }
            if (!label && !labelToFolder["No_Label"]) {
                labelToFolder["No_Label"] = zip.folder("No_Label")
            }
            try {
                const response = await fetch(elements[i].file, {
                    headers: {
                        'pragma': 'no-cache',
                        'cache-control': 'no-cache'
                    }
                });
                const blob = await response.blob();
    
                let extension = elements[i].file.split(".").pop()
                let filename = elements[i].name
    
                if (filename.split(".").pop() != extension) {
                    filename += "." + extension
                }
    
                labelToFolder[(label ? label.id: "No_Label")].file(filename, blob);
            } catch (e) {
                notification("Error: " + e, "failure")
                
            }

            setDownloadingPercentage(Math.round(100 * ((i+1) / NUM_ELEMENTS)))
            
        }

        setDownloadingPercentage(100)

        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });

        setTimeout(() => {
            saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

            setDownloadType("folders")

            afterDownload()
        }, 200)
        
        
    }

    async function labelFilenamesDownload() {
        if (labels.length == 0) {
            notification("Cannot download datasets without labels.", "failure")
            return;
        }
        
        const zip = new JSZip();

        const labelToNbr = {
            
        }

        setDownloadingPercentage(0)
        setIsDownloading(true)
        let NUM_ELEMENTS = elements.length

        for (let i=0; i < elements.length; i++) {

            let label = idToLabel[elements[i].label]
            if (label && !labelToNbr[label.id]) {
                labelToNbr[label.id] = 0
            }
            if (!label && !labelToNbr["No_Label"]) {
                labelToNbr["No_Label"] = 0
            }

            try {
                const response = await fetch(elements[i].file, {
                    headers: {
                        'pragma': 'no-cache',
                        'cache-control': 'no-cache'
                    }
                });

                const blob = await response.blob();

                let extension = elements[i].file.split(".").pop()
                let filename = (label ? label.name + "_" + labelToNbr[label.id] : "no_label_" + labelToNbr["no_label"])

                if (filename.split(".").pop() != extension) {
                    filename += "." + extension
                }

                zip.file(filename, blob);
                labelToNbr[(label ? label.id: "no_label")] += 1
            } catch (e) {
                console.log(e)
                notification("Error: " + e, "failure")
            }
            
            setDownloadingPercentage(Math.round(100 * ((i+1) / NUM_ELEMENTS)))
        }
        setDownloadingPercentage(100)

        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        setTimeout(() => {
            saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

            setDownloadType("files")
            
            afterDownload()
        }, 200)
    }

    async function areaDatasetDownload() {
        const zip = new JSZip();

        setDownloadingPercentage(0)
        setIsDownloading(true)
        let NUM_ELEMENTS = elements.length
        for (let i=0; i < elements.length; i++) {
            const response = await fetch(elements[i].file, {
                headers: {
                    'pragma': 'no-cache',
                    'cache-control': 'no-cache'
                }
            });
            const blob = await response.blob();

            zip.file(elements[i].name, blob);

            setDownloadingPercentage(Math.round(100 * ((i+1) / NUM_ELEMENTS)))
        }
        
        const jsonContent = createJSON();
        const blob = new Blob([jsonContent], { type: 'application/json' });
        zip.file(dataset.name + ".json", blob)

        setDownloadingPercentage(100)
        
        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });

        setTimeout(() => {
            saveAs(zipBlob, dataset.name.replaceAll(" ", "_") + ".zip");

            setDownloadType("area")

            afterDownload()
        }, 200)
    }

    async function textCsvDownload() {
        let csvRows = []
        const headers = ["Labels", "Text"]

        csvRows.push(headers.join(","))

        setDownloadingPercentage(0)
        setIsDownloading(true)

        for (let i=0; i < elements.length; i++) {
            let labelName = (elements[i].label ? idToLabel[elements[i].label].name : "no_label")
            let parsedText = '"' + elements[i].text.replaceAll('"', '""') + '"'
            csvRows.push(labelName + "," + parsedText)

            setDownloadingPercentage(Math.round(100 * ((i+1) / elements.length)))
        }

        let data = csvRows.join("\n")

        const blob = new Blob([data], { type: 'text/csv' });
    
        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);
        
        // Create an anchor tag for downloading
        const a = document.createElement('a');
        
        // Set the URL and download attribute of the anchor tag
        a.href = url;
        a.download = dataset.name + '.csv';
        
        // Trigger the download by clicking the anchor tag
        a.click();

        setTimeout(() => {
            setDownloadType("csv")

            afterDownload()
        }, 200)

        
    }


    // FRONTEND FUNCTIONALITY

    function closePopups(exception) {
        if (exception != "editing-label") {
            setEditingLabel(null)
        }
        if (exception != "create-label") {
            setDisplayCreateLabel(false)
        }
        if (exception != "editing-element") {
            setEditingElement(null)
            setEditingElementIdx(null)
        }
    }


    const elementsHandleDragEnd = (result) => {
        if (!result.destination) return; // Dropped outside
    
        const reorderElements = [...elements];
        const [movedItem] = reorderElements.splice(result.source.index, 1);
        reorderElements.splice(result.destination.index, 0, movedItem);
        
        let currId = elements[elementsIndex].id
        setElements(reorderElements);

        let idToIdx = {}

        for (let i=0; i < reorderElements.length; i++) {
            idToIdx[reorderElements[i].id] = i
            if (reorderElements[i].id == currId) {
                setElementsIndex(i)
            }
        }

        if (isPublic) return;
        
        // For updating the order, so it stays the same after refresh
        const URL = window.location.origin + '/api/reorder-dataset-elements/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": dataset.id,
            "order": idToIdx
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((data) => {

        }).catch((error) => {
            notification("Error: " + error, "failure")
            
        })
    };

    const labelsHandleDragEnd = (result) => {
        if (!result.destination) return; // Dropped outside
    
        const reorderLabels = [...labels];
        const [movedItem] = reorderLabels.splice(result.source.index, 1);
        reorderLabels.splice(result.destination.index, 0, movedItem);
        
        setLabels(reorderLabels);

        if (isPublic) return;
        
        let idToIdx = {}
        for (let i=0; i < reorderLabels.length; i++) {
            idToIdx[reorderLabels[i].id] = i
        }
        
        // For updating the order, so it stays the same after refresh
        const URL = window.location.origin + '/api/reorder-dataset-labels/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "id": dataset.id,
            "order": idToIdx
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        axios.post(URL, data, config)
        .then((data) => {

        }).catch((error) => {
            notification("Error: " + error, "failure")
            
        })
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
          
          if (newWidth < 40) { // Hide toolbar
            setToolbarLeftWidth(15)
          } else {  // Show toolbar
            setToolbarLeftWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
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

    const resizeRightToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startX = e.clientX;
        const startWidth = toolbarRightWidth;

        setCursor("e-resize")
    
        const handleMouseMove = (e) => {
          const newWidth = startWidth - (e.clientX - startX)

          if (newWidth < 40) { // Hide toolbar
            setToolbarRightWidth(15)
          } else {  // Show toolbar
            setToolbarRightWidth(Math.max(135, Math.min(newWidth, 250)));  // Arbitrary max and min width
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

    const resizeMainToolbarHandleMouseDown = (e) => {
        e.preventDefault();
    
        const startY = e.clientY;
        const startHeight = toolbarMainHeight;

        setCursor("n-resize")
    
        const handleMouseMove = (e) => {
          const newHeight = startHeight + (e.clientY - startY)
        
          if (newHeight < 40) { // Hide toolbar
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

    function getDescriptionTableData() {
        let data = [["Owner", dataset.ownername]]
        if (dataset.dataset_type.toLowerCase() == "image" && dataset.imageWidth) data.push(["Image dimensions", "(" + dataset.imageWidth + ", " + dataset.imageHeight + ")"])
        if (dataset.dataset_type.toLowerCase() == "image") data.push(["Type of data", dataset.datatype])
        if (dataset.trained_with && dataset.trained_with.length > 0) {
            data.push(["Trained with by", <div className="trained-on-container">
                {dataset.trained_with.slice(0, 10).map((model, idx) => (
                    <div key={idx} className="trained-on-element" onClick={() => {
                        const URL = window.location.origin + "/models/" + model[0]
                        var win = window.open(URL, '_blank');
                        win.focus();
                    }}>
                        {model[1]}
                        <img className="trained-on-icon" src={BACKEND_URL + "/static/images/external.png"} alt="External" />
                    </div>
                ))}
                {dataset.trained_with.length > 10 && <p>and {dataset.trained_with.length - 10} others</p>}
            </div>])
        }
        return data
    }

    return (<>
        <Helmet>
            <meta
            name="description"
            content={"Explore " + (dataset ? "the " + dataset.name : "this") + " dataset on Dalinar. Ready-to-use data for machine learning projects — view, analyze, and train models without coding."}
            />
        </Helmet>
        <div className="dataset-container" onClick={closePopups} ref={pageRef} style={{cursor: (cursor ? cursor : "")}}>
            <TitleSetter title={"Dalinar " + (dataset ? "- " + dataset.name : "")} />

            {/* Download popup - Classification */}
            {showDownloadPopup && !isDownloaded && dataset && dataset.datatype == "classification" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={false}
            isDownloaded={isDownloaded}
            setIsDownloaded={setIsDownloaded}
            isText={dataset.dataset_type.toLowerCase() == "text"}>
                    <div title="Download .zip file" className="download-element" onClick={labelFoldersDownload}>
                        <p className="download-element-title">Folders for labels {dataset.dataset_type.toLowerCase() == "image" && <span className="download-recommended">(recommended)</span>}</p>
                        <p className="download-element-description">
                            Every label will have its own folder containing the elements with that label.
                        </p>

                        <img className="download-element-image" src={BACKEND_URL + "/static/images/foldersAsLabels.jpg"} alt="Folders as labels" />

                    </div>
                    <div title="Download .zip file" className="download-element" onClick={labelFilenamesDownload}>
                        <p className="download-element-title">Labels as filenames</p>
                        <p className="download-element-description">
                            One big folder, with every element named after its label and number, e.g. label1_1.png, label1_2.png, etc.
                        </p>

                        <img className="download-element-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} alt="Filenames as labels" />


                    </div>
                    {dataset.dataset_type.toLowerCase() == "text" && <div title="Download .csv file" className="download-element" onClick={textCsvDownload}>
                        <p className="download-element-title">.csv file <span className="download-recommended">(recommended)</span></p>
                        <p className="download-element-description">
                            Will download the dataset as a .csv file, with labels in the first column and text in the second.
                        </p>

                        <img className="download-element-image" src={BACKEND_URL + "/static/images/csv.jpg"} alt="csv" />


                    </div>}
                    {isDownloading && <ProgressBar BACKEND_URL={BACKEND_URL} message={"Downloading..."} progress={downloadingPercentage}></ProgressBar>}
            </DownloadPopup>}

            {/* After download popup - Classification */}
            {showDownloadPopup && isDownloaded && dataset && dataset.datatype == "classification" && <DownloadPopup 
            setShowDownloadPopup={setShowDownloadPopup} 
            isArea={dataset && dataset.datatype == "area"}
            isDownloaded={isDownloaded}
            setIsDownloaded={setIsDownloaded}>
                <h1 className="download-successful-title">Download Successful <img className="download-successful-icon" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue checkmark" /></h1>
                {downloadType == "folders" || downloadType =="files" && <p className="download-successful-instructions">See below for an example of how the dataset can be loaded in Python. Note that the downloaded .zip file must be unpacked
                    and that relative paths must be updated. Also note that the instructions provided are for image datasets.
                </p>}
                {downloadType == "csv" && <p className="download-successful-instructions">
                    A code example of how to load the .csv file in Python is found below. Note that pandas must be installed. Libraries such as 'csv' will work just as well.
                </p>}
                
                <div className="download-frameworks-container download-frameworks-instructions">
                    <div onClick={() => setDownloadFramework("tensorflow")} 
                        className="download-framework">
                            <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework == "tensorflow" ? "tensorflow.png" : "tensorflowGray.png")} alt="TensorFlow" />
                            <span className={downloadFramework == "tensorflow" ? "tensorflow" : "download-framework-disabled"}>TensorFlow</span>
                        </div>
                    <div onClick={() => setDownloadFramework("pytorch")} className="download-framework" >
                        <img className="download-framework-icon" src={BACKEND_URL + "/static/images/" + (downloadFramework == "pytorch" ? "pytorch.png": "pytorchGray.png")} alt="Pytorch" />
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

                    <img className="download-element-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} alt="Filenames as labels" />
                
                </div>
            </DownloadPopup>}

            {!isPublic && displayCreateLabel && <CreateLabel 
                setShowCreateLabel={setDisplayCreateLabel}
                createLabelSubmit={createLabelSubmit}
                labelKeybinds={labelKeybinds}
                inputOnFocus={inputOnFocus}
                inputOnBlur={inputOnBlur}
                loadingLabelCreate={loadingLabelCreate}
                getUserPressKeycode={getUserPressKeycode}
                notification={notification}
                BACKEND_URL={BACKEND_URL}></CreateLabel>}

            {!isPublic && editingLabel && <EditLabel 
                setShowEditLabel={setEditingLabel}
                editLabelOnSubmit={editLabelOnSubmit}
                editingLabel={editingLabel}
                labelKeybinds={labelKeybinds}
                inputOnFocus={inputOnFocus}
                inputOnBlur={inputOnBlur}
                loadingLabelEdit={loadingLabelEdit}
                loadingLabelDelete={loadingLabelDelete}
                getUserPressKeycode={getUserPressKeycode}
                notification={notification}
                deleteLabel={deleteLabel}
                BACKEND_URL={BACKEND_URL}></EditLabel>}

            {editingElement && <EditElement 
                setEditingElement={setEditingElement}
                editingElementNameOriginal={elements[editingElementIdx].name}
                updateElement={updateElement}
                loadingElementEdit={loadingElementEdit}
                loadingElementDelete={loadingElementDelete}
                deleteElement={deleteElement}
                inputOnFocus={inputOnFocus}
                inputOnBlur={inputOnBlur}
                BACKEND_URL={BACKEND_URL}>
                
            </EditElement>}
            
            
            {/* Uploading folders / files to elements goes through these */}
            {!isPublic && <input id="dataset-file-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFolderInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>}
            {!isPublic && <input id="dataset-file-upload-inp" type="file" className="hidden" multiple ref={hiddenFileInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>}
            
            <div className="dataset-toolbar-left" style={{width: toolbarLeftWidth + "px"}}>
                <div className={"dataset-elements " + (toolbarLeftWidth == 15 ? "hidden" : "")}>
                    <div className="dataset-elements-scrollable">
                        <p className={"dataset-sidebar-title " + (toolbarLeftWidth < 150 ? "dataset-sidebar-title-small" : "")}>Elements</p>
                        
                        {!isPublic && <div className="dataset-sidebar-button-container">
                            <button type="button" 
                            className={"sidebar-button dataset-upload-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                            onClick={folderInputClick} 
                            title="Upload folder">
                                {toolbarLeftWidth > 170 && <img className="dataset-upload-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />}
                                <span>Upload folder</span>
                            </button>
                            <button type="button" 
                            className={"sidebar-button dataset-upload-button dataset-upload-files-button " + (toolbarLeftWidth < 150 ? "sidebar-button-small" : "")} 
                            onClick={fileInputClick} 
                            title="Upload files">
                                {toolbarLeftWidth > 170 && <img className="dataset-upload-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />}
                                <span>Upload files</span>
                            </button>
                        </div>}
                        
                        <DragDropContext className="dataset-elements-list" onDragEnd={elementsHandleDragEnd}>
                            <Droppable droppableId="elements-droppable">
                            {(provided) => (<div className="dataset-elements-list"
                                {...provided.droppableProps}
                                ref={provided.innerRef}>
                                    {elements.map((element, idx) => (
                                        <Draggable key={element.id} draggableId={"" + element.id} index={idx}>
                                            {(provided) => (<div className="dataset-sidebar-element-outer" ref={idx == elementsIndex ? currentElementRef : null}><div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected " : "") + (toolbarLeftWidth < 150 ? "dataset-sidebar-element-small" : "")} 
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            onClick={() => {
                                                setElementsIndex(idx)
                                            }}
                                            onMouseEnter={(e) => {
                                                setElementLabelTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                                                setHoveredElement(idx)

                                                // Set a timeout to show the preview after 200ms
                                                const timeoutId = setTimeout(() => {
                                                    setShowElementPreview(true);
                                                }, 750);

                                                // Store the timeout ID so it can be cleared later
                                                setShowElementPreviewTimeout(timeoutId);
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredElement(null)

                                                clearTimeout(showElementPreviewTimeout);
    
                                                // Hide the preview immediately
                                                setShowElementPreview(false);
                                            }}
                                            style={{...provided.draggableProps.style}}
                                            ref={provided.innerRef}>

                                                {dataset && dataset.dataset_type.toLowerCase() == "image" && <img className="element-type-img" src={BACKEND_URL + "/static/images/image.png"} alt="Image" />}
                                                {dataset && dataset.dataset_type.toLowerCase() == "text" && <img className="element-type-img" src={BACKEND_URL + "/static/images/text.svg"} alt="Text" />}

                                                <span className="dataset-sidebar-element-name" title={element.name}>{element.name}</span>

                                                {!isPublic && (hoveredElement == idx) && <img title="Edit element" 
                                                    className="dataset-sidebar-options dataset-sidebar-options-margin"
                                                    src={BACKEND_URL + "/static/images/options.png"}
                                                    alt="Edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (editingElement != element.id) {
                                                            setEditingElement(element.id)
                                                            setEditingElementIdx(idx)
                                                            closePopups("editing-element")
                                                        } else {
                                                            setEditingElement(null)
                                                            setEditingElementIdx(null)
                                                        }
                                                        
                                                }}/>}

                                                {dataset && dataset.datatype == "classification" && element.label && idToLabel[element.label] && <span 
                                                    className={"dataset-sidebar-color dataset-sidebar-color-element " + ((!isPublic && hoveredElement == idx) ? "dataset-sidebar-color-margin" : "")} 
                                                    style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                                    > 
                                                </span>}

                                                {dataset && dataset.datatype == "area" && element.areas && element.areas.length > 0 && <img title="Labelled" 
                                                    className={"dataset-sidebar-labeled " + ((hoveredElement == idx && !isPublic) ? "dataset-sidebar-labeled-margin" : "")}
                                                    src={BACKEND_URL + "/static/images/area.svg"} alt="Area" />}
                                                
                                            </div></div>)}
                                        </Draggable>
                                    ))}
                                    
                                    {provided.placeholder} 
                            </div>)}
                            </Droppable>
                        </DragDropContext>
                        
                        {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                    </div>
                    
                    {/* Shows an element's label */}
                    {dataset && showElementPreview && dataset.datatype == "classification" && hoveredElement != null && elements[hoveredElement].label && !editingElement &&
                        <div className="dataset-sidebar-element-label" style={{top: (elementLabelTop + (dataset.dataset_type.toLowerCase() == "image" ? 5 : 0))}}>{idToLabel[elements[hoveredElement].label].name}</div>
                    }

                    {dataset && showElementPreview && hoveredElement != null && dataset.dataset_type.toLowerCase() == "image" && !editingElement &&
                        <img className="dataset-sidebar-element-preview" style={{top: elementLabelTop}} src={elements[hoveredElement].file} alt="Element preview" />
                    }

                </div>

                <div className="dataset-toolbar-resizeable" 
                onMouseDown={resizeLeftToolbarHandleMouseDown}
                style={{width: (toolbarLeftWidth == 15 ? "15px" : "5px")}}>
                    {toolbarLeftWidth == 15 && <img 
                    className="toolbar-main-dropdown" 
                    alt="Dropdown"
                    src={BACKEND_URL + "/static/images/down.svg"} 
                    style={{transform: "rotate(270deg)"}}/>}
                </div>
            </div>

            <div className="dataset-main" style={{width: "calc(100% - " + toolbarLeftWidth + "px - " + toolbarRightWidth + "px)"}}>
                <div className="dataset-main-toolbar-outer" style={{height: toolbarMainHeight + "px"}}>
                    <div className="dataset-main-toolbar" style={{display: (toolbarMainHeight > 25 ? "flex" : "none")}}>
                        {dataset && <div className="dataset-title-container unselectable" onClick={() => {setShowDatasetDescription(!showDatasetDescription)}}>
                            {dataset.dataset_type.toLowerCase() == "image" && <img title="Type: Image" className="dataset-title-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" />}
                            {dataset.dataset_type.toLowerCase() == "text" && <img title="Type: Text" className="dataset-title-icon" src={BACKEND_URL + "/static/images/text.svg"} alt="Text" />}
                            
                            <p className="dataset-title" title={(!showDatasetDescription ? "Show description" : "Hide description")}>{dataset && dataset.name}</p>

                            <img className="dataset-title-expand-icon" src={BACKEND_URL + "/static/images/" + (!showDatasetDescription ? "plus.png" : "minus.png")} alt="Toggle" />
                        </div>}

                        {!isPublic && dataset && <button type="button" title="Edit dataset" className="dataset-title-button" onClick={() => {
                            navigate("/edit-dataset/" + dataset.id + "?expanded=true")
                        }}>
                            <img className="dataset-title-edit-icon" src={BACKEND_URL + "/static/images/edit.png"} alt="Edit" />
                            Edit dataset
                        </button>}

                        {dataset && <button className={"dataset-download-button " + (isPublic && currentProfile ? "no-margin-right" : "")} onClick={() => {
                            setShowDownloadPopup(true)
                        }} title="Download dataset">
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/download.svg"} alt="Download" />
                            Download
                        </button>}

                        {isPublic && dataset && currentProfile && currentProfile.user && !dataset.saved_by.includes(currentProfile.user) && <button className="dataset-save-button" 
                        title="Save dataset" 
                        onClick={() => saveDataset()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/star.svg"} alt="Star" />
                            Save
                        </button>}
                        {isPublic && dataset && currentProfile && currentProfile.user && dataset.saved_by.includes(currentProfile.user) && <button className="dataset-save-button"
                        title="Unsave dataset" 
                        onClick={() => unsaveDataset()}>
                            <img className="dataset-download-icon" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue checkmark" />
                            Saved
                        </button>}

                        {elements && elements[elementsIndex] && dataset && dataset.dataset_type.toLowerCase() == "image" && <form className="resize-form" onSubmit={(e) => {
                            e.preventDefault()
                            if (isPublic) return;
                            if (!dataset.imageHeight && !dataset.imageWidth) {
                                activateConfirmPopup("Are you sure you want to resize this image?", resizeElementImage, "blue")
                            }
                        }}>
                            
                            {(!dataset.imageWidth && !dataset.imageHeight) && <label htmlFor="resize-width" className="resize-label">Width</label>}
                            {(dataset.imageWidth && dataset.imageHeight) && <label className="resize-label">Width</label>}

                            {!isPublic && (!dataset.imageWidth && !dataset.imageHeight) && <input type="number" id="resize-width" className="resize-inp" value={currentImageWidth} min="0" max="1024" onChange={(e) => {
                                setCurrentImageWidth(Math.min(1024, Math.max(0, e.target.value)))
                            }}/>}
                            {(isPublic || (dataset.imageWidth && dataset.imageHeight)) && <div className="resize-inp">
                                {currentImageWidth}
                            </div>}

                            {(!dataset.imageWidth && !dataset.imageHeight) && <label htmlFor="resize-height" className="resize-label resize-label-margin">Height</label>}
                            {(dataset.imageWidth && dataset.imageHeight) && <label className="resize-label resize-label-margin">Height</label>}
                            
                            {!isPublic && (!dataset.imageWidth && !dataset.imageHeight) && <input type="number" id="resize-height" className="resize-inp" value={currentImageHeight} min="0" max="1024" onChange={(e) => {
                                setCurrentImageHeight(Math.min(1024, Math.max(0, e.target.value)))
                            }}/>}
                            {(isPublic || (dataset.imageWidth && dataset.imageHeight)) && <div className="resize-inp">
                                {currentImageHeight}
                            </div>}

                            {!isPublic && (!dataset.imageHeight && !dataset.imageWidth) && <button type="submit" className="resize-apply">
                                {loadingResizeImage && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                                {(!loadingResizeImage ? "Apply" : "")}
                            </button>}
                        </form>}
                        
                        {!isPublic && dataset && dataset.datatype == "classification" && <div title="Will show color of pressed label" 
                        className={"dataset-main-label-clicked " + ((elements && elements[elementsIndex] && dataset && dataset.dataset_type.toLowerCase() == "image") ? "dataset-main-label-clicked-no-margin" : "")}
                        style={{background: datasetMainLabelColor}}></div>}
                    </div>
                    
                    <div className="dataset-main-toolbar-resize" 
                        onMouseDown={resizeMainToolbarHandleMouseDown} 
                        style={{height: (toolbarMainHeight == 15 ? "15px" : "5px")}}
                        >
                        {toolbarMainHeight == 15 && <img className="toolbar-main-dropdown" src={BACKEND_URL + "/static/images/down.svg"} alt="Dropdown" />}
                    </div>
                </div>
                
                <div className="dataset-main-display" ref={datasetMainDisplayRef} style={((dataset && dataset.dataset_type.toLowerCase() == "text" && !showDatasetDescription) ? {overflowY: "scroll"} : {overflowY: "auto"})}>
                    {!isPublic && (elements.length == 0 && !loading && !uploadLoading) && <button type="button" className="dataset-upload-button" onClick={folderInputClick}>
                        <img className="dataset-upload-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                        Upload folder
                    </button>}
                    {uploadLoading && <ProgressBar BACKEND_URL={BACKEND_URL} message={"Uploading..."} progress={uploadPercentage}></ProgressBar>}
                    {elements.length != 0 && !showDatasetDescription && <div className="dataset-element-view-container">
                        {getPreviewElement(elements[elementsIndex])}
                    </div>}

                    {showDatasetDescription && dataset &&<div className="dataset-description-display-container" ref={descriptionContainerRef}>

                        <div className="dataset-description-image-container" style={{width: "calc(100% - " + descriptionWidth + "%)"}}>
                            <img className="dataset-description-image" src={dataset.image} alt="Dataset image" />
                        </div>

                        <div className="dataset-description-resize" onMouseDown={resizeDescriptionHandleMouseDown}></div>

                        <div className="dataset-description-display" style={{width: "calc(" + descriptionWidth + "%" + " - 5px)"}}>
                            <div className="dataset-description-header" title={dataset.name}>
                                {dataset.name}
                            </div>

                            <div className="dataset-description-stats">
                                {dataset.downloaders && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/download.svg"} alt="Download" />
                                    {dataset.downloaders.length + (dataset.downloaders.length == 1 ? " download" : " downloads")}
                                </div>}

                                {elements && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/classification.png"} alt="Classification" />
                                    {elements.length + (elements.length == 1 ? " element" : " elements")}
                                </div>}

                                {labels && <div className="dataset-description-stats-element">
                                    <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/label.png"} alt="Label" />
                                    {labels.length + (labels.length == 1 ? " label" : " labels")}
                                </div>}
                            </div>

                            <DescriptionTable data={getDescriptionTableData()} />

                            <p className="dataset-description-text dataset-description-description dataset-description-text-margin">{(dataset.description || "This dataset does not have a description.")}</p>

                            {dataset.keywords && dataset.keywords.length > 0 && <div className="dataset-description-keywords">
                                {dataset.keywords.length > 0 && <span className="gray-text dataset-description-keywords-title">Keywords: </span>}
                                {dataset.keywords.map((e, i) => (
                                    <div title={e} className="dataset-description-keyword" key={i}>{e}</div>
                                ))}
                            </div>}

                            <button 
                            className="hide-description-button"
                            style={{marginTop: (dataset.keywords && dataset.keywords.length ? "0" : "auto")}}
                            onClick={() => {setShowDatasetDescription(false)}}>
                                <img className="dataset-description-stats-icon" src={BACKEND_URL + "/static/images/minus.png"} alt="Minus" />
                                Hide description
                            </button>
                        </div>

                    </div>}
                </div>
                
            </div>

            <div className="dataset-toolbar-right" style={{width: toolbarRightWidth + "px"}}>
                <div className="dataset-toolbar-resizeable" 
                onMouseDown={resizeRightToolbarHandleMouseDown}
                style={{width: (toolbarRightWidth == 15 ? "15px" : "5px")}}>
                    {toolbarRightWidth == 15 && <img 
                    className="toolbar-main-dropdown" 
                    src={BACKEND_URL + "/static/images/down.svg"} 
                    alt="Dropdown"
                    style={{transform: "rotate(90deg)"}}/>}
                </div>
                <div className={"dataset-labels " + (toolbarRightWidth == 15 ? "hidden" : "")}>
                    <div className={"dataset-labels-scrollable " + (dataset && dataset.datatype=="area" ? "dataset-labels-nonscrollable" : "")}>
                        <p className={"dataset-sidebar-title " + (toolbarRightWidth < 150 ? "dataset-sidebar-title-small" : "")}>Labels</p>
                        {!isPublic && <div className="dataset-sidebar-button-container">
                            <button type="button" 
                            className={"sidebar-button " + (toolbarRightWidth < 150 ? "sidebar-button-small" : "")}
                            onClick={(e) => {
                                e.stopPropagation()
                                closePopups("create-label")
                                setDisplayCreateLabel(!displayCreateLabel)
                            }}>
                                {(toolbarRightWidth >= 150 ? "+ " : "") + "Add label"}
                            </button>
                            
                        </div>}
                        {!isPublic && dataset && dataset.datatype=="classification" && <div className="dataset-sidebar-element" onClick={removeCurrentElementLabel}>
                            <img className="dataset-sidebar-icon" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" />
                            Clear label
                        </div>}
                        <DragDropContext className="dataset-labels-list" onDragEnd={labelsHandleDragEnd}>
                            <div className={"dataset-labels-container " + ((dataset && dataset.datatype == "area") ? "dataset-labels-container-area" : "")}>
                                <Droppable droppableId="labels-droppable" className="dataset-labels-container-inner">
                                {(provided) => (<div className="dataset-labels-container-inner"
                                {...provided.droppableProps}
                                ref={provided.innerRef}>
                                    {labels.map((label, idx) => (
                                        <Draggable key={label.id} draggableId={"" + label.id} index={idx}>
                                            {(provided) => (<div className={"dataset-sidebar-element " + (dataset.datatype == "area" && labelSelected == label.id ? "dataset-sidebar-element-selected " : "") + (toolbarRightWidth < 150 ? "dataset-sidebar-element-small" : "")} 
                                            key={label.id} onClick={() => labelOnClick(label)}
                                            onMouseEnter={() => {
                                                if (isPublic) return
                                                setHoveredLabel(idx)
                                            }}
                                            onMouseLeave={() => {
                                                if (isPublic) return
                                                setHoveredLabel(null)
                                            }}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{...provided.draggableProps.style}}
                                            ref={provided.innerRef}>
                                                <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                                                <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                                                
                                                {!isPublic && hoveredLabel == idx && <img alt="Edit" title="Edit label" 
                                                    className={"dataset-sidebar-options " + (!label.keybind ? "dataset-sidebar-options-margin" : "") }
                                                    src={BACKEND_URL + "/static/images/options.png"}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        closePopups("editing-label")
                                                        if (editingLabel == label.id) {
                                                            setEditingLabel(null)
                                                        } else {
                                                            setEditingLabel(label)
                                                        }

                                                    }}/>}
                                                
                                                {!isPublic && label.keybind && <span title={"Keybind: " + label.keybind.toUpperCase()} 
                                                    className={"dataset-sidebar-label-keybind " + (hoveredLabel == idx ? "dataset-sidebar-label-keybind-margin " : "") + (toolbarRightWidth < 150 ? "dataset-sidebar-label-keybind-small" : "")}>
                                                        {label.keybind.toUpperCase()}
                                                </span>}
                                            </div>)}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder} 
                                </div>)}
                                </Droppable>
                            </div>
                        </DragDropContext>  

                        {dataset && dataset.datatype == "area" && elements.length > 0 && <div className="dataset-areas-container">
                            {elements[elementsIndex].areas.map((area, areaIdx) => (
                                <div className={"dataset-sidebar-element-area " + (selectedAreaIdx == areaIdx ? "dataset-sidebar-element-selected " : "") + + (toolbarRightWidth < 150 ? "dataset-sidebar-element-small" : "")} 
                                    title={"Area: " + idToLabel[area.label].name + " (" + (areaIdx + 1) + ")"}
                                    onMouseEnter={(e) => setHoveredAreaId(area.id)}
                                    onMouseLeave={(e) => setHoveredAreaId(null)}
                                    key={areaIdx}
                                    onClick={() => {
                                        if (isPublic) return;
                                        if (areaIdx === null || areaIdx != selectedAreaIdx) {
                                            setLabelSelected(null)
                                            setPointSelected([-1,-1])
                                            setSelectedArea(area)
                                            setSelectedAreaIdx(areaIdx)
                                        } else {
                                            setSelectedArea(null)
                                            setSelectedAreaIdx(null)
                                        }
                                        
                                    }}>
                                        <img className="dataset-element-area-icon" alt="Area" src={BACKEND_URL + "/static/images/area.svg"} />
                                        <span className="dataset-area-name">{idToLabel[area.label].name} <span className="gray-text">({areaIdx + 1})</span></span>
                                        <span title={"Points: " + JSON.parse(area.area_points).length} 
                                        className={"dataset-sidebar-label-keybind no-box-shadow border " + (toolbarRightWidth < 150 ? "dataset-sidebar-label-keybind-small" : "")}
                                        style={{borderColor: (idToLabel[area.label].color)}}>{JSON.parse(area.area_points).length}</span>
                                        {!isPublic && <img title="Delete area" 
                                        alt="Cross"
                                        className="dataset-sidebar-options dataset-delete-area" 
                                        style={{marginLeft: "5px"}}
                                        src={BACKEND_URL + "/static/images/cross.svg"} onClick={(e) => {
                                            deleteArea(area, elementsIndex, areaIdx)
                                        }}/>}
                                </div>
                            ))}
                        </div>}
                    </div>

                </div>
            </div>
        </div>
    </>)

    
}

export default Dataset