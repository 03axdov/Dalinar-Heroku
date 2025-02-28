import React, {useState, useEffect, useRef} from "react"
import axios from 'axios'
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ProgressBar from "../components/ProgressBar"

function PredictionPopup({setShowPredictionPopup, model, BACKEND_URL, notification}) {

    const [isPredicting, setIsPredicting] = useState(false)
    const [predictionProgress, setPredictionProgress] = useState(0)

    // Will use one of these based on the model_type
    const [image, setImage] = useState(null)
    const [text, setText] = useState("")

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")
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


    function predictModel() {
        if (model.model_type.toLowerCase() == "image" && !image) {
            notification("Please upload an image to make a prediction.", "failure")
            return;
        }
        if (model.model_type.toLowerCase() == "text" && !text) {
            notification("Please enter text to make a prediction.", "failure")
            return;
        }

        const URL = window.location.origin + '/api/predict-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "model": model_id,
        }

        if (model.model_type.toLowerCase() == "image") {
            data["image"] = image
        } else if (model.model_type.toLowerCase() == "text") {
            data["text"] = text
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (isPredicting) {return}
        setIsPredicting(true)
        setPredictionProgress(0)

        axios.post(URL, data, config)
        .then((res) => {
            data = res.data

        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        }).finally(() => {
            setPredictionProgress(100)

            setTimeout(() => {
                setIsPredicting(false)
                setPredictionProgress(0)
            }, 200)

        })
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }


    return (
        <div className="popup train-model-popup" onClick={() => setShowPredictionPopup(false)}>

            {isPredicting && <ProgressBar progress={predictionProgress} message="Evaluating..." BACKEND_URL={BACKEND_URL}></ProgressBar>}

            <div className="build-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Predict</h1>
                <p className="create-layer-popup-description">
                    By entering data of the model's type, you can get it to make a prediction. The model will use the labels of the dataset it most recently trained successfully on.
                </p>

                {model.model_type.toLowerCase() == "image" && <div className="model-prediction-container">
                    <input type="file" accept="image/png, image/jpeg, image/webp" required className="hidden" ref={imageInputRef} onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                    {imageURL && <div className="create-dataset-image-container predict-image-container no-border" onClick={imageOnClick}>
                        <img className="create-dataset-image predict-image no-border" src={imageURL} onClick={imageOnClick}/>
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container predict-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} /> Upload image</p>
                    </div>}

                    <div className="model-prediction">
                        <span className="gray-text unselectable">Press predict to make a prediction</span>
                    </div>
                </div>}

                {model.model_type.toLowerCase() == "text" && <div className="model-prediction-container">
                    <textarea className="predict-text-container" value={text} onChange={(e) => {
                        setText(e.target.value)
                    }}>

                    </textarea>

                    <div className="model-prediction">
                        <span className="gray-text">Press predict to make a prediction</span>
                    </div>
                </div>}

                <div className="prediction-bottom">
                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowPredictionPopup(false)}>Cancel</button>
                        <button type="button" className="create-layer-popup-submit" onClick={predictModel}>
                            {isPredicting && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"}/>}
                            {(!isPredicting ? "Predict" : "Predicting...")}
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    )
}


export default PredictionPopup