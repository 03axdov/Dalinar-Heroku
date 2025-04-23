import React, {useState, useEffect, useRef} from "react"
import axios from 'axios'
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ProgressBar from "../components/ProgressBar"
import TrainingTable from "../components/TrainingTable"
import ElementFilters from "../components/minor/ElementFilters"
import { useTask } from "../contexts/TaskContext"

function EvaluateModelPopup({setShowEvaluateModelPopup, model_id, model_type, currentProfile, BACKEND_URL, notification, activateConfirmPopup}) {
    const { getTaskResult } = useTask();

    const [datasets, setDatasets] = useState([])
    const [savedDatasets, setSavedDatasets] = useState([])

    const [isEvaluating, setIsEvaluating] = useState(false)
    const [evaluationProgress, setEvaluationProgress] = useState(0)

    const [loading, setLoading] = useState(false)

    const [sortDatasets, setSortDatasets] = useState("downloads")
    const [search, setSearch] = useState("")

    const [sortSavedDatasets, setSortSavedDatasets] = useState("downloads")
    const [searchSaved, setSearchSaved] = useState("")

    const [datasetTypeShown, setDatasetTypeShown] = useState("my")  // "my" or "saved"

    const [accuracy, setAccuracy] = useState(0)
    const [loss, setLoss] = useState(0)

    const [wasEvaluated, setWasEvaluated] = useState(false)

    const [imageDimensions, setImageDimensions] = useState(["", ""])


    useEffect(() => {
        getDatasets()
    }, [])

    useEffect(() => {
        if (currentProfile && currentProfile.saved_datasets) {
            setSavedDatasets(sort_saved_datasets(currentProfile.saved_datasets))
        }
    }, [currentProfile])

    function getDatasets() {
        setLoading(true)
        let URL = window.location.origin + '/api/my-datasets/?' +
            "search=" + search +
            "&dataset_type=" + model_type +
            "&order_by=" + sortDatasets

        if (model_type.toLowerCase() == "image") {
            URL += "&imageWidth=" + imageDimensions[0] +
                "&imageHeight=" + imageDimensions[1]
        }

        axios({
            method: 'GET',
            url: URL,
        })
        .then((res) => {
            if (res.data) {
                setDatasets(res.data.results)
            } else {
                setDatasets([])
            }

        }).catch((err) => {
            notification("An error occured while loading your datasets.", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    let resInterval = null;
    function evaluateModel(dataset_id) {
        const URL = window.location.origin + '/api/evaluate-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "model": model_id,
            "dataset": dataset_id,
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (isEvaluating) {return}
        setIsEvaluating(true)
        setEvaluationProgress(0)

        axios.post(URL, data, config)
        .then((res) => {

            resInterval = setInterval(() => getTaskResult(
                "evaluation",
                resInterval,
                res.data["task_id"],
                (data) => {
                    notification("Successfully evaluated model.", "success")
    
                    setAccuracy(data["accuracy"].toFixed(4))
                    setLoss(data["loss"].toFixed(4))
                },
                (data) => {
                    notification("Evaluation failed: " + data["message"], "failure")
                },
                (data) => {
                    if (data["evaluation_progress"]) {  // No progress for unauthenticated users
                        setEvaluationProgress(data["evaluation_progress"] * 100)
                    }
                },
                () => {
                    setEvaluationProgress(100)
                    setTimeout(() => {
                        setIsEvaluating(false)
                        setEvaluationProgress(0)
                        setWasEvaluated(true)
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

    function sort_datasets(ds) {
        let tempDatasets = [...ds]

        tempDatasets.sort((d1, d2) => {
            if (sortDatasets == "downloads") {
                if (d1.downloaders.length != d2.downloaders.length) {
                    return d2.downloaders.length - d1.downloaders.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sortDatasets == "alphabetical") {
                return d1.name.localeCompare(d2.name)
            } else if (sortDatasets == "date") {
                return new Date(d2.created_at) - new Date(d1.created_at)
            } else if (sortDatasets == "elements") {
                if (d1.elements.length != d2.elements.length) {
                    return d2.elements.length - d1.elements.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sortDatasets == "labels") {
                if (d1.labels.length != d2.labels.length) {
                    return d2.labels.length - d1.labels.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            }
        })

        return tempDatasets

    }

    function sort_saved_datasets(ds) {
        let tempDatasets = [...ds]
        
        tempDatasets.sort((d1, d2) => {
            if (sortSavedDatasets == "downloads") {
                if (d1.downloaders.length != d2.downloaders.length) {
                    return d2.downloaders.length - d1.downloaders.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
            } else if (sortSavedDatasets == "alphabetical") {
                return d1.name.localeCompare(d2.name)
            } else if (sortSavedDatasets == "date") {
                return new Date(d2.created_at) - new Date(d1.created_at)
            } else if (sortSavedDatasets == "elements") {
                if (d1.elements.length != d2.elements.length) {
                    return d2.elements.length - d1.elements.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
            } else if (sortSavedDatasets == "labels") {
                if (d1.labels.length != d2.labels.length) {
                    return d2.labels.length - d1.labels.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            }
        })

        return tempDatasets
    }

    useEffect(() => {
        if (!loading && savedDatasets.length > 0) {
            setSavedDatasets(sort_saved_datasets(savedDatasets))
        }
    }, [sortSavedDatasets])
    
    useEffect(() => {
        if (!loading) {
            setDatasets(sort_datasets(datasets))
        }
    }, [sortDatasets])


    const firstSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoading(true)
        const handler = setTimeout(() => {
            getDatasets()
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    const firstSavedSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSavedSearch.current) {
            firstSavedSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoading(true)
        const handler = setTimeout(() => {
            if (searchSaved.length > 0) {
                let temp = [...savedDatasets]
                temp = temp.filter((dataset) => {
                    return dataset.name.toLowerCase().startsWith(searchSaved.toLowerCase())
                })
                setSavedDatasets(sort_saved_datasets(temp))
            } else {
                setSavedDatasets(sort_saved_datasets(currentProfile.saved_datasets))
            }
            setLoading(false)
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [searchSaved]);


    function datasetOnClick(dataset) {
        activateConfirmPopup("Are you sure you want to evaluate this model on the dataset " + dataset.name + "?", () => {
            evaluateModel(dataset.id)
        }, "blue")
    }

    function datasetShouldShow(dataset) {
        if (model_type.toLowerCase() == "image") {
            if (imageDimensions[0] && imageDimensions[0] != dataset.imageWidth) {
                return false
            }
            if (imageDimensions[1] && imageDimensions[1] != dataset.imageHeight) {
                return false
            }
        }
        return true;
    }

    const visibleDatasets = datasets.filter((dataset) => datasetShouldShow(dataset));
    const visibleSavedDatasets = savedDatasets.filter((dataset) => datasetShouldShow(dataset));

    return (
        <div className="popup train-model-popup" onClick={() => setShowEvaluateModelPopup(false)}>

            {isEvaluating && <ProgressBar progress={evaluationProgress} message="Evaluating..." BACKEND_URL={BACKEND_URL}></ProgressBar>}

            {!wasEvaluated && <div className="train-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <div className="explore-datasets-title-container">
                
                    <h1 className="create-layer-popup-title" style={{width: "auto"}}>Evaluate model</h1>

                    {datasetTypeShown == "my" && <ElementFilters 
                        show={model_type}
                        sort={sortDatasets}
                        setSort={setSortDatasets}
                        imageDimensions={imageDimensions}
                        setImageDimensions={setImageDimensions}
                        search={search}
                        setSearch={setSearch}
                        setLoading={setLoading}
                        BACKEND_URL={BACKEND_URL}
                    ></ElementFilters>}
                    {datasetTypeShown == "saved" && <ElementFilters 
                        show={model_type}
                        sort={sortSavedDatasets}
                        setSort={setSortSavedDatasets}
                        imageDimensions={imageDimensions}
                        setImageDimensions={setImageDimensions}
                        search={searchSaved}
                        setSearch={setSearchSaved}
                        setLoading={setLoading}
                        BACKEND_URL={BACKEND_URL}
                    ></ElementFilters>}

                    <button className="close-model-popup" title="Return to main display" onClick={() => setShowEvaluateModelPopup(false)}>Return to main display →</button>
                </div>
                
                <p className="create-layer-popup-description">
                    You can evaluate the model on your own datasets, as well as any public datasets you've saved.
                    Warnings will appear when attempting to evaluate on invalid datasets. Make sure that the input dimensions match the dataset.
                    Note that only labelled elements in the dataset will be used for evaluation, and that evaluation currently only supports classification datasets.
                    Evaluating one of your own models will display the accuracy in the model description.
                </p>

                <div className="train-model-row">
                    <div className="train-model-dataset-type-container">
                        <div className={"train-model-dataset-type-left train-model-dataset-type " + (datasetTypeShown == "my" ? "train-model-dataset-type-selected" : "")}
                        onClick={() => setDatasetTypeShown("my")}>My datasets</div>
                        <div className={"train-model-dataset-type-right train-model-dataset-type " + (datasetTypeShown == "saved" ? "train-model-dataset-type-selected" : "")}
                        onClick={() => setDatasetTypeShown("saved")}>Saved datasets</div>
                    </div>
                </div>
                

                {datasetTypeShown == "my" && <div className="my-datasets-container train-datasets-container" style={{padding: 0}}>
                {visibleDatasets.map((dataset) => (
                        ((dataset.dataset_type.toLowerCase() == model_type) ? <div title={(dataset.datatype == "classification" ? "Train on this dataset": "Area datasets not supported.")} key={dataset.id} onClick={() => {
                            if (dataset.datatype == "classification") {
                                datasetOnClick(dataset)
                            } else {
                                notification("Training on area datasets is not yet supported.", "failure")
                            }

                        }}
                        className="dataset-element-training-outer">
                            <DatasetElement isPublic={true} dataset={dataset} isTraining={true} BACKEND_URL={BACKEND_URL} isDeactivated={dataset.datatype != "classification"}/>
                        </div> : "")
                    ))}
                    
                    {!loading && visibleDatasets.length === 0 && datasets.length > 0 && <p className="gray-text">No such datasets found.</p>}

                    {!loading && datasets.length === 0 && search.length === 0 && (
                        <p style={{width: "250px"}}>You don't have any datasets. Click <span className="link" onClick={() => navigate("/create-dataset")}>here</span> to create one.</p>
                    )}

                    {!loading && datasets.length === 0 && search.length > 0 && (
                        <p className="gray-text">No such datasets found.</p>
                    )}

                    {loading && datasets.length === 0 && currentProfile.datasetsCount > 0 && (
                        [...Array(currentProfile.datasetsCount)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true} isTraining={true}/>
                        ))
                    )}
                </div>}

                {savedDatasets && datasetTypeShown == "saved" && <div className="my-datasets-container train-datasets-container" style={{padding: 0}}>
                    {visibleSavedDatasets.map((dataset) => (
                        ((dataset.dataset_type.toLowerCase() == model_type) ? <div title={(dataset.datatype == "classification" ? "Train on this dataset": "Area datasets not supported.")} key={dataset.id} onClick={() => {
                            if (dataset.datatype == "classification") {
                                datasetOnClick(dataset)
                            } else {
                                notification("Training on area datasets is not yet supported.", "failure")
                            }

                        }}
                        className="dataset-element-training-outer">
                            <DatasetElement isPublic={true} dataset={dataset} isTraining={true} BACKEND_URL={BACKEND_URL} isDeactivated={dataset.datatype != "classification"}/>
                        </div> : "")
                    ))}
                    
                    {!loading && visibleSavedDatasets.length === 0 && savedDatasets.length > 0 && <p className="gray-text">No such datasets found.</p>}

                    {!loading && savedDatasets.length === 0 && searchSaved.length === 0 && (
                        <p style={{width: "250px"}}>You don't have any datasets. Click <span className="link" onClick={() => navigate("/create-dataset")}>here</span> to create one.</p>
                    )}

                    {!loading && savedDatasets.length === 0 && searchSaved.length > 0 && (
                        <p className="gray-text">No such datasets found.</p>
                    )}

                    {loading && savedDatasets.length === 0 && currentProfile.saved_datasets && currentProfile.saved_datasets.length > 0 && currentProfile.saved_datasets.map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true} isTraining={true}/>
                        )
                    )}
                </div>}
                
            </div>}

            {wasEvaluated && <div className="train-model-popup-container" style={{width: "auto", height: "auto", overflow: "hidden"}} onClick={(e) => {
                e.stopPropagation()
            }}>
                <div className="explore-datasets-title-container">
                    <h1 className="create-layer-popup-title successfully-trained-title">Successfully evaluated model<img className="trained-successfully-icon" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue checkmark" /></h1>
                </div>

                <TrainingTable data={[{accuracy: accuracy, loss: loss}]} skip_epoch={true}/>

            </div>}
        </div>
    )
}


export default EvaluateModelPopup