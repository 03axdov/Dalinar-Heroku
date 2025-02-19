import React, {useState, useRef, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import ProgressBar from "../components/ProgressBar"


function CreateDataset({notification, BACKEND_URL}) {

    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [uploadingDatasetFolders, setUploadingDatasetFolders] = useState(false)
    const [uploadingDatasetFilenames, setUploadingDatasetFilenames] = useState(false)
    const [uploadingPercentage, setUploadingPercentage] = useState(false)

    const [datasetType, setDatasetType] = useState("image")
    const [type, setType] = useState("classification")  // used for image datasets, either "classification" or "area"
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")
    const [keywordCurrent, setKeywordCurrent] = useState("")
    const [keywords, setKeywords] = useState([])
    const [imageWidth, setImageWidth] = useState("")
    const [imageHeight, setImageHeight] = useState("")

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const [uploadDropdownVisible, setUploadDropdownVisible] = useState(false)

    const [uploadedFoldersAsLabels, setUploadedFoldersAsLabels] = useState([])
    const [uploadedFilenamesAsLabels, setUploadedFilenamesAsLabels] = useState([])

    const [uploadedDatasets, setUploadedDatasets] = useState({}) // Labels as keys, with the value as an array of files with that label

    const hiddenFolderInputRef = useRef(null)
    const hiddenFilenamesInputRef = useRef(null)

    const INVALID_LABELS = new Set(["name", "datatype", "description", "image", "visibility", "labels"]) // Would impact formData below, temporary fix

    useEffect(() => {
        if (image === null) return
        if (image === '') return
        if (image === undefined) return
        var binaryData = [];
        binaryData.push(image);
        const url = URL.createObjectURL(new Blob(binaryData, {type: "application/zip"}))
        setImageURL(url)
    }, [image])

    function formOnSubmit(e) {
        e.preventDefault()

        if ((imageWidth && !imageHeight) || (!imageWidth && imageHeight)) {
            notification("You must specify either both image dimensions or neither.", "failure")
            return;
        }

        if (!name) {
            notification("Please enter a dataset name.", "failure")
            return;
        }

        if (!image) {
            notification("Please upload an image.", "failure")
            return;
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', name)
        formData.append('datatype', type)
        formData.append('dataset_type', datasetType)
        formData.append('description', (description ? description : ""))
        formData.append('image', image)
        formData.append("visibility", visibility)
        if (keywords.length > 0) {
            formData.append("keywords", JSON.stringify(keywords))
        }
        
        formData.append("imageWidth", imageWidth)
        formData.append("imageHeight", imageHeight)

        if (type != "area") {
            Object.entries(uploadedDatasets).forEach(([key, fileList]) => {
                formData.append("labels", key)
                fileList.forEach((file) => {
                    formData.append(key, file)
                })
            })
        }
        
        const URL = window.location.origin + '/api/create-dataset/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        if (loading) {
            return;
        }

        setLoading(true)
        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            navigate("/home")
            notification("Successfully created dataset " + name + ".", "success")
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setLoading(false)
        })
    }

    function folderInputClick() {
        if (hiddenFolderInputRef.current) {
            hiddenFolderInputRef.current.click();
        }
    }

    function filenamesInputClick() {
        if (hiddenFilenamesInputRef.current) {
            hiddenFilenamesInputRef.current.click();
        }
    }

    async function uploadFoldersAsLabels(e) {
        const ALLOWED_FILE_EXTENSIONS = (datasetType == "image" ? new Set(["png", "jpg", "jpeg", "webp", "avif"]) : new Set(["txt", "doc", "docx"]))
        setUploadingDatasetFolders(true)

        let notUploaded = []

        try {
            let files = e.target.files
            
            let tempObj = {...uploadedDatasets}    // Label name as key and value as an array of elements
            for (let i=0; i < files.length; i++) {
                let file = files[i]
                setUploadingPercentage(100 * (i+1) / files.length)

                let extension = file.name.split(".").pop().toLowerCase()
                if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
                    notUploaded.push(file.name)
                    continue
                }
                
                if (i == 0) {
                    let temp = [...uploadedFoldersAsLabels]
                    temp.push(file.webkitRelativePath.split("/")[0])
                    setUploadedFoldersAsLabels(temp)
                }
                let label = file.webkitRelativePath.split("/")[1].toLowerCase()
                if (INVALID_LABELS.has(label)) {
                    notification("Invalid label: " + label + ". Labels cannot be one of " + INVALID_LABELS, "failure")
                    continue
                }
                
                if (tempObj[label] == null) {tempObj[label] = []}
                tempObj[label].push(file)
            }

            setUploadedDatasets(tempObj)

        } catch (e) {
            notification("An error occured. This may be due to incorrect formatting of uploaded dataset.", "failure")
        } finally {
            setTimeout(() => {
                setUploadingDatasetFolders(false)
                setUploadingPercentage(0)
                if (notUploaded.length > 0) {
                    notification("Did not upload " + notUploaded.join(", ") + " as these files' types are not supported for " + datasetType + " datasets.", "failure")
                }
                e.target.value = "" // So same folder can be uploaded twice
            }, 200)
        }

    }

    async function uploadFilenamesAsLabels(e) {

        const ALLOWED_FILE_EXTENSIONS = (datasetType == "image" ? new Set(["png", "jpg", "jpeg", "webp", "avif"]) : new Set(["txt", "doc", "docx"]))

        let notUploaded = []

        setUploadingPercentage(0)
        setUploadingDatasetFilenames(true)
        try {
            let files = e.target.files
            
            let tempObj = {...uploadedDatasets}    // Label name as key and value as an array of elements

            for (let i=0; i < files.length; i++) {
                let file = files[i]
                setUploadingPercentage(100 * (i+1.0) / files.length)
                
                let extension = file.name.split(".").pop().toLowerCase()
                if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
                    notUploaded.push(file.name)
                    continue
                }

                if (i == 0) {   // For datasets to be shown
                    let temp = [...uploadedFilenamesAsLabels]
                    temp.push(file.webkitRelativePath.split("/")[0])
                    setUploadedFilenamesAsLabels(temp)
                }
                let label = file.name.split("_")[0].toLowerCase()
                if (INVALID_LABELS.has(label)) {
                    notification("Invalid label: " + label + ". Labels cannot be one of " + INVALID_LABELS, "failure")
                    continue
                }

                if (tempObj[label] == null) {tempObj[label] = []}
                tempObj[label].push(file)
                
            }

            setUploadedDatasets(tempObj)

        } catch (e) {
            notification("An error occured. This may be due to incorrect formatting of uploaded dataset.", "failure")
        } finally {
            setTimeout(() => {
                setUploadingDatasetFilenames(false)
                setUploadingPercentage(0)
                if (notUploaded.length > 0) {
                    notification("Did not upload " + notUploaded.join(", ") + " as these files' types are not supported for " + datasetType + " datasets.", "failure")
                }
                e.target.value = "" // So same folder can be uploaded twice
            }, 200)
        }
    }


    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    return (
        <div className="create-dataset-container">

            {(uploadingDatasetFilenames || uploadingDatasetFolders) && <ProgressBar 
                progress={uploadingPercentage}
                message="Uploading..."
                BACKEND_URL={BACKEND_URL}></ProgressBar>}

            <div className="create-dataset-form">
                <h1 className="create-dataset-title">Create a dataset</h1>
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset type</p>
                    <input type="radio" id="create-dataset-type-image" name="imagetype" value="image" checked={datasetType == "image"} onChange={(e) => {
                        setDatasetType(e.target.value)
                        setUploadedFoldersAsLabels([])
                    }} />
                    <label htmlFor="create-dataset-type-image" className="create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="texttype" value="text" checked={datasetType == "text"}  onChange={(e) => {
                        setDatasetType(e.target.value)
                        setUploadedFilenamesAsLabels([])
                        setType("classification")
                    }} />
                    <label htmlFor="create-dataset-type-text" className="create-dataset-type-label">Text</label>
                </div>
                <p className="create-dataset-description">Note that switching dataset type will remove all uploaded datasets.</p>
                

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Dataset name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" id="dataset-name" type="text" required value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <input type="file" accept="image/png, image/jpeg, image/webp" required className="hidden" ref={imageInputRef} onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                    {imageURL && <div className="create-dataset-image-container no-border" onClick={imageOnClick}>
                        <img className="create-dataset-image no-border" src={imageURL} onClick={imageOnClick}/>
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} /> Upload image</p>
                    </div>}
                </div>

                <p className="create-dataset-image-description">
                    The image that will represent this dataset. Elements (in Home or Explore) are displayed with a 230x190 image, but in the dataset's page description the full image will be visible.
                </p>

                {datasetType == "image" && <div className="create-dataset-label-inp">
                    <p className="create-dataset-label" style={{margin: 0}}>Image dimensions</p>
                    <span className="create-dataset-image-dimensions-left">(</span>
                    <input type="number" className="create-dataset-inp create-dataset-inp-dimensions" min="0" max="10000" placeholder="Width" value={imageWidth} onChange={(e) => {
                        setImageWidth(e.target.value)
                    }}/>
                    <span className="create-dataset-image-dimensions-center">,</span>
                    <input type="number" className="create-dataset-inp create-dataset-inp-dimensions" min="0" max="10000" placeholder="Height" value={imageHeight} onChange={(e) => {
                        setImageHeight(e.target.value)
                    }}/>
                    <span className="create-dataset-image-dimensions-right">)</span>
                </div>}
                {datasetType == "image" && <p className="create-dataset-description">If specified, images uploaded to this dataset will be resized. Images can also be manually resized.
                    Note that images with dimensions larger than 1024px will be resized so their largest dimension is at most 1024px regardless.
                </p>}

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Type of data</p>
                    <input type="radio" id="create-dataset-type-classification" name="classification" value="classification" checked={type == "classification"} onChange={(e) => {
                        setType(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-type-classification" className="create-dataset-type-label">Classification</label>
                    <input type="radio" id="create-dataset-type-area" className={(datasetType == "text" ? "dataset-type-disabled": "")} name="area" value="area" checked={type == "area"}  onChange={(e) => {
                        if (datasetType == "image") {
                            setType(e.target.value)
                        }
                        
                    }} />
                    <label htmlFor="create-dataset-type-area" className={"create-dataset-type-label " + (datasetType == "text" ? "dataset-type-disabled": "")}>Area <span className="create-dataset-required">(images only)</span></label>
                </div>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset visibility</p>
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={visibility == "public"}  onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-public" className="create-dataset-type-label">Public</label>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label">Keywords <span className="create-dataset-required">({keywords.length}/3)</span></label>

                    <div className="create-dataset-keywords-inp-container">
                        <form className="create-dataset-keywords-inp-form" onSubmit={(e) => {
                            e.preventDefault()
                            if (keywords.length < 3) {
                                if (!keywords.includes(keywordCurrent.toLowerCase()) && keywordCurrent.length > 0) {
                                    let temp = [...keywords]
                                    temp.push(keywordCurrent.toLowerCase())
                                    setKeywords(temp)
                                    setKeywordCurrent("")
                                }
                                
                            } else {
                                notification("You can only add three keywords.", "failure")
                            }
                        }}>
                            <input type="text" className="create-dataset-keywords-inp" value={keywordCurrent} onChange={(e) => {
                                setKeywordCurrent(e.target.value)
                            }} />
                            <button type="submit" className="create-dataset-keywords-button">
                                <img className="create-dataset-keywords-icon" src={BACKEND_URL + "/static/images/plus.png"} />
                                Add
                            </button>
                        </form>
                        
                    </div>
                    
                </div>

                {keywords.length > 0 && <div className="create-dataset-keywords-container">
                    {keywords.map((e, i) => (
                        <div key={i} className="create-dataset-keyword-element">
                            {e}
                            <img className="create-dataset-keyword-element-remove" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                let temp = [...keywords]
                                temp = temp.filter((keyword) => keyword != e)
                                setKeywords(temp)
                            }}/>
                        </div>
                    ))}
                </div>}

                {/*<div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="create-dataset-image">Image <span className="create-dataset-required">(required)</span></label>
                    
                </div>*/}

                { type == "classification" && <h1 className="create-dataset-title create-dataset-subtitle upload-dataset-title" onClick={() => {
                        setUploadDropdownVisible(!uploadDropdownVisible)
                    }}>Upload dataset 
                    <span className="create-dataset-title-optional">(optional)</span>
                    <img style={{rotate: (uploadDropdownVisible ? "180deg" : "0deg")}} className="upload-dataset-dropdown" src={BACKEND_URL + "/static/images/down.svg"}/>
                </h1>}
                
                {uploadDropdownVisible && type == "classification" && <div className="upload-dataset-form">
                    <p className="create-dataset-description" >
                        By uploading a dataset, this dataset will be created with the elements and labels provided. 
                        You can upload several datasets, of two different types seen below.
                        Note that improper formatting of uploaded datasets (see instructions below) may result in errors or incorrect labels.
                        Also note that label names will be set to lowercase.
                    </p>
                
                    <div className="upload-dataset-types-container">
                        {/* Uploading datasets goes through these */}
                        <input id="folders-as-labels-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFolderInputRef} onChange={(e) => {uploadFoldersAsLabels(e)}}/>
                        <input id="folders-as-labels-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFilenamesInputRef} onChange={(e) => uploadFilenamesAsLabels(e)}/>

                        <div className="upload-dataset-type-col">
                            <p className="upload-dataset-type-title">Folders as labels</p>
                            <p className="upload-dataset-type-description">
                                Will create labels for all subfolders in the uploaded folder, with elements in each subfolder belonging to that label.
                            </p>

                            <div className="upload-dataset-type-image-container">
                                <img className="upload-dataset-type-image" src={BACKEND_URL + "/static/images/foldersAsLabels.jpg"} />
                            </div>
                            
                            <button type="button" className="upload-dataset-button" onClick={folderInputClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} />
                                Upload dataset
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedFoldersAsLabels.map((e, i) => (
                                    <p title={e} key={i} className="uploaded-dataset-element">{e}</p>
                                ))}
                            </div>
                            
                        </div>
                        

                        <div className="upload-dataset-type-col">
                            <p className="upload-dataset-type-title">Filenames as labels</p>
                            <p className="upload-dataset-type-description">
                                Will create labels for every filename before the character '_' with such files belonging to that label, e.g. label1_2 will be read as belonging to label 1.
                            </p>

                            <div className="upload-dataset-type-image-container">
                                <img className="upload-dataset-type-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} />
                            </div>

                            <button type="button" className="upload-dataset-button" onClick={filenamesInputClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} />
                                Upload dataset
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedFilenamesAsLabels.map((e, i) => (
                                    <p title={e} key={i} className="uploaded-dataset-element">{e}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>}

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home")}>Cancel</button>
                    <button type="button" className="create-dataset-submit" onClick={formOnSubmit}>
                        {loading && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                        {(!loading ? "Create dataset" : "Processing...")}
                    </button>
                </div>
                
            
            </div>
        </div>
    )
}

export default CreateDataset