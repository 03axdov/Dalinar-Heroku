import React, {useState, useEffect, useRef} from "react"
import axios from 'axios'
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ProgressBar from "../components/ProgressBar"

function TrainModelPopup({setShowTrainModelPopup, model_id, model_type, currentProfile, BACKEND_URL, notification, activateConfirmPopup, getModel}) {

    const [datasets, setDatasets] = useState([])
    const [savedDatasets, setSavedDatasets] = useState([])

    const [isTraining, setIsTraining] = useState(false)
    const [trainingProgress, setTrainingProgress] = useState(-1)    // Negative means processing

    const [loading, setLoading] = useState(false)

    const [sortDatasets, setSortDatasets] = useState("downloads")
    const [search, setSearch] = useState("")

    const [sortSavedDatasets, setSortSavedDatasets] = useState("downloads")
    const [searchSaved, setSearchSaved] = useState("")

    const [epochs, setEpochs] = useState(10)
    const [validationSplit, setValidationSplit] = useState(0.1)
    
    const [datasetTypeShown, setDatasetTypeShown] = useState("my")  // "my" or "saved"

    const [tensorflowDataset, setTensorflowDataset] = useState("cifar10")

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
        axios({
            method: 'GET',
            url: window.location.origin + '/api/my-datasets/' + (search ? "?search=" + search : ""),
        })
        .then((res) => {
            if (res.data) {
                setDatasets(sort_datasets(res.data))
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
    function trainModel(dataset_id, tensorflowDatasetSelected = "") {

        if (!epochs) {
            notification("Please specify the number of epochs to train for.", "failure")
            return;
        }
        if (!validationSplit) {
            setValidationSplit(0)
        }

        const URL = window.location.origin + '/api/train-model/'
        const config = {headers: {'Content-Type': 'application/json'}}

        let data = {
            "model": model_id,
            "dataset": dataset_id,
            "epochs": epochs,
            "validation_split": validationSplit,
            "tensorflow_dataset": tensorflowDatasetSelected
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        if (isTraining) {return}
        setIsTraining(true)
        setTrainingProgress(-1)

        axios.post(URL, data, config)
        .then((res) => {
            data = res.data
            if (!data) {return}

            resInterval = setInterval(() => getTrainingResult(data["task_id"]), 2500)

        }).catch((error) => {
            console.log(error)
            if (error.status == 400) {
                notification(error.response.data["Bad request"], "failure")
            } else {
                notification("Error: " + error, "failure")
            }

            
        })

    }

    let trainingResOutstanding = 0;
    function getTrainingResult(id) {
        if (trainingResOutstanding > 0) return;
        trainingResOutstanding += 1
        axios({
            method: 'GET',
            url: window.location.origin + '/api/task-result/' + id,
        })
        .then((res) => {
            if (res.data["status"] != "in progress") {
                console.log(res.data)
                clearInterval(resInterval)
                setTrainingProgress(100)
    
                setTimeout(() => {
                    setIsTraining(false)
                    setTrainingProgress(-1)

                    if (res.data["status"] != "failed") {   // Training success
                        notification("Successfully trained model.", "success")

                        getModel(true)

                    } else {
                        notification("Training failed: " + res.data["message"], "failure")
                    }

                    if (document.visibilityState !== "visible") {
                        alert("Training finished.")
                    }
                }, 200)
            } else if (res.data["status"] == "in progress") {
                setTrainingProgress(res.data["training_progress"] * 100)
            }
        })
        .catch(error => console.error("Error fetching result:", error))
        .finally(() => {
            trainingResOutstanding -= 1
        });
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
        activateConfirmPopup("Are you sure you want to train this model on the dataset " + dataset.name + "? This action can only be undone by rebuilding the model.", () => {
            trainModel(dataset.id)
        }, "blue")
    }

    function tensorflowDatasetOnClick() {
        activateConfirmPopup("Are you sure you want to train this model on the dataset " + tensorflowDataset + "? This action can only be undone by rebuilding the model.", () => {
            trainModel(-1, tensorflowDataset)
        }, "blue")
    }


    return (
        <div className="popup train-model-popup" onClick={() => {
            setShowTrainModelPopup(false)
        }}>

            {isTraining && <ProgressBar progress={trainingProgress} message={(trainingProgress >= 0 ? (Math.round(trainingProgress * epochs / 100) + " / " + epochs + " epochs") : "Processing...")} BACKEND_URL={BACKEND_URL}></ProgressBar>}

            <div className="train-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <div className="explore-datasets-title-container">
                    <h1 className="create-layer-popup-title">Train model</h1>

                    <div className="title-forms">

                        {datasetTypeShown == "my" && <select title="Sort by" className="explore-datasets-sort" value={sortDatasets} onChange={(e) => {
                                setSortDatasets(e.target.value)
                            }}>
                            <option value="downloads">Downloads</option>
                            <option value="elements">Elements</option>
                            <option value="labels">Labels</option>
                            <option value="alphabetical">Alphabetical</option>
                            <option value="date">Created</option>
                        </select>}
                        {datasetTypeShown == "saved" && <select title="Sort by" className="explore-datasets-sort" value={sortSavedDatasets} onChange={(e) => {
                                setSortSavedDatasets(e.target.value)
                            }}>
                            <option value="downloads">Downloads</option>
                            <option value="elements">Elements</option>
                            <option value="labels">Labels</option>
                            <option value="alphabetical">Alphabetical</option>
                            <option value="date">Created</option>
                        </select>}
                        
                        {datasetTypeShown == "my" && <div className="explore-datasets-search-container">
                            <input title="Will search names and keywords." type="text" className="explore-datasets-search" value={search} placeholder="Search datasets" onChange={(e) => {
                                    setLoading(true)
                                    setSearch(e.target.value)
                            }} /> 
                            <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} />
                        </div>}
                        {datasetTypeShown == "saved" && <div className="explore-datasets-search-container">
                            <input title="Will search names and keywords." type="text" className="explore-datasets-search" value={searchSaved} placeholder="Search datasets" onChange={(e) => {
                                    setLoading(true)
                                    setSearchSaved(e.target.value)
                            }} /> 
                            <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} />
                        </div>}
                    </div>
                </div>
                
                <p className="create-layer-popup-description">
                    You can train the model on your own datasets, prebuilt TensorFlow datasets, as well as any public datasets you've saved.
                    Warnings will appear when attempting to train on invalid datasets. Make sure that the input dimensions match the dataset.
                    Note that only labelled elements in the dataset will be trained on, and that training currently only supports classification datasets.
                    Validation will be ignored if the dataset contains too few elements for given split size.
                    <br></br>
                    <br></br>
                    Be aware that training on TensorFlow datasets generally takes longer than training on Dalinar datasets.
                </p>

                <div className="train-model-row">
                    <div className="train-model-dataset-type-container">
                        <div className={"train-model-dataset-type-left train-model-dataset-type " + (datasetTypeShown == "my" ? "train-model-dataset-type-selected" : "")}
                        onClick={() => setDatasetTypeShown("my")}>My datasets</div>
                        <div className={"train-model-dataset-type-right train-model-dataset-type " + (datasetTypeShown == "saved" ? "train-model-dataset-type-selected" : "")}
                        onClick={() => setDatasetTypeShown("saved")}>Saved datasets</div>
                    </div>

                    <div className="train-model-epochs-container">
                        <label className="train-model-epochs-label">Epochs</label>
                        <input type="number" className="train-model-inp" value={epochs} onChange={(e) => {
                            let intEpochs = Math.round(e.target.value)
                            if (e.target.value) {
                                setEpochs(Math.max(0, Math.min(intEpochs, 1000)))
                            } else {
                                setEpochs("")
                            }
                            
                        }}></input>
                    </div>

                    <div className="train-model-validation-container">
                        <label className="train-model-epochs-label">Validation split</label>
                        <input type="number" className="train-model-inp" step="0.01" value={validationSplit} onChange={(e) => {
                            let roundedSplit = Math.round(e.target.value * 100) / 100
                            if (e.target.value) {
                                console.log(e.target.value)
                                setValidationSplit(Math.max(0, Math.min(roundedSplit, 1)))
                            } else {
                                setValidationSplit("")
                            }
                        }}></input>
                        
                    </div>
                </div>
                

                {datasetTypeShown == "my" && <div className="my-datasets-container train-datasets-container" style={{padding: 0}}>
                    <div className="dataset-element no-margin tensorflow-dataset-element">
                        <div className="dataset-element-header">
                            <img title="TensorFlow datasets" className="dataset-element-icon dataset-element-icon-type" src={BACKEND_URL + "/static/images/tensorflowWhite.png"}/>
                        
                            <div className="dataset-element-name" title="TensorFlow Datasets">
                                <p className="dataset-element-name-inner">TensorFlow</p>
                            </div>

                            <span className="dataset-element-icon-empty"></span>
                        </div>

                        <div className="tensorflow-dataset-container">
                            <select className="tensorflow-dataset-select" value={tensorflowDataset} onChange={(e) => {
                                setTensorflowDataset(e.target.value)
                            }}>
                                
                                {model_type.toLowerCase() == "image" && <option value="cifar10">cifar10</option>}
                                {model_type.toLowerCase() == "image" && <option value="cifar100">cifar100</option>}
                                {model_type.toLowerCase() == "image" && <option value="mnist">mnist</option>}
                                {model_type.toLowerCase() == "image" && <option value="fashion_mnist">fashion_mnist</option>}

                                {model_type.toLowerCase() == "text" && <option value="imdb">imdb</option>}
                            </select>

                            <button className="tensorflow-dataset-train-button" onClick={() => {
                                tensorflowDatasetOnClick()
                            }}>Train</button>
                            <button className="tensorflow-dataset-train-button tensorflow-dataset-more-info" onClick={() => {
                                const URL = "https://www.tensorflow.org/api_docs/python/tf/keras/datasets"
                                var win = window.open(URL, '_blank');
                                win.focus();
                            }}>
                                More info
                                <img className="tensorflow-dataset-external" src={BACKEND_URL + "/static/images/external.png"}/>
                            </button>
                        </div>
      
                    </div>
                    {datasets.map((dataset) => (
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
                    {!loading && datasets.length == 0 && search.length > 0 && <p className="gray-text">No such datasets found.</p>}
                    {loading && datasets.length == 0 && currentProfile.datasetsCount > 0 && [...Array(currentProfile.datasetsCount)].map((e, i) => (
                        <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true} isTraining={true}/>
                    ))}
                </div>}

                {savedDatasets && datasetTypeShown == "saved" && <div className="my-datasets-container train-datasets-container" style={{padding: 0}}>
                    {savedDatasets.map((dataset) => (
                        (((dataset.dataset_type.toLowerCase() == model_type)) ? <div title={(dataset.datatype == "classification" ? "Train on this dataset": "Area datasets not supported.")} key={dataset.id} onClick={() => {
                            if (dataset.datatype == "classification") {
                                datasetOnClick(dataset)
                            } else {
                                notification("Training on area datasets is not yet supported.", "failure")
                            }
                        }}
                        className="dataset-element-training-outer">
                            <DatasetElement dataset={dataset} BACKEND_URL={BACKEND_URL} isPublic={true} isTraining={true} isDeactivated={dataset.datatype != "classification"}/>
                        </div> : "")
                    ))}
                    {!loading && currentProfile && savedDatasets.length == 0 && searchSaved.length == 0 && <p>You don't have any saved datasets.</p>}
                    {!loading && currentProfile && savedDatasets.length == 0 && searchSaved.length > 0 && <p className="gray-text">No such saved datasets found.</p>}
                    {loading && currentProfile && savedDatasets.length == 0 && currentProfile.saved_datasets && currentProfile.saved_datasets.length > 0 && currentProfile.saved_datasets.map((e, i) => (
                        <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true} isTraining={true}/>
                    ))}
                </div>}
                
            </div>

        </div>
    )
}


export default TrainModelPopup