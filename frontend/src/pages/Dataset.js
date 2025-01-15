import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import DownloadPopup from "../components/DownloadPopup"
import axios from "axios"

import JSZip from "jszip";
import { saveAs } from "file-saver";


const TOOLBAR_HEIGHT = 60

// The default page. Login not required.
function Dataset() {

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
    const [idToLabel, setIdToLabel] = useState({})

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

    const hiddenFolderInputRef = useRef(null);
    const hiddenFileInputRef = useRef(null);

    const [inputFocused, setInputFocused] = useState(false);  // Don't use keybinds if input is focused

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
            }
        };
    
        // Attach the event listener
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, false);
        };
    }, [loading, elements, elementsIndex, inputFocused])


    function getDataset() {
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
                if (i == files.length - 1) {
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


    const handleKeyDown = (event, type="creating-label") => {
        event.preventDefault(); // Prevent default behavior
    
        if (event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight") {
            return; // Binded to scrolling through elements already
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
            console.log(res)

            let tempElements = [...elements]
            tempElements[elementsIndex].label = null

            console.log(tempElements)
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


    function deleteLabel(e) {
        e.preventDefault()

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
            console.log("Success: ", data)
            
            getLabels()

            setEditingLabel(null)

        }).catch((error) => {
            alert("Error: ", error)

        }).finally(() => {
            setLoading(false)
        })
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
        <div className="dataset-container" onClick={closePopups}>

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
                    
                    {elements.map((element, idx) => (
                        <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
                        key={element.id} 
                        onClick={() => setElementsIndex(idx)}
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
                    {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
                </div>
                
                {/* Shows an element's label */}
                {hoveredElement != null && elements[hoveredElement].label && !editingElement &&
                    <div className="dataset-sidebar-element-label" style={{top: elementLabelTop}}>{idToLabel[elements[hoveredElement].label].name}</div>
                }

                {/* Editing element */}
                {editingElement && <div className="dataset-element-expanded" style={{top: editExpandedTop}} onClick={(e) => {e.stopPropagation()}}>
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
                <div title="Will show color of pressed label" className="dataset-main-label-clicked" style={{background: datasetMainLabelColor}}></div>
                {(elements.length == 0 && !loading) && <button type="button" className="dataset-upload-button" onClick={folderInputClick}>Upload folder</button>}
                {elements.length != 0 && <div className="dataset-element-view-container">
                    {getPreviewElement(elements[elementsIndex])}
                </div>}
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
                    <div className="dataset-sidebar-element" onClick={removeCurrentElementLabel}>
                        <img className="dataset-sidebar-icon" src={window.location.origin + "/static/images/cross.svg"}/>
                        Clear label
                    </div>
                    {labels.map((label) => (
                        <div className="dataset-sidebar-element" key={label.id} onClick={() => labelOnClick(label)}>
                            <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                            <span className="dataset-sidebar-label-name" title={label.name}>{label.name}</span>
                            {label.keybind && <span title={"Keybind: " + label.keybind.toUpperCase()} className="dataset-sidebar-label-keybind">{label.keybind.toUpperCase()}</span>}
                            <img title="Edit label" 
                                className={"dataset-sidebar-options" + (!label.keybind ? "dataset-sidebar-options-margin" : "") }
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
                {editingLabel && <div className="dataset-label-expanded" style={{top: editExpandedTop}} onClick={(e) => {e.stopPropagation()}}>
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