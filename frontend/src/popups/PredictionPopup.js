import React, {useState, useEffect, useRef} from "react"
import axios from 'axios'
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ProgressBar from "../components/ProgressBar"
import { useTask } from "../contexts/TaskContext"

function PredictionPopup({setShowPredictionPopup, model, BACKEND_URL, notification}) {
    const { getTaskResult } = useTask();

    const [isPredicting, setIsPredicting] = useState(false)
    const [predictionProgress, setPredictionProgress] = useState(0)

    // Will use one of these based on the model_type
    const [images, setImages] = useState([])
    const [text, setText] = useState("")

    const imageInputRef = useRef(null)
    const [imageURLS, setImageURLS] = useState([])
    const hiddenFileRef = useRef(null)

    const [predictions, setPredictions] = useState([])
    const [predictionColors, setPredictionColors] = useState([])

    const [currentIndex, setCurrentIndex] = useState(0)


    useEffect(() => {
        if (images === null)
            setImages([])
        if (images.length == 0) return

        let imageURLSTemp = [];

        for (let i=0; i < images.length; i++) {
            let image = images[i]
            var binaryData = [];
            binaryData.push(image);
            const url = URL.createObjectURL(new Blob(binaryData, {type: "application/zip"}))
            imageURLSTemp.push(url)
        }
        
        setCurrentIndex(0)
        setImageURLS(imageURLSTemp)

        setPredictions([])
        setPredictionColors([])
    }, [images])


    let resInterval = null;
    function predictModel() {
        if (model.model_type.toLowerCase() == "image" && images.length == 0) {
            notification("Please upload an image to make a prediction.", "failure")
            return;
        }
        if (model.model_type.toLowerCase() == "text" && !text) {
            notification("Please enter text to make a prediction.", "failure")
            return;
        }
        if (!model.trained_on && !model.trained_on_tensorflow) {
            notification("Model must be trained to support prediction.", "failure")
            return
        }
        if (images.length > 10) {
            notification("Can only predict on a maximum of 10 images at once.", "failure")
            return
        }

        const URL = window.location.origin + '/api/predict-model/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        let data = {
            "model": model.id,
            "images": images,
            "text": text
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (isPredicting) {return}
        setIsPredicting(true)
        setPredictionProgress(0)

        axios.post(URL, data, config)
        .then((res) => {

            resInterval = setInterval(() => getTaskResult(
                "prediction",
                resInterval,
                res.data["task_id"],
                (data) => {
                    setPredictions(data["predictions"])
                    setPredictionColors(data["colors"])
                    notification("Successfully predicted data.", "success")  
                },
                (data) => notification("Error: " + data["message"], "failure"),
                () => {},
                () => {
                    setPredictionProgress(100)
                    setTimeout(() => {
                        setIsPredicting(false)
                        setPredictionProgress(0)
                    }, 200)
                }
            ), 2500)

        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        })
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    function predictionImageLeft() {
        if (images.length == 0) return
        if (currentIndex == 0) {
            setCurrentIndex(images.length - 1)
        } else {
            setCurrentIndex(currentIndex - 1)
        }
    }

    function predictionImageRight() {
        if (images.length == 0) return;
        if (currentIndex == images.length - 1) {
            setCurrentIndex(0)
        } else {
            setCurrentIndex(currentIndex + 1)
        }
    }

    return (
        <div className="popup train-model-popup" onClick={() => setShowPredictionPopup(false)}>

            {isPredicting && <ProgressBar progress={predictionProgress} message="Predicting..." BACKEND_URL={BACKEND_URL}></ProgressBar>}

            <div className="build-model-popup-container predict-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Predict</h1>
                <p className="create-layer-popup-description">
                    By entering data of the model's type, you can get it to make a prediction. The model will use the labels of the dataset it most recently trained successfully on.
                    {model.model_type.toLowerCase() == "image" && <span> Accepts .png, .jpg and .webp files. A maximum of 10 files can be predicted at a time.</span>}
                </p>

                {model.model_type.toLowerCase() == "image" && <div className="model-prediction-container">
                    <input type="file" accept="image/png, image/jpeg, image/webp" multiple required className="hidden" ref={imageInputRef} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setImages([...e.target.files].slice(0, 10))
                        }
                    }} />

                    <div className="predict-image-row">
                        <div className="model-prediction-left" onClick={predictionImageLeft}>
                            <img className="model-prediction-arrow" src={BACKEND_URL + "/static/images/down.svg"} alt="Dropdown" style={{transform: "rotate(90deg)"}}/>
                        </div>

                        {imageURLS[currentIndex] && <div className="create-dataset-image-container predict-image-container no-border" onClick={imageOnClick}>
                            <img className="create-dataset-image predict-image no-border" src={imageURLS[currentIndex]} alt="Uploaded image" onClick={imageOnClick}/>
                            <div className="create-dataset-image-hover">
                                <p className="create-dataset-image-text"><img className="create-dataset-image-icon" alt="Image" src={BACKEND_URL + "/static/images/image.png"} /> Upload images</p>
                            </div>
                        </div>}
                        {!imageURLS[currentIndex] && <div className="create-dataset-image-container predict-image-container" onClick={imageOnClick}>
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload images</p>
                        </div>}

                        <div className="model-prediction-right" onClick={predictionImageRight}>
                            <img className="model-prediction-arrow" src={BACKEND_URL + "/static/images/down.svg"} alt="Dropdown" style={{transform: "rotate(270deg)"}}/>
                        </div>
                    </div>
                    
                    <div className="model-prediction">                       
                        {predictions.length == 0 && <span className="gray-text unselectable">Press predict to make a prediction</span>}
                        
                        {predictions.length > 0 && <span className="prediction-circle" style={{background: predictionColors[currentIndex]}}></span>}

                        {predictions.length > 0 && <span>
                            {predictions[currentIndex]}
                        </span>} 
                    </div>

                    {images.length > 0 && <p className="gray-text" style={{textAlign: "right"}}>{currentIndex + 1} / {images.length} images</p>}
                </div>}

                {model.model_type.toLowerCase() == "text" && <div className="model-prediction-container">
                    <textarea className="predict-text-container" value={text} onChange={(e) => {
                        setText(e.target.value)
                    }} placeholder="Write some text...">

                    </textarea>

                    <div className="model-prediction">
                        {predictions.length == 0 && <span className="gray-text unselectable">Press predict to make a prediction</span>}
                            
                        {predictions.length > 0 && model.output_type == "classification" && <span className="prediction-circle" style={{background: predictionColors[currentIndex]}}></span>}

                        {predictions.length > 0 && <span>
                            {predictions[currentIndex]}
                        </span>} 
                    </div>
                </div>}

                <div className="prediction-bottom">
                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowPredictionPopup(false)}>Cancel</button>
                        <button type="button" className="create-layer-popup-submit" onClick={predictModel}>
                            {isPredicting && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!isPredicting ? "Predict" : "Predicting...")}
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    )
}


export default PredictionPopup