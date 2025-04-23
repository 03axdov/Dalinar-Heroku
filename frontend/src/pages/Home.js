import React, { useState, useEffect, useRef, useCallback } from "react"
import DatasetElement from "../components/DatasetElement"
import ModelElement from "../components/ModelElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import ElementFilters from "../components/minor/ElementFilters"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from 'axios'
import { debounce } from 'lodash';
import TitleSetter from "../components/minor/TitleSetter"

// This is the personal view. /home
function Home({currentProfile, notification, BACKEND_URL, checkLoggedIn, is_explore=false}) {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams();
    const startParam = searchParams.get("start"); // Get the 'start' param
    const typeParam = searchParams.get("type"); // Get the 'start' param

    const [datasets, setDatasets] = useState([])
    const [savedDatasets, setSavedDatasets] = useState([])
    const [models, setModels] = useState([])
    const [savedModels, setSavedModels] = useState([])

    const [nextPageDatasets, setNextPageDatasets] = useState(null);
    const [nextPageModels, setNextPageModels] = useState(null)

    const [loading, setLoading] = useState(true)
    const [loadingModels, setLoadingModels] = useState(true)
    const [loadingSaved, setLoadingSaved] = useState(true)
    
    const [typeShown, setTypeShown] = useState(startParam ? startParam : "datasets") // Either "datasets" or "models"
    const [savedTypeShown, setSavedTypeShown] = useState(typeParam ? typeParam : "datasets")

    const [sortDatasets, setSortDatasets] = useState("downloads")
    const [sortModels, setSortModels] = useState("downloads")
    const [sortSavedDatasets, setSortSavedDatasets] = useState("downloads")
    const [sortSavedModels, setSortSavedModels] = useState("downloads")

    const [search, setSearch] = useState("")
    const [searchModels, setSearchModels] = useState("")
    const [searchSaved, setSearchSaved] = useState("")
    const [searchSavedModels, setSearchSavedModels] = useState("")

    const [datasetShow, setDatasetShow] = useState("all")
    const [modelShow, setModelShow] = useState("all")
    const [modelShowType, setModelShowType] = useState("all")

    const [imageDimensions, setImageDimensions] = useState(["", ""])

    useEffect(() => {
        getModels()
    }, [modelShow, modelShowType, sortModels])

    useEffect(() => {
        getDatasets()
    }, [datasetShow, sortDatasets, imageDimensions])

    useEffect(() => {
        if (is_explore) return;
        if (currentProfile && (currentProfile.saved_datasets || currentProfile.saved_models)) {
            setLoadingSaved(true)
            if (currentProfile.saved_datasets) {
                setSavedDatasets(sort_saved_datasets(currentProfile.saved_datasets))
            }
            if (currentProfile.saved_models) {
                setSavedModels(sort_saved_models(currentProfile.saved_models))
            }
            setLoadingSaved(false)
        }
        
    }, [currentProfile])

    const getDatasets = () => {
        setLoading(true)

        let URL = window.location.origin + "/api/" + (is_explore ? "datasets/?" : "my-datasets/?")
        URL += "search=" + search +
                "&dataset_type=" + datasetShow +
                "&order_by=" + sortDatasets

        if (datasetShow == "image") {
            URL += "&imageWidth=" + imageDimensions[0] +
                "&imageHeight=" + imageDimensions[1]
        }

        axios({
            method: 'GET',
            url: URL
        })
        .then((res) => {
            if (res.data) {
                console.log(res.data)
                setDatasets(res.data.results)
                setNextPageDatasets(res.data.next)
            } else {
                setDatasets([])
                setNextPageDatasets(null)
            }

        }).catch((err) => {
            notification("An error occured while loading your datasets.", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    const loadMoreDatasets = useCallback(debounce(() => {
        if (!nextPageDatasets || loading) return;
        setLoading(true);
        axios.get(nextPageDatasets)
            .then((res) => {
                if (res.data) {
                    setDatasets(prev => {
                        const combined = [...prev, ...res.data.results];

                        // Deduplicate based on dataset.id
                        const unique = Array.from(
                            new Map(combined.map(item => [item.id, item])).values()
                        );

                        return unique;
                    });
                    setNextPageDatasets(res.data.next);
                }
            })
            .catch(err => {
                notification("An error occurred while loading more datasets.", "failure");
            })
            .finally(() => setLoading(false));
    }, 500), [nextPageDatasets, loading]);

    const loaderRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextPageDatasets) {
                    loadMoreDatasets();
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [loaderRef.current, nextPageDatasets, loading]);

    const getModels = () => {
        setLoadingModels(true)

        const BASE_URL = window.location.origin + "/api/" + (is_explore ? "models/?" : "my-models/?")

        axios({
            method: 'GET',
            url: BASE_URL + 
            "search=" + searchModels +
            "&model_type=" + modelShowType +
            "&model_build_type=" + modelShow +
            "&order_by=" + sortModels,
        })
        .then((res) => {
            if (res.data) {
                setModels(res.data.results)
                setNextPageModels(res.data.next)
            } else {
                setModels([])
                setNextPageModels(null)
            }

        }).catch((err) => {
            notification("An error occured while loading your models.", "failure")
            console.log(err)
        }).finally(() => {
            setLoadingModels(false)
        })

    }

    const loadMoreModels = useCallback(debounce(() => {
        if (!nextPageModels || loadingModels) return;
        setLoadingModels(true);
        axios.get(nextPageModels)
            .then((res) => {
                if (res.data) {
                    setModels(prev => {
                        const combined = [...prev, ...res.data.results];

                        // Deduplicate based on dataset.id
                        const unique = Array.from(
                            new Map(combined.map(item => [item.id, item])).values()
                        );

                        return unique;
                    });
                    setNextPageModels(res.data.next);
                }
            })
            .catch(err => {
                notification("An error occurred while loading more datasets.", "failure");
            })
            .finally(() => setLoadingModels(false));
    }, 500), [nextPageModels, loadingModels]);

    const loaderRefModels = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextPageModels) {
                    loadMoreModels();
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRefModels.current) {
            observer.observe(loaderRefModels.current);
        }

        return () => {
            if (loaderRefModels.current) {
                observer.unobserve(loaderRefModels.current);
            }
        };
    }, [loaderRefModels.current, nextPageModels, loadingModels]);

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

    function sort_saved_models(ms) {
        let tempModels = [...ms]
        
        tempModels.sort((m1, m2) => {
            if (sortSavedModels == "downloads") {
                if (m1.downloaders.length != m2.downloaders.length) {
                    return m2.downloaders.length - m1.downloaders.length
                } else {
                    return m1.name.localeCompare(m2.name)
                }

            } else if (sortSavedModels == "alphabetical") {
                return m1.name.localeCompare(m2.name)

            } else if (sortSavedModels == "layers") {
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
        if (!loadingSaved) {
            setSavedDatasets(sort_saved_datasets(savedDatasets))
        }
    }, [sortSavedDatasets])

    useEffect(() => {
        if (!loadingSaved) {
            setSavedModels(sort_saved_models(savedModels))
        }
    }, [sortSavedModels])


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

    const firstSavedSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSavedSearch.current) {
            firstSavedSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoadingSaved(true)
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
            setLoadingSaved(false)
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [searchSaved]);

    const firstSavedModelSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSavedModelSearch.current) {
            firstSavedModelSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoadingSaved(true)
        const handler = setTimeout(() => {
            if (searchSavedModels.length > 0) {
                let temp = [...savedModels]
                temp = temp.filter((model) => {
                    return model.name.toLowerCase().startsWith(searchSavedModels.toLowerCase())
                })
                setSavedModels(sort_saved_models(temp))
            } else {
                setSavedModels(sort_saved_models(currentProfile.saved_models))
            }
            setLoadingSaved(false)
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [searchSavedModels]);

    function datasetShouldShow(dataset) {
        if (datasetShow == "all" || datasetShow == dataset.dataset_type.toLowerCase()) {
            if (datasetShow == "image") {
                if (imageDimensions[0] && imageDimensions[0] != dataset.imageWidth) {
                    return false
                }
                if (imageDimensions[1] && imageDimensions[1] != dataset.imageHeight) {
                    return false
                }
            }
            return true;
        }
        return false
    }

    function modelShouldShow(model) {
        if (modelShowType == "all" || modelShowType == model.model_type.toLowerCase()) {
            if (modelShow == "all") return true
            if (modelShow == "built") return model.model_file != null
            if (modelShow == "not-built") return model.model_file == null
        }
        return false
    }

    const visibleSavedDatasets = savedDatasets.filter((dataset) => datasetShouldShow(dataset));
    const visibleSavedModels = savedModels.filter((model) => modelShouldShow(model));

    return <div className="home-container">
        <TitleSetter title="Dalinar | Home" />

        <div className="home-sidebar">
            <button className="sidebar-button" onClick={() => {
                if (!is_explore) {
                    navigate("/create-dataset")
                } else {
                    checkLoggedIn("/create-dataset")
                }
                
            }}>+ Create dataset</button>
            <button title="Work in progress" className="sidebar-button create-model" onClick={() => {
                if (!is_explore) {
                    navigate("/create-model")
                } else {
                    checkLoggedIn("/create-model")
                }
                
            }}>+ Create model</button>

            <div className="sidebar-types-container">
                <div className={"sidebar-types-element " + (typeShown == "datasets" ? "sidebar-types-element-selected" : "")}
                onClick={() => {
                    setSearchParams({"start": "datasets"})
                    setTypeShown("datasets")
                }}>
                    <img className="sidebar-types-element-icon" src={BACKEND_URL + "/static/images/database.svg"} alt="Database" />Datasets
                </div>
                <div className={"sidebar-types-element " + (typeShown == "models" ? "sidebar-types-element-selected" : "")}
                onClick={() => {
                    setSearchParams({"start": "models"})
                    setTypeShown("models")
                }}>
                    <img className="sidebar-types-element-icon" src={BACKEND_URL + "/static/images/model.svg"} alt="Model" />Models
                </div>
                {!is_explore && <div className={"sidebar-types-element " + (typeShown == "saved" ? "sidebar-types-element-selected" : "")}
                onClick={() => {
                    setSearchParams({"start": "saved"})
                    setTypeShown("saved")
                }}>
                    <img className="sidebar-types-element-icon" src={BACKEND_URL + "/static/images/star.svg"} alt="Star" />Saved
                </div>}
            </div>
        </div>
        <div className="home-non-sidebar">
            {typeShown == "datasets" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">{is_explore ? "Public Datasets" : "My Datasets"}</h2>

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
                        <DatasetElement dataset={dataset} key={dataset.id} BACKEND_URL={BACKEND_URL} isPublic={is_explore}/>
                    ))}
                    
                    {!loading && !is_explore && datasets.length === 0 && currentProfile.datasetsCount > 0 && <p className="gray-text">No such datasets found.</p>}
                    {!loading && is_explore && datasets.length === 0 && <p className="gray-text">No such datasets found.</p>}

                    {!loading && !is_explore && currentProfile.datasetsCount == 0 && (
                        <p>You don't have any datasets. Click <span className="link" onClick={() => navigate("/create-dataset")}>here</span> to create one.</p>
                    )}

                    {loading && !is_explore && datasets.length === 0 && currentProfile.datasetsCount > 0 && (
                        [...Array(currentProfile.datasetsCount)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL}/>
                        ))
                    )}
                    {loading && is_explore && datasets.length === 0 && (
                        [...Array(4)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                        ))
                    )}

                    {nextPageDatasets && <div ref={loaderRef}><DatasetElementLoading BACKEND_URL={BACKEND_URL} isPublic={is_explore}></DatasetElementLoading></div>}
                </div>
                
            </div>}

            {typeShown == "models" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">
                        {is_explore ? "Public Models" : "My Models"}
                    </h2>

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

                    {models.map((model) => (
                        <ModelElement model={model} key={model.id} BACKEND_URL={BACKEND_URL} isPublic={is_explore}/>
                    ))}
                    
                    {!loadingModels && !is_explore && models.length === 0 && currentProfile.modelsCount > 0 && <p className="gray-text">No such models found.</p>}
                    {!loadingModels && is_explore && models.length === 0 && <p className="gray-text">No such models found.</p>}

                    {!loadingModels && !is_explore && models.length === 0 && currentProfile.modelsCount == 0 && (
                        <p>You don't have any models. Click <span className="link" onClick={() => navigate("/create-model")}>here</span> to create one.</p>
                    )}

                    {loadingModels && !is_explore && models.length === 0 && currentProfile.modelsCount > 0 && (
                        [...Array(currentProfile.modelsCount)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL}/>
                        ))
                    )}
                    {loadingModels && is_explore && models.length === 0 && (
                        [...Array(4)].map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                        ))
                    )}

                    {nextPageModels && <div ref={loaderRefModels}><DatasetElementLoading BACKEND_URL={BACKEND_URL} isPublic={is_explore}></DatasetElementLoading></div>}
                </div>
                
            </div>}

            {!is_explore && typeShown == "saved" && <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">Saved {savedTypeShown == "datasets" ? "Datasets" : "Models"}</h2>

                    {savedTypeShown == "datasets" && <ElementFilters 
                        show={datasetShow}
                        setShow={setDatasetShow}
                        sort={sortSavedDatasets}
                        setSort={setSortSavedDatasets}
                        imageDimensions={imageDimensions}
                        setImageDimensions={setImageDimensions}
                        search={searchSaved}
                        setSearch={setSearchSaved}
                        setLoading={setLoadingSaved}
                        BACKEND_URL={BACKEND_URL}
                        savedTypeShown={savedTypeShown}
                        setSavedTypeShown={setSavedTypeShown}
                        setSearchParams={setSearchParams}
                        startParam={startParam}
                    ></ElementFilters>}

                    {savedTypeShown == "models" && <ElementFilters 
                        show={modelShow}
                        setShow={setModelShow}
                        showModelType={modelShowType}
                        setShowModelType={setModelShowType}
                        isModel={true}
                        sort={sortSavedModels}
                        setSort={setSortSavedModels}
                        search={searchSavedModels}
                        setSearch={setSearchSavedModels}
                        setLoading={setLoadingSaved}
                        BACKEND_URL={BACKEND_URL}
                        savedTypeShown={savedTypeShown}
                        setSavedTypeShown={setSavedTypeShown}
                        setSearchParams={setSearchParams}
                        startParam={startParam}
                    ></ElementFilters>}

                </div>
                
                {savedTypeShown == "datasets" && savedDatasets && <div className="my-datasets-container">

                    {visibleSavedDatasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                    
                    {!loadingSaved && visibleSavedDatasets.length === 0 && savedDatasets.length > 0 && <p className="gray-text">No such saved datasets found.</p>}

                    {!loadingSaved && savedDatasets.length === 0 && searchSaved.length === 0 && (
                        <p>You don't have any saved datasets.</p>
                    )}

                    {!loadingSaved && savedDatasets.length === 0 && searchSaved.length > 0 && (
                        <p className="gray-text">No such saved datasets found.</p>
                    )}

                    {loadingSaved && savedDatasets.length === 0 && currentProfile.saved_datasets && currentProfile.saved_datasets.length > 0 && (
                        currentProfile.saved_datasets.map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL}/>
                        ))
                    )}

                </div>}

                {savedTypeShown == "models" && savedModels && <div className="my-datasets-container">
                    {visibleSavedModels.map((model) => (
                        <ModelElement model={model} key={model.id} BACKEND_URL={BACKEND_URL}/>
                    ))}
                    
                    {!loadingSaved && visibleSavedModels.length === 0 && savedModels.length > 0 && <p className="gray-text">No such saved models found.</p>}

                    {!loadingSaved && savedModels.length === 0 && searchSavedModels.length === 0 && (
                        <p>You don't have any saved models.</p>
                    )}

                    {!loadingSaved && savedModels.length === 0 && searchSavedModels.length > 0 && (
                        <p className="gray-text">No such saved models found.</p>
                    )}

                    {loadingSaved && savedModels.length === 0 && currentProfile.modelsCount > 0 && currentProfile.saved_models && currentProfile.saved_models.length > 0 && (
                        currentProfile.saved_models.map((e, i) => (
                            <DatasetElementLoading key={i} BACKEND_URL={BACKEND_URL}/>
                        ))
                    )}

                    
                </div>}
                
            </div>}
        </div>
        

        
    </div>
}

export default Home