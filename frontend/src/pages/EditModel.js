import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import { useParams, useSearchParams } from "react-router-dom";
import TitleSetter from "../components/minor/TitleSetter";

function EditModel({activateConfirmPopup, notification, BACKEND_URL}) {

    const navigate = useNavigate()
    const [searchParams] = useSearchParams();
    const expandedParam = searchParams.get("expanded"); // Get the 'start' param
    
    const { id } = useParams();
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [processingDelete, setProcessingDelete] = useState(false)

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const [modelType, setModelType] = useState("")

    const [originalName, setOriginalName] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")
    const [type, setType] = useState("")

    useEffect(() => {
        getModel()
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


    function getModel() {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/' + id,
        })
        .then((res) => {
            let model = res.data
            
            setModelType(model.model_type)
            setName(model.name)
            setOriginalName(model.name)
            setDescription(model.description)
            setVisibility(model.visibility)
            setImageURL(model.imageSmall)

        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading model with id " + id + ".", "failure")

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

        const URL = window.location.origin + '/api/edit-model/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        setProcessing(true)
        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            
            if (expandedParam) {
                navigate("/models/" + id)
            } else {
                console.log("HERE")
                navigate("/home?start=models")
            }
            notification("Successfully updated model " + name + ".", "success")
        }).catch((error) => {
            notification("An error occurred.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setProcessing(false)
        })
    }


    function deleteModelInner() {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "model": id
        }

        const URL = window.location.origin + '/api/delete-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        setProcessingDelete(true)
        axios.post(URL, data, config)
        .then((data) => {
            navigate("/home?start=models")
            notification("Successfully deleted model " + name + ".", "success")

        }).catch((error) => {
            notification("Error: " + error + ".", "failure")
        }).finally(() => {
            setProcessingDelete(false)
        })
    }

    function deleteModel(e) {
        e.preventDefault()

        activateConfirmPopup("Are you sure you want to delete the model " + originalName + "? This action cannot be undone.", deleteModelInner)
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
                    <h1 className="create-dataset-title"><span className="gray-text">Edit model — </span>{originalName}</h1>
                    <button type="button" className="edit-dataset-delete" onClick={deleteModel}>
                        {processingDelete && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                        {(!processingDelete ? "Delete model" : "Processing...")}
                    </button>
                </div>
                
                <p className="create-dataset-description">
                    Machine learning models consist of an arbitrary number of different layers, which can be added to created models.
                    Once layers have been specified, the model can be trained and downloaded.
                </p>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type edit-dataset-deactivated">Model type <span className="create-dataset-required">(unchangeable)</span></p>
                    <input type="radio" id="create-dataset-type-image" name="image" value="Image" className="edit-dataset-deactivated" checked={modelType == "image"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-image" className="edit-dataset-deactivated create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="text" value="Text" className="edit-dataset-deactivated" checked={modelType == "text"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-text" className="edit-dataset-deactivated create-dataset-type-label">Text</label>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Model name</label>
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
                        <img className="create-dataset-image no-border" src={imageURL} onClick={imageOnClick} alt="Model image" />
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                    </div>}
                </div>

                <p className="create-dataset-image-description">The image that will represent this model. Elements are displayed with a 230x190 image, but in the models's page description the full image will be visible.</p>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Model visibility</p>
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={!loading && visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={!loading && visibility == "public"}  onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-public" className="create-dataset-type-label">Public</label>
                </div>

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => {
                        if (expandedParam) {
                            navigate("/models/" + id)
                        } else {
                            navigate("/home?start=models")
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

export default EditModel