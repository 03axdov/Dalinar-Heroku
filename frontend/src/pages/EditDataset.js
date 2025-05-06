import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import { useParams, useSearchParams } from "react-router-dom";
import TitleSetter from "../components/minor/TitleSetter";

function EditDataset({activateConfirmPopup, notification, BACKEND_URL}) {

    const navigate = useNavigate()
    const [searchParams] = useSearchParams();
    const expandedParam = searchParams.get("expanded"); // Get the 'start' param

    const { id } = useParams();
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [processingDelete, setProcessingDelete] = useState(false)

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const [originalName, setOriginalName] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")
    const [datasetType, setDatasetType] = useState("")
    const [type, setType] = useState("")
    const [keywords, setKeywords] = useState([])
    const [keywordCurrent, setKeywordCurrent] = useState("")
    const [imageWidth, setImageWidth] = useState("")
    const [imageHeight, setImageHeight] = useState("")

    useEffect(() => {
        getDataset()
    }, [])

    useEffect(() => {
        if (image === null) return
        if (image === '') return
        if (image === undefined) return
        var binaryData = [];
        binaryData.push(image);
        const url = URL.createObjectURL(new Blob(binaryData, {type: "application/zip"}))
        setImageURL(url)
        }, [image])

    function getDataset() {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + id,
        })
        .then((res) => {
            let dataset = res.data
            
            setName(dataset.name)
            setOriginalName(dataset.name)
            setDescription(dataset.description)
            setVisibility(dataset.visibility)
            setType(dataset.datatype)
            setDatasetType(dataset.dataset_type.toLowerCase())
            setKeywords(dataset.keywords)
            setImageURL(dataset.imageSmall)
            setImageWidth(dataset.imageWidth || "")
            setImageHeight(dataset.imageHeight || "")

        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading dataset with id " + id + ".", "failure")

            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    function formOnSubmit(e) {
        e.preventDefault()
        if (loading) {
            return;
        }

        if ((imageWidth && !imageHeight) || (!imageWidth && imageHeight)) {
            notification("You must specify either both image dimensions or neither.", "failure")
            return;
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', name)
        formData.append('description', description)

        if (image) {
            formData.append('image', image)
        } else {formData.append("image", "")}
        formData.append("visibility", visibility)
        formData.append("id", id)
        formData.append("keywords", keywords)
        formData.append("imageWidth", imageWidth)
        formData.append("imageHeight", imageHeight)

        const URL = window.location.origin + '/api/edit-dataset/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        setProcessing(true)
        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            if (expandedParam) {
                navigate("/datasets/" + id)
            } else {
                navigate("/home")
            }
            notification("Successfully updated dataset " + name + ".", "success")
        }).catch((error) => {
            notification("An error occurred.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setProcessing(false)
        })
    }


    function deleteDatasetInner() {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "dataset": id
        }

        const URL = window.location.origin + '/api/delete-dataset/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setProcessingDelete(true)
        axios.post(URL, data, config)
        .then((data) => {
            navigate("/home")
            notification("Successfully deleted dataset " + name + ".", "success")

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setProcessingDelete(false)
        })
    }

    function deleteDataset(e) {
        e.preventDefault()

        if (processingDelete) return;

        activateConfirmPopup("Are you sure you want to delete the dataset " + originalName + "? This action cannot be undone.", deleteDatasetInner)
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    return (
        <div className="create-dataset-container">
            <TitleSetter title={"Dalinar " + (originalName ? "- Edit " + originalName : "")} />
            <div className="create-dataset-form">
                <div className="edit-dataset-title-container">
                    <h1 className="create-dataset-title"><span className="gray-text">Edit dataset — </span>{originalName}</h1>
                    <button type="button" className="edit-dataset-delete" onClick={deleteDataset}>
                        {processingDelete && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                        {(!processingDelete ? "Delete dataset" : "Processing...")}
                    </button>
                </div>
                
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type edit-dataset-deactivated">Dataset type <span className="create-dataset-required">(unchangeable)</span></p>
                    <input type="radio" id="create-dataset-type-image" name="image" value="Image" className="edit-dataset-deactivated" checked={datasetType == "image"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-image" className="edit-dataset-deactivated create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="text" value="Text" className="edit-dataset-deactivated" checked={datasetType == "text"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-text" className="edit-dataset-deactivated create-dataset-type-label">Text</label>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Dataset name</label>
                    <input className="create-dataset-inp" id="dataset-name" type="text" required placeholder={name} value={name} onChange={(e) => {
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
                        <img className="create-dataset-image no-border" src={imageURL} onClick={imageOnClick} alt="Dataset image" />
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
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
                {datasetType == "image" && <p className="create-dataset-description">
                    If specified, images uploaded to this dataset will be resized. 
                    Images can also be manually resized. Note that current images will be resized.
                    </p>}

                {datasetType == "image" && <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type edit-dataset-deactivated">Type of data <span className="create-dataset-required">(unchangeable)</span></p>
                    <input type="radio" id="create-dataset-type-image" name="classification" value="classification" className="edit-dataset-deactivated" checked={type == "classification"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-image" className="edit-dataset-deactivated create-dataset-type-label">Classification</label>
                    <input type="radio" id="create-dataset-type-text" name="area" value="area" className="edit-dataset-deactivated" checked={type == "area"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-text" className="edit-dataset-deactivated create-dataset-type-label">Area</label>
                </div>}

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset visibility</p>
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={!loading && visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={!loading && visibility == "public"}  onChange={(e) => {
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
                                <img className="create-dataset-keywords-icon" src={BACKEND_URL + "/static/images/plus.png"} alt="Plus" />
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
                            }} alt="Cross" />
                        </div>
                    ))}
                </div>}
                {loading && <div className="create-dataset-keywords-container"></div>}

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => {
                        if (expandedParam) {
                            navigate("/datasets/" + id)
                        } else {
                            navigate("/home")
                        }
                        
                    }}>Back</button>
                    <button type="button" className="create-dataset-submit" onClick={formOnSubmit}>
                        {processing && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                        {(!processing ? "Save changes" : "Processing...")}
                    </button>
                </div>
                
            
            </div>
        </div>
    )
}

export default EditDataset