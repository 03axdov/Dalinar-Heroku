import React, {useState} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"


function CreateDataset() {

    const navigate = useNavigate()
    const [type, setType] = useState("image")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")

    function formOnSubmit(e) {
        e.preventDefault()

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', name)
        formData.append('datatype', type)
        formData.append('description', description)
        formData.append('image', image)
        formData.append("visibility", visibility)

        const URL = window.location.origin + '/api/create-dataset/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            navigate("/home")
        }).catch((error) => {
            alert("An error occurred.")
            console.log("Error: ", error)
        })
    }

    return (
        <div className="create-dataset-container">
            <form className="create-dataset-form" onSubmit={formOnSubmit}>
                <h1 className="create-dataset-title">Create a dataset</h1>
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="name">Dataset name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" name="name" type="text" required value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset type</p>
                    <input type="radio" id="create-dataset-type-image" name="type" value="image" checked={type == "image"} onChange={(e) => {
                        setType(e.target.value)
                        console.log(e.currentTarget.value)
                    }} />
                    <label htmlFor="create-dataset-type-image" className="create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="type" value="text" checked={type == "text"}  onChange={(e) => {
                        setType(e.target.value)
                        console.log(e.currentTarget.value)
                    }} />
                    <label htmlFor="create-dataset-type-text" className="create-dataset-type-label">Text</label>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="description">Description</label>
                    <input className="create-dataset-inp create-dataset-full-width" name="description" type="text" value={description} onChange={(e) => {
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
                    <label className="create-dataset-label" htmlFor="image">Image</label>
                    <input type="file" accept="image/*" name="image" className="create-dataset-file-inp" onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                </div>

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home")}>Cancel</button>
                    <button type="submit" className="create-dataset-submit">Create dataset</button>
                </div>
                
            
            </form>
        </div>
    )
}

export default CreateDataset