import React, {useState, useRef} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"


function CreateModel({notification, BACKEND_URL}) {

    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)

    const [type, setType] = useState("classification")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")

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
        formData.append('description', (description ? description : ""))
        formData.append('image', image)
        formData.append("visibility", visibility)

        const URL = window.location.origin + '/api/create-model/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        if (loading) {
            return;
        }

        setLoading(true)
        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            navigate("/home")
            notification("Successfully created model " + name + ".", "success")
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setLoading(false)
        })
    }

    return (
        <div className="create-dataset-container">
            <div className="create-dataset-form">
                <h1 className="create-dataset-title">Create a model</h1>
                <p className="create-dataset-description">Machine learning models consist of an arbitrary number of different layers, which can be added to created models.
                    Once layers have been specified, the model can be built, and later trained on datasets.
                </p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Model name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" id="dataset-name" type="text" required value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Model visibility</p>
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={visibility == "public"}  onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-public" className="create-dataset-type-label">Public</label>
                </div>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="create-dataset-image">Image <span className="create-dataset-required">(required)</span></label>
                    <input type="file" accept="image/png, image/jpeg, image/webp" id="create-dataset-image" name="image" required className="create-dataset-file-inp" onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                </div>

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

export default CreateModel