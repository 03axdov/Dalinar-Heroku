import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import { useParams } from "react-router-dom";


function EditDataset({activateConfirmPopup}) {

    const navigate = useNavigate()
    const { id } = useParams();
    const [loading, setLoading] = useState(true)

    const [originalName, setOriginalName] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("private")
    const [type, setType] = useState("")
    const [keywords, setKeywords] = useState([])
    const [keywordCurrent, setKeywordCurrent] = useState("")

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
            setType(dataset.datatype)
            setKeywords(JSON.parse(dataset.keywords))

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
        formData.append("keywords", JSON.stringify(keywords))

        const URL = window.location.origin + '/api/edit-dataset/'
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


    function deleteDatasetInner() {
        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let data = {
            "dataset": id
        }

        const URL = window.location.origin + '/api/delete-dataset/'
        const config = {headers: {'Content-Type': 'application/json'}}

        axios.post(URL, data, config)
        .then((data) => {
            navigate("/home")

        }).catch((error) => {
            alert("Error: ", error)

        })
    }

    function deleteDataset(e) {
        e.preventDefault()

        activateConfirmPopup("Are you sure you want to delete the dataset " + originalName + "? This action cannot be undone.", deleteDatasetInner)
    }

    return (
        <div className="create-dataset-container">
            <form className="create-dataset-form" onSubmit={formOnSubmit}>
                <div className="edit-dataset-title-container">
                    <h1 className="create-dataset-title"><span className="gray-text">Edit dataset — </span>{originalName}</h1>
                    <button type="button" className="edit-dataset-delete" onClick={deleteDataset}>Delete dataset</button>
                </div>
                
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="name">Dataset name</label>
                    <input className="create-dataset-inp" id="name" type="text" required placeholder={name} value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type edit-dataset-deactivated">Dataset type <span className="create-dataset-required">(unchangeable)</span></p>
                    <input type="radio" id="create-dataset-type-image" name="classification" value="classification" className="edit-dataset-deactivated" checked={type == "classification"} unselectable={"true"} />
                    <label htmlFor="create-dataset-type-image" className="edit-dataset-deactivated create-dataset-type-label">Classification</label>
                    <input type="radio" id="create-dataset-type-text" name="area" value="area" className="edit-dataset-deactivated" checked={type == "area"} unselectable={"true"} />
                    <label htmlFor="create-dataset-type-text" className="edit-dataset-deactivated create-dataset-type-label">Area</label>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="description">Description</label>
                    <input className="create-dataset-inp create-dataset-full-width" id="description" placeholder="description" type="text" value={description} onChange={(e) => {
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
                        <input type="text" className="create-dataset-keywords-inp" value={keywordCurrent} onChange={(e) => {
                            setKeywordCurrent(e.target.value)
                        }} />
                        <button type="button" className="create-dataset-keywords-button" onClick={() => {
                            if (keywords.length < 3) {
                                if (!keywords.includes(keywordCurrent.toLowerCase()) && keywordCurrent.length > 0) {
                                    let temp = [...keywords]
                                    temp.push(keywordCurrent.toLowerCase())
                                    setKeywords(temp)
                                    setKeywordCurrent("")
                                }
                                
                            } else {
                                alert("You can only add three keywords.")
                            }
                            
                        }}>
                            <img className="create-dataset-keywords-icon" src={window.location.origin + "/static/images/plus.png"} />
                            Add
                        </button>
                    </div>
                    
                </div>

                {keywords.length > 0 && <div className="create-dataset-keywords-container">
                    {keywords.map((e, i) => (
                        <div key={i} className="create-dataset-keyword-element">
                            {e}
                            <img className="create-dataset-keyword-element-remove" src={window.location.origin + "/static/images/cross.svg"} onClick={() => {
                                let temp = [...keywords]
                                temp = temp.filter((keyword) => keyword != e)
                                setKeywords(temp)
                            }}/>
                        </div>
                    ))}
                </div>}

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="image">New Image</label>
                    <input type="file" accept="image/png, image/jpeg, image/webp" id="image" className="create-dataset-file-inp" onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                </div>

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home")}>Back to home</button>
                    <button type="submit" className="create-dataset-submit">Save changes</button>
                </div>
                
            
            </form>
        </div>
    )
}

export default EditDataset