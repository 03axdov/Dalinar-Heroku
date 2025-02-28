import React, {useState, useEffect, useRef} from "react"
import axios from 'axios'
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ProgressBar from "../components/ProgressBar"

function PredictionPopup({setShowPredictionPopup, model, BACKEND_URL, notification}) {

    const [isPredicting, setIsPredicting] = useState(false)
    const [predictionProgress, setPredictionProgress] = useState(0)


    function predictModel(predictable) {
        const URL = window.location.origin + '/api/predict-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "model": model_id,
            "predict": predictable,
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


    return (
        <div className="popup train-model-popup" onClick={() => setShowPredictionPopup(false)}>

            {isPredicting && <ProgressBar progress={predictionProgress} message="Evaluating..." BACKEND_URL={BACKEND_URL}></ProgressBar>}

        </div>
    )
}


export default PredictionPopup