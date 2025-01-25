import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../components/DownloadPopup"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function Dataset({currentProfile, activateConfirmPopup}) {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])    // Label points to label id
    const [labels, setLabels] = useState([])
    
    const [currentText, setCurrentText] = useState("") // Used to display text files

    const [elementsIndex, setElementsIndex] = useState(0)

    const [loading, setLoading] = useState(true)

    const [elementLabelTop, setElementLabelTop] = useState(0)
    const [editExpandedTop, setEditExpandedTop] = useState(0)
    
    const [displayCreateLabel, setDisplayCreateLabel] = useState(false)
    const [createLabelName, setCreateLabelName] = useState("")
    const [createLabelColor, setCreateLabelColor] = useState("#07E5E9")
    const [createLabelKeybind, setCreateLabelKeybind] = useState("")
    
    const [labelKeybinds, setLabelKeybinds] = useState({})  // Key: keybind, value: pointer to label
    const [idToLabel, setIdToLabel] = useState({})  // Key: id, value: label

    const [hoveredElement, setHoveredElement] = useState(null)
    const [datasetMainLabelColor, setDatasetMainLabelColor] = useState("transparent") // Used to load image in low res first

    const [editingLabel, setEditingLabel] = useState(null) // Either null or pointer to label
    const [editingLabelName, setEditingLabelName] = useState("")
    const [editingLabelColor, setEditingLabelColor] = useState("")
    const [editingLabelKeybind, setEditingLabelKeybind] = useState("")

    const [editingElement, setEditingElement] = useState(null)
    const [editingElementName, setEditingElementName] = useState("")
    const [editingElementIdx, setEditingElementIdx] = useState(null)

    const [showDownloadPopup, setShowDownloadPopup] = useState(false)

    const [showDatasetDescription, setShowDatasetDescription] = useState(false)

    const hiddenFolderInputRef = useRef(null);
    const hiddenFileInputRef = useRef(null);

    const pageRef = useRef(null)

    const [inputFocused, setInputFocused] = useState(false);  // Don't use keybinds if input is focused


    // AREA DATASET FUNCTIONALITY
    const [labelSelected, setLabelSelected] = useState(null)
    const [updateArea, setUpdateArea] = useState(false)
    const [hoveredAreaId, setHoveredAreaId] = useState(null)

    const [pointSelected, setPointSelected] = useState([-1,-1]) // ID of area, idx of point
    const [pointSelectedCoords, setPointSelectedCoords] = useState([0,0])   // x,y of selected point (%)
    const [selectedArea, setSelectedArea] = useState(null) // the area
    const [selectedAreaIdx, setSelectedAreaIdx] = useState(null)

    const canvasRefs = useRef([])
    const elementRef = useRef(null)

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
    }, [elements, elementsIndex, canvasRefs, updateArea, labels]);   // When element areas update


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


        const data = {
            "area": area.id,
            "area_points": JSON.stringify(updatedPoints)
        }

        axios.post(URL, data, config)
        .then((res) => {
            console.log(res)
            let temp = [...elements]
            if (res.data.deleted == false) {
                temp[elementsIndex].areas[selectedAreaIdx].area_points = JSON.stringify(updatedPoints)
            } else {
                temp[elementsIndex].areas.splice(selectedAreaIdx, 1)
            }
            
            setElements(temp)
            
        })
        .catch((err) => {
            alert(err)
            console.log(err)
        }).finally(() => {
            setPointSelected([-1,-1])
        })
    }


    function pointOnDrag(e) {
        if (pointSelected[0] == -1 || pointSelected[1] == -1) {return}
        const imageElement = elementRef.current;
        const boundingRect = imageElement.getBoundingClientRect();

        const clickX = Math.max(0, e.clientX - boundingRect.left - (DOT_SIZE / 2)); // X coordinate relative to image, the offset depends on size of dot
        const clickY = Math.max(0, e.clientY - boundingRect.top - (DOT_SIZE / 2));  // Y coordinate relative to image

        const newX = Math.round((clickX / boundingRect.width) * 100 * 10) / 10   // Round to 1 decimal
        const newY = Math.round((clickY / boundingRect.height) * 100 * 10) / 10

        setPointSelectedCoords([newX, newY])

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
                            left: 0, position: "absolute", 
                            display: (pointSelected[0] == area.id ? "none" : "block")}}></canvas>
            {points.map((point, idx) => (
                <div title="Click to drag" 
                    className={"dataset-element-view-point " + ((pointSelected[0] == area.id && pointSelected[1] == idx) ? "dataset-element-view-point-selected" : "")} 
                    key={idx} 
                    style={{top: ((pointSelected[0] == area.id && pointSelected[1] == idx) ? pointSelectedCoords[1] : point[1]) + "%", 
                            left: ((pointSelected[0] == area.id && pointSelected[1] == idx) ? pointSelectedCoords[0] : point[0]) + "%", 
                            "background": (idToLabel[area.label].color)}} 
                    onClick={(e) => {
                        if (pointSelected[0] != area.id || pointSelected[1] != idx) {
                            setPointSelectedCoords([point[0], point[1]])
                            setSelectedAreaIdx(areaIdx)
                            setSelectedArea(area)
                            setPointSelected([area.id, idx])
                        } else {
                            updatePoints(area, pointSelectedCoords, idx)
                        }
                    }}
                    
                >
                    {idx == 0 && <div 
                    title={idToLabel[area.label].name} 
                    className="dataset-element-view-point-label"
                    style={{background: idToLabel[area.label].color, 
                            color: getTextColor(idToLabel[area.label].color),
                            display: ((pointSelected[0] == area.id && pointSelected[1] == 0) ? "none" : "block")}}
                    onClick={(e) => e.stopPropagation()}>
                        {idToLabel[area.label].name}
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
    const handleImageClick = (event) => {
        const imageElement = elementRef.current;

        console.log("CLICKED: " + selectedAreaIdx)

        if (imageElement && ((selectedAreaIdx !== null) || labelSelected)) {    // Only update point if a label is selected
            
            let areas = elements[elementsIndex].areas

            const boundingRect = imageElement.getBoundingClientRect();
            const clickX = Math.max(0, event.clientX - boundingRect.left - (DOT_SIZE / 2)); // X coordinate relative to image, the offset depends on size of dot
            const clickY = Math.max(0, event.clientY - boundingRect.top - (DOT_SIZE / 2));  // Y coordinate relative to image

            const clickXPercent = Math.round((clickX / boundingRect.width) * 100 * 10) / 10   // Round to 1 decimal
            const clickYPercent = Math.round((clickY / boundingRect.height) * 100 * 10) / 10

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
        
                axios.post(URL, data, config)
                .then((res) => {
                    let temp = [...elements]
                    temp[elementsIndex].areas.push(res.data)

                    setLabelSelected(null)
                    setSelectedAreaIdx(temp[elementsIndex].areas.length - 1)
                    setSelectedArea(res.data)

                    setElements(temp)
                    
                })
                .catch((err) => {
                    alert(err)
                    console.log(err)
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
        
                axios.post(URL, data, config)
                .then((res) => {
                    let temp = [...elements]
                    temp[elementsIndex].areas[selectedAreaIdx].area_points = JSON.stringify(updatedPoints)
                    setElements(temp)
                    
                })
                .catch((err) => {
                    alert(err)
                    console.log(err)
                })
            }
            
        }
    };

    function deleteArea(area, elementIdx, areaIdx) {

        console.log("elementIdx: " + elementIdx)
        console.log("areaIdx: " + areaIdx)
        
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
            
        })
        .catch((err) => {
            alert(err)
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
    }, [elementsIndex])

    useEffect(() => {
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

    // Handles user button presses
    useEffect(() => {
        const handleKeyDown = (event) => {

            if (loading || inputFocused) {return};  

            let key = getUserPressKeycode(event)
            
            if (key === "ArrowDown" || key === "ArrowRight") {    
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
            } else if (key === "ArrowUp" || key === "ArrowLeft") {
                setElementsIndex(Math.max(elementsIndex - 1, 0))  
            } else if (labelKeybinds[key]) {
                labelOnClick(labelKeybinds[key])
            } else if (key === "Backspace" || key === "Delete") {  // For datatype area, deleting points
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
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + id,
        })
        .then((res) => {
            setDataset(res.data)

            setElements(res.data.elements)

            setLabels(res.data.labels)

            // Update keybinds
            parseLabels(res.data.labels)

            // preloadImages(res.data.elements)
        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)

            // preloadImages(res.data.elements)
        }).finally(() => {
            setLoading(false)
        })
    }

    const preloadImage = (src) => {
        console.log(src)
        const img = new Image();
        img.src = src;
    };

    function preloadImages(elements) {
        for (let i=0; i < elements.length; i++) {
            let extension = elements[i].file.split(".").pop()
            if (IMAGE_FILE_EXTENSIONS.has(extension)) {
                preloadImage(elements[i].file)
            }
        }
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
                    <div className="dataset-element-view-image-wrapper" onMouseMove={(e) => pointOnDrag(e)}>
                        <img onLoad={() => setUpdateArea(!updateArea)} ref={elementRef} className="dataset-element-view-image" src={window.location.origin + element.file} onClick={handleImageClick}/>
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


    function elementFilesUploaded(e) {
        let files = e.target.files

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let errorMessages = ""
        let totalSize = 0
        
        let AXIOS_OUTSTANDING = files.length
        for (let i=0; i < files.length; i++) {
            let file = files[i]
            
            totalSize += file.size

            if (totalSize > 10 * 10**9) {
                if (errorMessages) {errorMessages += "\n\n"}
                errorMessages += "Stopped uploading after " + file.name + " as only 1 Gigabyte can be uploaded at a time."
                alert(errorMessages)
                getDataset()
                return
            }

            let extension = file.name.split(".").pop()
            if (!IMAGE_FILE_EXTENSIONS.has(extension) && !TEXT_FILE_EXTENSIONS.has(extension)) {
                if (errorMessages) {errorMessages += "\n\n"}
                errorMessages += "Did not upload file with extension " + extension + " as this filetype is not supported."

                if (i == files.length - 1) {
                    alert(errorMessages)
                    getDataset()
                    break
                } else {
                    continue
                }

            }

            let formData = new FormData()

            formData.append('file', file)
            formData.append('dataset', dataset.id)

            const URL = window.location.origin + '/api/create-element/'
            const config = {headers: {'Content-Type': 'multipart/form-data'}}

            axios.post(URL, formData, config)
            .then((data) => {
                console.log("Success: ", data)
            }).catch((error) => {
                if (errorMessages) {errorMessages += "\n\n"}
                errorMessages += "Did not upload file with extension ." + extension + " as this filetype is not supported."
                console.log("Error: ", error)
            }).finally(() => {
                AXIOS_OUTSTANDING -= 1
                if (AXIOS_OUTSTANDING == 0) {
                    getDataset()
                    if (errorMessages) {
                        alert(errorMessages)
                    }
                }
            })
        }

    }


    function updateElement(e) {
        e.preventDefault()
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/edit-element/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "name": editingElementName,
            "id": editingElement
        }

        setLoading(true)

        axios.post(URL, data, config)
        .then((res) => {
            if (res.data) {
                elements[editingElementIdx] = res.data
            }
            console.log("COMPLETE")
            setEditingElementIdx(null)
            setEditingElement(null)
            setLoading(false)

        })
        .catch((err) => {
            alert(err)
            console.log(err)
        })
    }

    function deleteElement(e) {
        e.preventDefault()

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "element": editingElement
        }

        const URL = window.location.origin + '/api/delete-element/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setLoading(true)
        axios.post(URL, data, config)
        .then((data) => {
            console.log("Success: ", data)

            if (elementsIndex != 0) {
                setElementsIndex(elementsIndex - 1)
            }
            
            getDataset()

            setEditingElement(null)

        }).catch((error) => {
            alert("Error: ", error)

        }).finally(() => {
            setLoading(false)
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
            setLabels(res.data)

            parseLabels(res.data)

            setLoading(false)
        }).catch((err) => {
            alert("An error occured when loading labels for dataset with id " + id + ".")
            console.log(err)
            setLoading(false)
        })
    }


    const INVALID_KEYBINDS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace", "Delete"])

    const handleKeyDown = (event, type="creating-label") => {
        event.preventDefault(); // Prevent default behavior
    
        if (INVALID_KEYBINDS.has(event.key)) {
            return;
        }
    
        if (type == "creating-label") {
            setCreateLabelKeybind(getUserPressKeycode(event));
        } else if (type == "editing-label") {
            setEditingLabelKeybind(getUserPressKeycode(event));
        }
        
    };

    
    function createLabelSubmit(e) {
        e.preventDefault()

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', createLabelName)
        formData.append('color', createLabelColor)
        formData.append('keybind', createLabelKeybind)
        formData.append('dataset', dataset.id)

        const URL = window.location.origin + '/api/create-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success: ", data)
            setCreateLabelName("")
            setCreateLabelColor("#07E5E9")
            setCreateLabelKeybind("")
            
            getLabels()
            setDisplayCreateLabel(false)

        }).catch((error) => {
            alert("Error: ", error)
        })

    }


    function labelOnClick(label) {
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
                setLoading(false)
            })
            .catch((err) => {
                alert(err)
                console.log(err)
            })
        } else if (dataset.datatype == "area") {
            if (labelSelected != label.id) {
                setSelectedAreaIdx(null)
                setSelectedArea(null)
                setLabelSelected(label.id)
            } else {
                setLabelSelected(null)
            }
            
        }
        
    }

    function removeCurrentElementLabel() {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';

        const URL = window.location.origin + '/api/remove-element-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "id": elements[elementsIndex].id
        }

        axios.post(URL, data, config)
        .then((res) => {

            let tempElements = [...elements]
            tempElements[elementsIndex].label = null

            setElements(tempElements)
        })
        .catch((err) => {
            alert(err)
            console.log(err)
        })
    }

    function editLabelOnSubmit(e) {
        e.preventDefault()

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "label": editingLabel,
            "name": editingLabelName,
            "color": editingLabelColor,
            "keybind": editingLabelKeybind
        }

        const URL = window.location.origin + '/api/edit-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setLoading(true)
        axios.post(URL, data, config)
        .then((data) => {
            console.log("Success: ", data)
            
            getLabels()

            setEditingLabel(null)

        }).catch((error) => {
            alert("Error: ", error)

        }).finally(() => {
            setLoading(false)
        })
    }


    function deleteLabelInner() {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "label": editingLabel
        }

        const URL = window.location.origin + '/api/delete-label/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setLoading(true)
        axios.post(URL, data, config)
        .then((data) => {
            
            getLabels()

            setEditingLabel(null)

        }).catch((error) => {
            alert("Error: ", error)

        }).finally(() => {
            setLoading(false)
        })
    }

    function deleteLabel(e) {
        e.preventDefault()

        activateConfirmPopup("Are you sure you want to delete this label? This action cannot be undone.", deleteLabelInner)
    }


    // DOWNLOAD FUNCTIONALITY

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
            console.log("Error:" + error)
        })
        
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
            console.log("Error:" + error)
        })
        
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
        saveAs(zipBlob, dataset.name + ".zip");

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
            console.log("Error:" + error)
        })
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

    return (
        <div className="dataset-container" onClick={closePopups} ref={pageRef}>

            {showDownloadPopup && dataset && dataset.datatype == "classification" && <DownloadPopup setShowDownloadPopup={setShowDownloadPopup} isArea={dataset && dataset.datatype == "area"}>
                    <div title="Download .zip file" className="download-element" onClick={labelFoldersDownload}>
                        <p className="download-element-title">Folders for labels</p>
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

            {showDownloadPopup && dataset && dataset.datatype == "area" && <DownloadPopup setShowDownloadPopup={setShowDownloadPopup} isArea={dataset && dataset.datatype == "area"}><div title="Download .zip file" className="download-element download-element-area" onClick={areaDatasetDownload}>
                    <p className="download-element-title">Download Dataset</p>
                    <p className="download-element-description">
                        Will download as one big folder, with elements retaining their original filenames. A .json file ({dataset.name}.json) will contain the areas of each element.
                    </p>

                    <img className="download-element-image" src={window.location.origin + "/static/images/filenamesAsLabels.jpg"} />
                
                </div>
            </DownloadPopup>}
            
            
            {/* Uploading folders / files to elements goes through these */}
            <input id="dataset-file-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFolderInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>
            <input id="dataset-file-upload-inp" type="file" className="hidden" multiple ref={hiddenFileInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>
            
            <div className="dataset-elements">
                <div className="dataset-elements-scrollable">
                    <p className="dataset-sidebar-title">Elements</p>
                    <div className="dataset-sidebar-button-container">
                        <button className="sidebar-button dataset-download-button" onClick={() => setShowDownloadPopup(true)}><img className="dataset-download-icon" src={window.location.origin + "/static/images/download.svg"}/>Download</button>
                    </div>
                    
                    <div className="dataset-sidebar-button-container">
                        <button type="button" className="sidebar-button" onClick={folderInputClick}>+ Upload folder</button>
                        <button type="button" className="sidebar-button dataset-upload-button dataset-upload-files-button" onClick={fileInputClick}>+ Upload files</button>
                    </div>
                    
                    {dataset && dataset.datatype == "classification" && elements.map((element, idx) => (
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

                            {element.label && idToLabel[element.label] && <span className="dataset-sidebar-color dataset-sidebar-color-element" 
                                                            style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                                        >
                            </span>}

                            {(hoveredElement == idx || editingElement == element.id) && <img title="Edit element" 
                                className="dataset-sidebar-options dataset-sidebar-options-margin"
                                src={window.location.origin + "/static/images/options.png"}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingElementName(element.name)
                                    if (editingElement != element.id) {
                                        setEditExpandedTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                                        setEditingElement(element.id)
                                        setEditingElementIdx(idx)
                                        closePopups("editing-element")
                                    } else {
                                        setEditingElement(null)
                                        setEditingElementIdx(null)
                                    }
                                    
                            }}/>}
                            
                        </div>
                    ))}
                    {dataset && dataset.datatype == "area" && elements.map((element, idx) => (
                        <div className="dataset-sidebar-element-container" key={element.id} >
                            <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
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

                                {(hoveredElement == idx || editingElement == element.id) && <img title="Edit element" 
                                    className="dataset-sidebar-options dataset-sidebar-options-margin"
                                    src={window.location.origin + "/static/images/options.png"}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingElementName(element.name)
                                        if (editingElement != element.id) {
                                            setEditExpandedTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                                            setEditingElement(element.id)
                                            setEditingElementIdx(idx)
                                            closePopups("editing-element")
                                        } else {
                                            setEditingElement(null)
                                            setEditingElementIdx(null)
                                        }
                                        
                                }}/>}
                            </div>

                        </div>
                    ))}
                    {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                </div>
                
                {/* Shows an element's label */}
                {dataset && dataset.datatype == "classification" && hoveredElement != null && elements[hoveredElement].label && !editingElement &&
                    <div className="dataset-sidebar-element-label" style={{top: elementLabelTop}}>{idToLabel[elements[hoveredElement].label].name}</div>
                }

                {/* Editing element */}
                {editingElement && <div className="dataset-element-expanded" style={{top: Math.min(editExpandedTop, pageRef.current.getBoundingClientRect().height - 275 + TOOLBAR_HEIGHT)}} onClick={(e) => {e.stopPropagation()}}>
                    <form className="dataset-edit-element-form" onSubmit={updateElement}>
                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="element-name-inp">Name</label>
                            <input id="element-name-inp" className="dataset-create-label-inp" type="text" value={editingElementName} onChange={(e) => {
                                setEditingElementName(e.target.value)
                            }} onClick={(e) => {
                                e.stopPropagation()
                            }} onFocus={inputOnFocus} onBlur={() => {
                                inputOnBlur()
                            }}></input>
                        </div>

                        <button type="submit" className="edit-element-submit">Apply</button>
                        <button type="button" className="edit-element-submit edit-element-delete" onClick={deleteElement}>Delete</button>
                    </form>       
                </div>}

            </div>

            <div className="dataset-main">
                <div className="dataset-main-toolbar">
                    {dataset && <div className="dataset-title-container unselectable" onClick={() => {setShowDatasetDescription(!showDatasetDescription)}}>
                        {dataset.datatype == "classification" && <img title="Type: Classification" className="dataset-title-icon" src={window.location.origin + "/static/images/classification.png"}/>}
                        {dataset.datatype == "area" && <img title="Type: Area" className="dataset-title-icon" src={window.location.origin + "/static/images/area.svg"}/>}
                        
                        <p className="dataset-title" title={(!showDatasetDescription ? "Show description" : "Hide description")}>{dataset && dataset.name}</p>

                        <img className="dataset-title-expand-icon" src={window.location.origin + "/static/images/" + (!showDatasetDescription ? "plus.png" : "minus.png")} />
                    </div>}

                    {dataset && <button type="button" className="dataset-title-button" onClick={() => {
                        navigate("/edit-dataset/" + dataset.id)
                    }}>
                        <img className="dataset-title-edit-icon" src={window.location.origin + "/static/images/edit.png"}/>
                        Edit dataset
                    </button>}
                    
                    <div title="Will show color of pressed label" className="dataset-main-label-clicked" style={{background: datasetMainLabelColor}}></div>
                </div>
                
                <div className="dataset-main-display">
                    {(elements.length == 0 && !loading) && <button type="button" className="dataset-upload-button" onClick={folderInputClick}>Upload folder</button>}
                    {elements.length != 0 && !showDatasetDescription && <div className="dataset-element-view-container">
                        {getPreviewElement(elements[elementsIndex])}
                    </div>}

                    {showDatasetDescription && dataset.description && <div className="dataset-description-display-container">

                        <div className="dataset-description-image-container">
                            <div className="dataset-description-name">{dataset.name}</div>
                            <img className="dataset-description-image" src={dataset.image} />

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
                        </div>

                        <div className="dataset-description-display">
                            {(dataset.description ? dataset.description : "This dataset does not have a description.")}
                        </div>

                        {dataset.keywords && dataset.keywords.length > 0 && <div className="dataset-description-keywords">
                            {JSON.parse(dataset.keywords).length > 0 && <span className="gray-text dataset-description-keywords-title">Keywords: </span>}
                            {JSON.parse(dataset.keywords).map((e, i) => (
                                <div title={e} className="dataset-description-keyword" key={i}>{e}</div>
                        ))}
                        </div>}
                    </div>}
                </div>
                
            </div>

            <div className="dataset-labels">
                <div className="dataset-labels-scrollable">
                    <p className="dataset-sidebar-title">Labels</p>
                    <div className="dataset-sidebar-button-container">
                        <button type="button" className="sidebar-button" onClick={(e) => {
                            e.stopPropagation()
                            closePopups("create-label")
                            setEditExpandedTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                            setDisplayCreateLabel(!displayCreateLabel)
                        }}>
                            {(displayCreateLabel ? "- Hide form" : "+ Add label")}
                        </button>
                        
                    </div>
                    {dataset && dataset.datatype=="classification" && <div className="dataset-sidebar-element" onClick={removeCurrentElementLabel}>
                        <img className="dataset-sidebar-icon" src={window.location.origin + "/static/images/cross.svg"}/>
                        Clear label
                    </div>}
                    <div className={"dataset-labels-container " + ((dataset && dataset.datatype == "area") ? "dataset-labels-container-area" : "")}>
                        {labels.map((label) => (
                            <div className={"dataset-sidebar-element " + (dataset.datatype == "area" && labelSelected == label.id ? "dataset-sidebar-element-selected" : "")} key={label.id} onClick={() => labelOnClick(label)}>
                                <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                                <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                                {label.keybind && <span title={"Keybind: " + label.keybind.toUpperCase()} className="dataset-sidebar-label-keybind">{label.keybind.toUpperCase()}</span>}
                                <img title="Edit label" 
                                    className={"dataset-sidebar-options " + (!label.keybind ? "dataset-sidebar-options-margin" : "") }
                                    src={window.location.origin + "/static/images/options.png"}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        closePopups("editing-label")
                                        if (editingLabel == label.id) {
                                            setEditingLabel(null)
                                        } else {
                                            setEditExpandedTop(e.target.getBoundingClientRect().y - TOOLBAR_HEIGHT)
                                            setEditingLabelName(label.name)
                                            setEditingLabelColor(label.color)
                                            setEditingLabelKeybind(label.keybind)
                                            setEditingLabel(label.id)
                                        }

                                    }}/>
                                
                            </div>
                        ))}
                    </div>

                    {dataset && dataset.datatype == "area" && elements.length > 0 && <div className="dataset-areas-container">
                        {elements[elementsIndex].areas.map((area, areaIdx) => (
                            <div className={"dataset-sidebar-element-area " + (selectedAreaIdx == areaIdx ? "dataset-sidebar-element-selected" : "")} 
                                title={"Area: " + idToLabel[area.label].name}
                                onMouseEnter={(e) => setHoveredAreaId(area.id)}
                                onMouseLeave={(e) => setHoveredAreaId(null)}
                                key={areaIdx}
                                onClick={() => {
                                    if (areaIdx === null || areaIdx != selectedAreaIdx) {
                                        setLabelSelected(null)
                                        setSelectedArea(area)
                                        setSelectedAreaIdx(areaIdx)
                                    } else {
                                        setSelectedArea(null)
                                        setSelectedAreaIdx(null)
                                    }
                                    
                                }}>
                                    <img className="dataset-element-area-icon" src={window.location.origin + "/static/images/area.svg"} />
                                    <span className="dataset-area-name">{idToLabel[area.label].name}</span>
                                    <span title={"Points: " + JSON.parse(area.area_points).length} 
                                    className="dataset-sidebar-label-keybind no-box-shadow border"
                                    style={{borderColor: (idToLabel[area.label].color)}}>{JSON.parse(area.area_points).length}</span>
                                    <img title="Delete area" className="dataset-sidebar-options dataset-delete-area" src={window.location.origin + "/static/images/cross.svg"} onClick={(e) => {
                                        deleteArea(area, elementsIndex, areaIdx)
                                    }}/>
                            </div>
                        ))}
                    </div>}
                </div>

                <div className="dataset-create-label-container" 
                    style={{display: (displayCreateLabel ? "flex" : "none"), top: editExpandedTop}}
                    onClick={(e) => e.stopPropagation()}>
                    <form className="dataset-create-label-form" onSubmit={createLabelSubmit}>
                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="label-create-name-inp">Name</label>
                            <input id="label-create-name-inp" className="dataset-create-label-inp" type="text"
                                placeholder="Name" value={createLabelName} onChange={(e) => {
                                setCreateLabelName(e.target.value)
                            }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                        </div>
                        
                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="label-create-color-inp">Color</label>
                            <div className="create-label-color-container" style={{background: createLabelColor}}>
                                <input id="label-create-color-inp" className="dataset-create-label-color" type="color" value={createLabelColor} onChange={(e) => {
                                    setCreateLabelColor(e.target.value)
                                }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                            </div>
                        </div>

                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="label-create-keybinding">Keybind</label>
                            <input
                                id="label-create-keybinding"
                                className="dataset-create-label-inp"
                                type="text"
                                value={createLabelKeybind}
                                onKeyDown={handleKeyDown}
                                placeholder="Press keys..."
                                onFocus={inputOnFocus} onBlur={inputOnBlur}
                                readOnly
                            />
                        </div>

                        <button type="submit" className="create-label-submit">Create</button>
                        
                    </form>
                </div>
                
                {/* Editing label */}
                {editingLabel && <div className="dataset-label-expanded" style={{top: Math.min(editExpandedTop, pageRef.current.getBoundingClientRect().height - 375 + TOOLBAR_HEIGHT)}} onClick={(e) => {e.stopPropagation()}}>
                    <form className="dataset-create-label-form" onSubmit={editLabelOnSubmit}>
                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="label-name-inp">Name</label>
                            <input id="label-name-inp" className="dataset-create-label-inp" type="text" placeholder="Name" value={editingLabelName} onChange={(e) => {
                                setEditingLabelName(e.target.value)
                            }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                        </div>
                        
                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="label-color-inp">Color</label>
                            <div className="create-label-color-container" style={{background: editingLabelColor}}>
                                <input id="label-color-inp" className="dataset-create-label-color" type="color" value={editingLabelColor} onChange={(e) => {
                                    setEditingLabelColor(e.target.value)
                                }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                            </div>
                        </div>

                        <div className="dataset-create-label-row">
                            <label className="dataset-create-label-label" htmlFor="keybinding">Keybind</label>
                            <input
                                id="keybinding"
                                className="dataset-create-label-inp"
                                type="text"
                                value={editingLabelKeybind}
                                onKeyDown={(e) => {handleKeyDown(e, "editing-label")}}
                                placeholder="Press keys..."
                                onFocus={inputOnFocus} onBlur={inputOnBlur}
                                readOnly
                            />
                        </div>

                        <button type="submit" className="create-label-submit">Save</button>
                        <button type="button" className="create-label-submit edit-label-delete" onClick={deleteLabel}>Delete</button>
                        
                    </form>
                    </div>}

            </div>
        </div>
    )

    
}

export default Dataset