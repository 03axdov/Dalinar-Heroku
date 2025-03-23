import React, { useState, useEffect, useRef } from "react"
import DatasetElement from "../components/DatasetElement"
import ModelElement from "../components/ModelElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from 'axios'

function Explore({checkLoggedIn, BACKEND_URL, notification}) {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams();
    const startParam = searchParams.get("start"); // Get the 'start' param

    const [datasets, setDatasets] = useState([])
    const [models, setModels] = useState([])

    const [loading, setLoading] = useState(true)
    const [loadingModels, setLoadingModels] = useState(true)

    const [typeShown, setTypeShown] = useState(startParam == "models" ? "models" : "datasets") // Either "datasets" or "models"

    const [sortDatasets, setSortDatasets] = useState("downloads")
    const [sortModels, setSortModels] = useState("downloads")

    const [search, setSearch] = useState("")
    const [searchModels, setSearchModels] = useState("")

    const [showImage, setShowImage] = useState(true)
    const [showText, setShowText] = useState(true)

    const [showBuilt, setShowBuilt] = useState(true)
    const [showNotBuilt, setShowNotBuilt] = useState(true)

    const [showDatasetType, setShowDatasetType] = useState(false)
    const [showModelType, setShowModelType] = useState(false)

    useEffect(() => {
        getDatasets()
        getModels()
    }, [])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + (search ? "?search=" + search : ""),
        })
        .then((res) => {
            if (res.data) {
                setDatasets(sort_datasets(res.data))
            } else {
                setDatasets([])
            }

        }).catch((err) => {
            alert("An error occured while loading your datasets.")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })

    }

    const getModels = () => {
        setLoadingModels(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/models/' + (searchModels ? "?search=" + searchModels : ""),
        })
        .then((res) => {
            if (res.data) {
                setModels(sort_models(res.data))
            } else {
                setModels([])
            }

        }).catch((err) => {
            notification("An error occured while loading your models.", "failure")
            console.log(err)
        }).finally(() => {
            setLoadingModels(false)
        })

    }
    
    function sort_models(ms) {
        let tempModels = [...ms]

        
        tempModels.sort((m1, m2) => {
            if (sortModels == "downloads") {
                if (m1.downloaders.length != m2.downloaders.length) {
                    return m2.downloaders.length - m1.downloaders.length
                } else {
                    return m1.name.localeCompare(m2.name)
                }

            } else if (sortModels == "alphabetical") {
                return m1.name.localeCompare(m2.name)

            } else if (sortModels == "layers") {
                if (m1.layers.length != m2.layers.length) {
                    return m2.layers.length - m1.layers.length
                } else {
                    return m1.name.localeCompare(m2.name)
                }
            }
        })

        return tempModels
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

    useEffect(() => {
        if (!loading) {
            setDatasets(sort_datasets(datasets))
        }
    }, [sortDatasets])

    useEffect(() => {
        if (!loadingModels) {
            setModels(sort_models(models))
        }
    }, [sortModels])


    // Search input timing
    const firstSearch = useRef(true)
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

    const firstModelSearch = useRef(true)
        // Search input timing
        useEffect(() => {
            if (firstModelSearch.current) {
                firstModelSearch.current = false; // Set to false after first render
                return;
            }
            // Set a timeout to update debounced value after 500ms
            const handler = setTimeout(() => {
                getModels()
            }, 350);
        
            // Cleanup the timeout if inputValue changes before delay
            return () => {
                clearTimeout(handler);
            };
    }, [searchModels]);


    return <div className="explore-container" onClick={() => {
        setShowDatasetType(false)
        setShowModelType(false)
    }}>
        <div className="home-sidebar">
            <button className="sidebar-button" onClick={() => {
                checkLoggedIn("/create-dataset")
            }}>+ Create dataset</button>
            <button title="Work in progress" className="sidebar-button create-model" onClick={() => {
                checkLoggedIn("/create-model")
            }}>+ Create model</button>
            
            <div className="sidebar-types-container">
                <div className={"sidebar-types-element " + (typeShown == "datasets" ? "sidebar-types-element-selected" : "")}
                onClick={() => {
                    setSearchParams({start: "datasets"})
                    setTypeShown("datasets")
                }}>
                    <img className="sidebar-types-element-icon" src={BACKEND_URL + "/static/images/database.svg"} />Datasets
                </div>
                <div className={"sidebar-types-element " + (typeShown == "models" ? "sidebar-types-element-selected" : "")}
                onClick={() => {
                    setSearchParams({start: "models"})
                    setTypeShown("models")
                }}> 
                    <img className="sidebar-types-element-icon" src={BACKEND_URL + "/static/images/model.svg"} />Models
                </div>
            </div>

        </div>
        <div className="explore-non-sidebar">
            {typeShown == "datasets" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="explore-datasets-title">Public Datasets</h2>

                    <div className="title-forms">

                        <div className="dataset-type-options-container" onClick={(e) => {
                            e.stopPropagation()
                        }}>
                            <button className="dataset-type-options-button" onClick={(e) => {
                                
                                setShowDatasetType(!showDatasetType)
                            }}>
                                Types<img className="dataset-type-options-icon" src={BACKEND_URL + "/static/images/down.svg"}/>
                            </button>
                            
                            {showDatasetType && <div className="dataset-type-options">
                                <div className="explore-datasets-type">
                                    <input className="explore-datasets-checkbox" type="checkbox" id="image" checked={showImage} onChange={() => {
                                        setShowImage(!showImage)
                                    }}/>
                                    <label htmlFor="image" className="explore-label">Image</label>
                                </div>
                                
                                <div className="explore-datasets-type no-margin"> 
                                    <input className="explore-datasets-checkbox" type="checkbox" id="text" checked={showText} onChange={() => {
                                        setShowText(!showText)
                                    }}/> 
                                    <label htmlFor="text" className="explore-label">Text</label>
                                </div>
                            </div>}
                        </div>

                        <select title="Sort by" className="explore-datasets-sort" value={sortDatasets} onChange={(e) => {
                            setSortDatasets(e.target.value)
                        }}>
                            <option value="downloads">Downloads</option>
                            <option value="elements">Elements</option>
                            <option value="labels">Labels</option>
                            <option value="alphabetical">Alphabetical</option>
                            <option value="date">Created</option>
                        </select>
                        
                        <div className="explore-datasets-search-container">
                            <input title="Will search names and keywords." type="text" className="explore-datasets-search" value={search} placeholder="Search datasets" onChange={(e) => {
                                    setLoading(true)
                                    setSearch(e.target.value)
                            }} /> 
                            <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} />
                        </div>
                    </div>
                    

                    
                </div>
                
                <div className="my-datasets-container">
                    {datasets.map((dataset) => (
                        ((dataset.dataset_type.toLowerCase() == "image" ? showImage : showText) ? <DatasetElement dataset={dataset} key={dataset.id} isPublic={true} BACKEND_URL={BACKEND_URL}/> : "")
                    ))}

                    {loading && datasets.length == 0 && [...Array(4)].map((e, i) => (
                        <DatasetElementLoading key={i} isPublic={true} BACKEND_URL={BACKEND_URL}/>
                    ))}
                    {!loading && datasets.length == 0 && search.length > 0 && <p className="gray-text">No such datasets found.</p>}
                </div>
                
            </div>}

            {typeShown == "models" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">Public Models</h2>

                    <div className="title-forms">

                        <div className="dataset-type-options-container" onClick={(e) => {
                            e.stopPropagation()
                        }}>
                            <button className="dataset-type-options-button" onClick={(e) => {
                                
                                setShowModelType(!showModelType)
                            }}>
                                Types<img className="dataset-type-options-icon" src={BACKEND_URL + "/static/images/down.svg"}/>
                            </button>
                            
                            {showModelType && <div className="model-type-options">
                                <div className="explore-datasets-type">
                                    <input className="explore-datasets-checkbox" type="checkbox" id="built" checked={showBuilt} onChange={() => {
                                        setShowBuilt(!showBuilt)
                                    }}/>
                                    <label htmlFor="built" className="explore-label">Built</label>
                                </div>
                                
                                <div className="explore-datasets-type no-margin"> 
                                    <input className="explore-datasets-checkbox" type="checkbox" id="not-built" checked={showNotBuilt} onChange={() => {
                                        setShowNotBuilt(!showNotBuilt)
                                    }}/> 
                                    <label htmlFor="not-built" className="explore-label">Not built</label>
                                </div>
                            </div>}
                        </div>

                        <select title="Sort by" className="explore-datasets-sort" value={sortModels} onChange={(e) => {
                                setSortModels(e.target.value)
                            }}>
                            <option value="downloads">Downloads</option>
                            <option value="alphabetical">Alphabetical</option>
                            <option value="layers">Layers</option>
                        </select>
                        
                        <div className="explore-datasets-search-container">
                            <input title="Will search names." type="text" className="explore-datasets-search" value={searchModels} placeholder="Search models" onChange={(e) => {
                                    setLoadingModels(true)
                                    setSearchModels(e.target.value)
                            }} /> 
                            <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} />
                        </div>
                    </div>
                </div>
                
                <div className="my-datasets-container">
                    {models.map((model) => (
                       ((model.model_file ? showBuilt : showNotBuilt) ? <ModelElement model={model} key={model.id} BACKEND_URL={BACKEND_URL} isPublic={true}/> : "")
                    ))}
                    {!loadingModels && models.length == 0 && searchModels.length > 0 && <p className="gray-text">No such models found.</p>}
                    {loadingModels && models.length == 0 && [...Array(4)].map((e, i) => (
                        <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                </div>
                
            </div>}
        </div>
        

        
    </div>
}

export default Explore