import React, {useState, useRef, useEffect} from "react"
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
    const [modelFile, setModelFile] = useState(null)

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const [uploadDropdownVisible, setUploadDropdownVisible] = useState(false)

    const hiddenFileRef = useRef(null)


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

        if (modelFile) {
            formData.append("model", modelFile)
        }

        const URL = window.location.origin + '/api/create-model/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        if (loading) {
            return;
        }

        setLoading(true)
        axios.post(URL, formData, config)
        .then((data) => {
            console.log("Success:", data);
            navigate("/home?start=models")
            notification("Successfully created model " + name + ".", "success")
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setLoading(false)
        })
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    function uploadInputClick() {
        if (hiddenFileRef.current) {
            hiddenFileRef.current.click();
        }
    }

    function uploadModel(e) {
        if (!e.target.files || e.target.files.length < 1) {return}
        setModelFile(e.target.files[0])
    }

    return (
        <div className="create-dataset-container">
            <div className="create-dataset-form">
                <h1 className="create-dataset-title">Create a model</h1>
                <p className="create-dataset-description">
                    Machine learning models consist of an arbitrary number of different layers, which can be added to created models.
                    Once layers have been specified, the model can be trained and downloaded.
                </p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Model name <span className="create-dataset-required">(required)</span></label>
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
                    The image that will represent this model. Elements (in Home or Explore) are displayed with a 230x190 image, but in the dataset's page description the full image will be visible.
                </p>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
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

                <h1 className="create-dataset-title create-dataset-subtitle upload-model-title">
                    Upload model 
                    <span className="create-dataset-title-optional">(optional)</span>
                </h1>

                <div className="upload-dataset-form">
                    <p className="create-dataset-description" >
                        By uploading a model, this model will be instantiated with all the support layers provided. See the bottom of the landing page for a list of supported layers.
                        Note that only .h5 and .keras models are supported.
                    </p>

                    <input id="folders-as-labels-upload-inp" type="file" accept=".h5, .keras" className="hidden" ref={hiddenFileRef} onChange={(e) => {uploadModel(e)}}/>

                    <div className="upload-model-container">
                        <button type="button" className="upload-model-button" onClick={uploadInputClick}>
                            <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} />
                            Upload model
                        </button>

                        {modelFile && <div className="uploaded-model-element">
                            {modelFile.name}
                            <img className="uploaded-model-cross" title="Remove uploaded model" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => {
                                setModelFile(null)
                                if (hiddenFileRef.current) {
                                    hiddenFileRef.current.value = null
                                }
                            }}/>
                        </div>}
                    </div>
                </div>
                
                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home?start=models")}>Cancel</button>
                    <button type="button" className="create-dataset-submit" onClick={formOnSubmit}>
                        {loading && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                        {(!loading ? "Create model" : "Processing...")}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreateModel