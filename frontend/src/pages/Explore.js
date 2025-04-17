import React, { useState, useEffect, useRef } from "react"
import DatasetElement from "../components/DatasetElement"
import ModelElement from "../components/ModelElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from 'axios'
import ElementFilters from "../components/minor/ElementFilters"

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

    const [datasetShow, setDatasetShow] = useState("all")
    const [modelShow, setModelShow] = useState("all")
    const [modelShowType, setModelShowType] = useState("all")

    const [imageDimensions, setImageDimensions] = useState(["", ""])    // The one that is used

    useEffect(() => {
        getModels()
    }, [])

    useEffect(() => {
        getDatasets()
    }, [datasetShow, sortDatasets])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/?' + 
            "search=" + search +
            "&dataset_type=" + datasetShow +
            "&order_by=" + sortDatasets,
        })
        .then((res) => {
            if (res.data) {
                setDatasets(res.data)
            } else {
                setDatasets([])
            }

        }).catch((err) => {
            alert("An error occured while loading public datasets.")
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
            notification("An error occured while loading public models.", "failure")
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

    function modelShouldShow(model) {
        if (modelShowType == "all" || modelShowType == model.model_type.toLowerCase()) {
            if (modelShow == "all") return true
            if (modelShow == "built") return model.model_file != null
            if (modelShow == "not-built") return model.model_file == null
        }
        return false
    }

    const visibleModels = models.filter((model) => modelShouldShow(model));

    return <div className="explore-container">
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

                    <ElementFilters 
                        show={datasetShow}
                        setShow={setDatasetShow}
                        sort={sortDatasets}
                        setSort={setSortDatasets}
                        imageDimensions={imageDimensions}
                        setImageDimensions={setImageDimensions}
                        search={search}
                        setSearch={setSearch}
                        setLoading={setLoading}
                        BACKEND_URL={BACKEND_URL}
                    ></ElementFilters>
                       
                </div>
                
                <div className="my-datasets-container">
                    
                    {datasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                    
                    {!loading && datasets.length === 0 && <p className="gray-text">No such datasets found.</p>}

                    {loading && datasets.length === 0 && (
                        [...Array(4)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                        ))
                    )}
                </div>
                
            </div>}

            {typeShown == "models" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">Public Models</h2>

                    <ElementFilters 
                        show={modelShow}
                        setShow={setModelShow}
                        showModelType={modelShowType}
                        setShowModelType={setModelShowType}
                        isModel={true}
                        sort={sortModels}
                        setSort={setSortModels}
                        search={searchModels}
                        setSearch={setSearchModels}
                        setLoading={setLoadingModels}
                        BACKEND_URL={BACKEND_URL}
                    ></ElementFilters>

                </div>
                
                <div className="my-datasets-container">
                    {visibleModels.map((model) => (
                        <ModelElement model={model} key={model.id} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                    
                    {!loadingModels && visibleModels.length === 0 && models.length > 0 && <p className="gray-text">No such models found.</p>}

                    {!loadingModels && models.length === 0 && searchModels.length > 0 && (
                        <p className="gray-text">No such datasets found.</p>
                    )}

                    {loadingModels && models.length === 0 && (
                        [...Array(4)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                        ))
                    )}
                </div>
                
            </div>}
        </div>
        

        
    </div>
}

export default Explore