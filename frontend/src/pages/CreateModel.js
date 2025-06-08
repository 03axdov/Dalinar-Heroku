import React, {useState, useRef, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import { useParams, useSearchParams } from "react-router-dom";
import TitleSetter from "../components/minor/TitleSetter";
import { useTask } from "../contexts/TaskContext";


function CreateModel({notification, BACKEND_URL, changeModelCount}) {
    const { getTaskResult } = useTask();

    const navigate = useNavigate()

    const [searchParams] = useSearchParams();
    const copyModel = searchParams.get("copy"); // Get the 'start' param

    const [loading, setLoading] = useState(false)

    const [modelType, setModelType] = useState(copyModel ? "" : "image")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [outputType, setOutputType] = useState("classification")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("public")
    const [modelFile, setModelFile] = useState(null)

    const [loadingModelFile, setLoadingModelFile] = useState(false)
    const [modelFileName, setModelFileName] = useState("")  // Used for copying

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const hiddenFileRef = useRef(null)

    useEffect(() => {
        if (!copyModel) return;

        getModelFile(copyModel)

    }, [copyModel])

    function getModelFile(copyModelId) {
        setLoadingModelFile(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/public/' + copyModelId,
        })
        .then((res) => {
            let model = res.data
            
            if (model.model_file) {
                let ext = model.model_file.split(".").pop()
                setModelFileName(model.name.replaceAll(" ", "_") + "." + ext)
                createFileFromUrl(model.model_file)
            }
            setModelType(model.model_type)

        }).catch((err) => {
            navigate("/")
            notification("An error occured when loading model.", "failure")

            console.log(err)
        })
    }

    async function createFileFromUrl(url) {
        try {
            // Fetch the file content from the URL
            const response = await fetch(url);
    
            // Check if the response is successful
            if (!response.ok) {
                throw new Error('Failed to fetch the file');
            }
    
            // Get the file name from the URL (optional)
            const fileName = url.split('/').pop(); 
    
            // Convert the response to a Blob
            const blob = await response.blob();
    
            // Create a File object from the Blob
            const file = new File([blob], fileName, { type: blob.type });
    
            setModelFile(file)
        } catch (error) {
            console.error('Error creating file:', error);
        } finally {
            setLoadingModelFile(false)
        }
    }


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
        formData.append('description', (description ? description : ""))
        formData.append('image', image)
        formData.append("visibility", visibility)
        formData.append('model_type', modelType)

        if (modelFile) {
            if (modelFile.size > 20 * 10**6) {
                notification("Cannot upload models larger than 20 Mb.", "failure")
                return
            }
            formData.append("model", modelFile)
        }

        const URL = window.location.origin + '/api/create-model/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        if (loading) {
            return;
        }

        let creatingInterval = null;

        setLoading(true)
        axios.post(URL, formData, config)
        .then((res) => {
            if (res.data["task_id"]) {

                let val = 30.0
                if (description.length > 0) {
                    val += 5
                }
                if (visibility.toLowerCase() == "public") {
                    val += 5
                }

                gtag('event', 'conversion', {
                    'send_to': 'AW-17119632058/AMoCCNnE_dEaELq1o-M_',
                    'value': val,
                    'currency': 'SEK'
                });
                creatingInterval = setInterval(() => getTaskResult(
                    "creating_model",
                    creatingInterval,
                    res.data["task_id"],
                    () => {
                        changeModelCount(1)
                        navigate("/home?start=models")
                        notification("Successfully created model " + name + ".", "success")
                    },
                    (data) => notification(data["message"], "failure"),
                    () => {},
                    () => {
                        setLoading(false)
                    }
                ), 2000)
            } else {
                gtag('event', 'conversion', {
                    'send_to': 'AW-17119632058/AMoCCNnE_dEaELq1o-M_',
                    'value': 50.0,
                    'currency': 'SEK',
                    'event_callback': () => {
                        changeModelCount(1)
                        navigate("/home?start=models")
                        notification("Successfully created model " + name + ".", "success")
                    }
                });
                
            }
            
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
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
        setModelFileName("")
        setModelFile(e.target.files[0])
    }

    return (
        <div className="create-dataset-container">
            <TitleSetter title="Dalinar | Create model" />

            <div className="create-dataset-form">
                <h1 className="create-dataset-title">Create a model</h1>
                <p className="create-dataset-description">
                    Machine learning models consist of an arbitrary number of different layers, which can be added to created models.
                    Once layers have been specified, the model can be trained and downloaded.
                </p>

                {!copyModel && <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Model type</p>
                    <input type="radio" id="create-dataset-type-image" name="imagetype" value="image" checked={modelType == "image"} onChange={(e) => {
                        setModelType(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-type-image" className="create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="texttype" value="text" checked={modelType == "text"}  onChange={(e) => {
                        setModelType(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-type-text" className="create-dataset-type-label">Text</label>
                </div>}
                {copyModel && <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type edit-dataset-deactivated">Model type</p>
                    <input type="radio" id="create-dataset-type-image" name="image" value="Image" className="edit-dataset-deactivated" checked={modelType == "image"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-image" className="edit-dataset-deactivated create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="text" value="Text" className="edit-dataset-deactivated" checked={modelType == "text"} unselectable={"true"} onChange={() => {}} />
                    <label htmlFor="create-dataset-type-text" className="edit-dataset-deactivated create-dataset-type-label">Text</label>
                </div>}

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
                        <img className="create-dataset-image no-border" src={imageURL} onClick={imageOnClick} alt="Model image" />
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                    </div>}
                </div>

                <p className="create-dataset-image-description">
                    The image that will represent this model. Elements are displayed with a 230x190 image, but in the dataset's page description the full image will be visible.
                </p>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Type of output</p>
                    <input type="radio" id="create-dataset-type-classification" name="classification" value="classification" checked={outputType == "classification"} onChange={(e) => {
                        setOutputType(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-type-classification" className="create-dataset-type-label">Classification</label>
                    <input style={{marginLeft: "20px"}} type="radio" id="create-dataset-type-regression" title="Not currently supported" className="edit-dataset-deactivated" name="regression" value="regression" checked={outputType == "regression"}  onChange={(e) => {
                        
                    }} />
                    <label htmlFor="create-dataset-type-regression" className="create-dataset-type-label edit-dataset-deactivated" title="Not currently supported">Regression</label>
                </div>
                <p className="create-dataset-description">
                    {outputType == "classification" ? "The model will classify elements as belonging to specific labels (e.g. dog, cat, airplane)." : "The model will output a continuos number (e.g. price of a house)."}
                </p>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Model visibility</p>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={visibility == "public"}  onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-public" className="create-dataset-type-label">Public</label>
                    
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    
                </div>

                <h1 className="create-dataset-title create-dataset-subtitle upload-model-title">
                    Upload model 
                    <span className="create-dataset-title-optional">(optional)</span>
                </h1>

                <div className="upload-dataset-form">
                    <p className="create-dataset-description" >
                        By uploading a model, this model will be instantiated with all the supported layers provided—see the bottom of the landing page for a list of supported layers.
                        Note that only .h5 and .keras models are supported.
                    </p>

                    <input id="folders-as-labels-upload-inp" type="file" accept=".h5, .keras" className="hidden" ref={hiddenFileRef} onChange={(e) => {uploadModel(e)}}/>

                    <div className="upload-model-container">
                        {!copyModel && <button type="button" className="upload-model-button" onClick={uploadInputClick}>
                            <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                            Upload model
                        </button>}

                        {modelFile && <div className={"uploaded-model-element " + (copyModel ? "no-margin" : "")}>
                            {(modelFileName ? modelFileName : modelFile.name)}
                            {!copyModel && <img className="uploaded-model-cross" title="Remove uploaded model" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" onClick={() => {
                                setModelFile(null)
                                if (hiddenFileRef.current) {
                                    hiddenFileRef.current.value = null
                                }
                            }}/>}
                        </div>}
                        {loadingModelFile && <div className={"uploaded-model-element " + (copyModel ? "no-margin" : "")}>
                            <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} style={{width: "15px", height: "15px", marginRight: "10px"}} alt="Loading" />
                            Loading...
                        </div>}
                    </div>
                </div>
                
                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home?start=models")}>Cancel</button>
                    <button type="button" className="create-dataset-submit" onClick={formOnSubmit}>
                        {loading && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                        {(!loading ? "Create model" : "Processing...")}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreateModel