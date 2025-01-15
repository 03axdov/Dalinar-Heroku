import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import { useParams } from "react-router-dom";


function EditDataset() {

    const navigate = useNavigate()
    const { id } = useParams();
    const [loading, setLoading] = useState(false)

    const [originalName, setOriginalName] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")

    useEffect(() => {
        getDataset()
    }, [])

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

        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    function formOnSubmit(e) {
        e.preventDefault()

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

        const URL = window.location.origin + '/api/edit-dataset/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            navigate("/datasets/" + id)
        }).catch((error) => {
            alert("An error occurred.")
            console.log("Error: ", error)
        })
    }

    return (
        <div className="create-dataset-container">
            <form className="create-dataset-form" onSubmit={formOnSubmit}>
                <h1 className="create-dataset-title">Edit dataset — <span className="gray-text">{originalName}</span></h1>
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="name">Dataset name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" id="name" type="text" required placeholder={name} value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="description">Description</label>
                    <input className="create-dataset-inp create-dataset-full-width" id="description" placeholder="description" type="text" value={description} onChange={(e) => {
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
                    <label className="create-dataset-label" htmlFor="image">New Image</label>
                    <input type="file" accept="image/*" id="image" className="create-dataset-file-inp" onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                </div>

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home")}>Cancel</button>
                    <button type="submit" className="create-dataset-submit">Save changes</button>
                </div>
                
            
            </form>
        </div>
    )
}

export default EditDataset