import React, {useEffect, useState, useRef} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Dataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])
    const [labels, setLabels] = useState([])

    const [elementsIndex, setElementsIndex] = useState(0)

    const [loading, setLoading] = useState(true)
    
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

    const hiddenFolderInputRef = useRef(null);
    const hiddenFileInputRef = useRef(null);


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
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
            } else if (key === "ArrowUp" || key === "ArrowLeft") {
                setElementsIndex(Math.max(elementsIndex - 1, 0))  
            } else if (labelKeybinds[key]) {
                console.log(labelKeybinds)
                labelOnClick(labelKeybinds[key])
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
            url: window.location.origin + '/api/datasets/' + id,
        })
        .then((res) => {
            setDataset(res.data)

            console.log(res.data.elements)

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
            return <p className="dataset-element-view-text"></p>
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
                return
            }

            let extension = file.name.split(".").pop()
            if (!IMAGE_FILE_EXTENSIONS.has(extension) && !TEXT_FILE_EXTENSIONS.has(extension)) {
                if (errorMessages) {errorMessages += "\n\n"}
                errorMessages += "Did not upload file with extension " + extension + " as this filetype is not supported."

                if (i == files.length - 1) {
                    alert(errorMessages)
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

            console.log(res.data)
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

        const URL = window.location.origin + '/api/edit-element/'
        const config = {headers: {'Content-Type': 'application/json'}}

        const data = {
            "label": label.id,
            "id": elements[elementsIndex].id
        }

        setLoading(true)

        setDatasetMainLabelColor(label.color)
        console.log(label.color)
        setTimeout(() => {
            setDatasetMainLabelColor("transparent")
        }, 100)

        axios.post(URL, data, config)
        .then((res) => {
            console.log(res)
            if (res.data) {
                elements[elementsIndex] = res.data
            }
            console.log("COMPLETE")
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
            getDataset()    // Ineffective and temporary
            console.log("COMPLETE")
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


    // FRONTEND FUNCTIONALITY


    function closePopups(exception) {
        if (exception != "editing-label") {
            setEditingLabel(null)
        }
        if (exception != "create-label") {
            setDisplayCreateLabel(false)
        }
        
    }


    return (
        <div className="dataset-container" onClick={closePopups}>

            {/* Uploading folders / files to elements goes through these */}
            <input id="dataset-file-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFolderInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>
            <input id="dataset-file-upload-inp" type="file" className="hidden" multiple ref={hiddenFileInputRef} onChange={(e) => {elementFilesUploaded(e)}}/>

            <div className="dataset-elements">
                <p className="dataset-sidebar-title">Elements</p>
                <div className="dataset-sidebar-button-container">
                    <button className="sidebar-button dataset-download-button"><img className="dataset-download-icon" src={window.location.origin + "/static/images/download.svg"}/>Download</button>
                </div>
                
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button" onClick={folderInputClick}>+ Upload folder</button>
                    <button type="button" className="sidebar-button dataset-upload-button dataset-upload-files-button" onClick={fileInputClick}>+ Upload files</button>
                </div>
                {elements.map((element, idx) => (
                    <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
                    key={element.id} 
                    onClick={() => setElementsIndex(idx)}
                    onMouseEnter={() => {setHoveredElement(idx)}}
                    onMouseLeave={() => {setHoveredElement(null)}}>
                        {(element.name.length < 20 ? element.name : element.name.substring(0, 20) + "...")}
                        {idToLabel[element.label] && <span className="dataset-sidebar-color dataset-sidebar-color-element" 
                                                        style={{background: (idToLabel[element.label].color ? idToLabel[element.label].color : "transparent")}}
                                                    >
                            {hoveredElement == idx && <div className="dataset-sidebar-element-label">{idToLabel[element.label].name}</div>}
                            
                        </span>}
                    </div>
                ))}
                {elements.length == 0 && !loading && <p className="dataset-no-items">Elements will show here</p>}
            </div>

            <div className="dataset-main">
                <div title="Will show color of pressed label" className="dataset-main-label-clicked" style={{background: datasetMainLabelColor}}></div>
                {(elements.length == 0 && !loading) && <button type="button" className="dataset-upload-button" onClick={folderInputClick}>Upload folder</button>}
                {elements.length != 0 && <div className="dataset-element-view-container">
                    {getPreviewElement(elements[elementsIndex])}
                </div>}
            </div>

            <div className="dataset-labels">
                <p className="dataset-sidebar-title">Labels</p>
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button" onClick={(e) => {
                        e.stopPropagation()
                        closePopups("create-label")
                        setDisplayCreateLabel(!displayCreateLabel)
                    }}>
                        {(displayCreateLabel ? "- Hide form" : "+ Add label")}
                    </button>
                    <div className="dataset-create-label-container" 
                        style={{display: (displayCreateLabel ? "flex" : "none")}}
                        onClick={(e) => e.stopPropagation()}>
                        <form className="dataset-create-label-form" onSubmit={createLabelSubmit}>
                            <div className="dataset-create-label-row">
                                <label className="dataset-create-label-label" htmlFor="label-name-inp">Name</label>
                                <input id="label-name-inp" className="dataset-create-label-inp" type="text" placeholder="Name" value={createLabelName} onChange={(e) => {
                                    setCreateLabelName(e.target.value)
                                }}/>
                            </div>
                            
                            <div className="dataset-create-label-row">
                                <label className="dataset-create-label-label" htmlFor="label-color-inp">Color</label>
                                <div className="create-label-color-container" style={{background: createLabelColor}}>
                                    <input id="label-color-inp" className="dataset-create-label-color" type="color" value={createLabelColor} onChange={(e) => {
                                        setCreateLabelColor(e.target.value)
                                    }} />
                                </div>
                            </div>

                            <div className="dataset-create-label-row">
                                <label className="dataset-create-label-label" htmlFor="keybinding">Keybind</label>
                                <input
                                    id="keybinding"
                                    className="dataset-create-label-inp"
                                    type="text"
                                    value={createLabelKeybind}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Press keys..."
                                    readOnly
                                />
                            </div>

                            <button type="submit" className="create-label-submit">Create</button>
                            
                        </form>
                    </div>
                </div>
                <div className="dataset-sidebar-element" onClick={removeCurrentElementLabel}>
                    <img className="dataset-sidebar-icon" src={window.location.origin + "/static/images/cross.svg"}/>
                    Clear label
                </div>
                {labels.map((label) => (
                    <div className="dataset-sidebar-element" key={label.id} onClick={() => labelOnClick(label)}>
                        <span className="dataset-sidebar-color" style={{background: (label.color ? label.color : "transparent")}}></span>
                        {(label.name.length < 20 ? label.name : label.name.substring(0, 20) + "...")}
                        <img title="Edit label" 
                            className="dataset-sidebar-options" 
                            src={window.location.origin + "/static/images/options.png"}
                            onClick={(e) => {
                                e.stopPropagation()
                                closePopups("editing-label")
                                if (editingLabel == label.id) {
                                    setEditingLabel(null)
                                } else {
                                    setEditingLabelName(label.name)
                                    setEditingLabelColor(label.color)
                                    setEditingLabelKeybind(label.keybind)
                                    setEditingLabel(label.id)
                                }

                            }}/>
                        {editingLabel == label.id && <div className="dataset-label-expanded" onClick={(e) => {e.stopPropagation()}}>
                            <form className="dataset-create-label-form" onSubmit={editLabelOnSubmit}>
                                <div className="dataset-create-label-row">
                                    <label className="dataset-create-label-label" htmlFor="label-name-inp">Name</label>
                                    <input id="label-name-inp" className="dataset-create-label-inp" type="text" placeholder="Name" value={editingLabelName} onChange={(e) => {
                                        setEditingLabelName(e.target.value)
                                    }}/>
                                </div>
                                
                                <div className="dataset-create-label-row">
                                    <label className="dataset-create-label-label" htmlFor="label-color-inp">Color</label>
                                    <div className="create-label-color-container" style={{background: editingLabelColor}}>
                                        <input id="label-color-inp" className="dataset-create-label-color" type="color" value={editingLabelColor} onChange={(e) => {
                                            setEditingLabelColor(e.target.value)
                                        }} />
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
                                        readOnly
                                    />
                                </div>

                                <button type="submit" className="create-label-submit">Save</button>
                                <button type="button" className="create-label-submit edit-label-delete" onClick={deleteLabel}>Delete</button>
                                
                            </form>
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    )

    
}

export default Dataset