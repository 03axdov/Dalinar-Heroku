import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import { useNavigate } from "react-router-dom"
import axios from 'axios'

// This is the personal view. /home
function Home({currentProfile}) {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])
    const [loading, setLoading] = useState(true)

    const [sort, setSort] = useState("downloads")
    const [search, setSearch] = useState("")

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/my-datasets/' + (search ? "?search=" + search : ""),
        })
        .then((res) => {
            console.log("GOT DATASETS")
            if (res.data) {
                setDatasets(sortDatasets(res.data))
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

    function sortDatasets(ds) {

        let tempDatasets = [...ds]

        
        tempDatasets.sort((d1, d2) => {
            if (sort == "downloads") {
                if (d1.downloaders.length != d2.downloaders.length) {
                    return d2.downloaders.length - d1.downloaders.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sort == "alphabetical") {
                return d1.name.localeCompare(d2.name)
            } else if (sort == "date") {
                return new Date(d2.created_at) - new Date(d1.created_at)
            } else if (sort == "elements") {
                if (d1.elements.length != d2.elements.length) {
                    return d2.elements.length - d1.elements.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sort == "labels") {
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
            setDatasets(sortDatasets(datasets))
        }
    }, [sort])


    // Search input timing
    useEffect(() => {
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


    return <div className="home-container">
        
        <div className="home-sidebar">
            <button className="sidebar-button" onClick={() => {
                navigate("/create-dataset")
            }}>+ Create dataset</button>

        </div>
        <div className="home-non-sidebar">
            <div>
                <div className="explore-datasets-title-container">
                    <h2 className="my-datasets-title">My Datasets</h2>
                    <select title="Sort by" className="explore-datasets-sort" value={sort} onChange={(e) => {
                            setSort(e.target.value)
                        }}>
                        <option value="downloads">Downloads</option>
                        <option value="elements">Elements</option>
                        <option value="labels">Labels</option>
                        <option value="alphabetical">Alphabetical</option>
                        <option value="date">Date</option>
                    </select>
                    
                    <div className="explore-datasets-search-container">
                        <input title="Will search names and keywords." type="text" className="explore-datasets-search" value={search} placeholder="Search datasets" onChange={(e) => {
                                setSearch(e.target.value)
                        }} /> 
                        <img className="explore-datasets-search-icon" src={window.location.origin + "/static/images/search.png"} />
                    </div>
                </div>
                
                <div className="my-datasets-container">
                    {datasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} />
                    ))}
                    {!loading && datasets.length == 0 && search.length == 0 && <p>You don't have any datasets. Click <span className="link" onClick={() => {
                        navigate("/create-dataset")
                    }}>here</span> to create one.</p>}
                    {!loading && datasets.length == 0 && search.length > 0 && <p className="gray-text">No such datasets found.</p>}
                    {loading && datasets.length == 0 && currentProfile.datasetsCount !== null && [...Array(currentProfile.datasetsCount)].map((e, i) => (
                        <DatasetElementLoading key={i}/>
                    ))}
                </div>
                
            </div>
        </div>
        

        
    </div>
}

export default Home