import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import { useNavigate } from "react-router-dom"
import axios from 'axios'

function Explore({checkLoggedIn}) {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])

    const [sort, setSort] = useState("")
    const [search, setSearch] = useState("")
    const [showClassification, setShowClassification] = useState(true)
    const [showArea, setShowArea] = useState(true)

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + (search ? "?search=" + search : ""),
        })
        .then((res) => {
            if (res.data) {
                setDatasets(res.data)
            } else {
                setDatasets([])
            }
            if (!sort) {
                setSort("downloads")
            }

        }).catch((err) => {
            alert("An error occured while loading your datasets.")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })

    }

    useEffect(() => {
        if (datasets.length) {
            let tempDatasets = [...datasets]

            console.log(sort)
            tempDatasets.sort((d1, d2) => {
                if (sort == "downloads") {
                    return d2.downloaders.length - d1.downloaders.length
                } else if (sort == "alphabetical") {
                    return d1.name.localeCompare(d2.name)
                } else if (sort == "date") {
                    return new Date(d2.created_at) - new Date(d1.created_at)
                } else if (sort == "elements") {
                    return d2.elements.length - d1.elements.length
                } else if (sort == "labels") {
                    return d2.labels.length - d1.labels.length
                }
            })
    
            setDatasets(tempDatasets)
        }
        
    }, [sort])


    // Search input timing
    useEffect(() => {
        // Set a timeout to update debounced value after 500ms
        const handler = setTimeout(() => {
          getDatasets()
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
          clearTimeout(handler);
        };
      }, [search]);


    return <div className="explore-container">
        <div className="home-sidebar">
            <button className="sidebar-button" onClick={() => {
                checkLoggedIn("/create-dataset")
            }}>+ Create dataset</button>

            <div className="explore-datasets-types-container">
                <div className="explore-datasets-type">
                    <input className="explore-datasets-checkbox" type="checkbox" id="classification" name="classification" checked={showClassification} onChange={() => {
                        setShowClassification(!showClassification)
                    }}/>
                    <label htmlFor="classification" className="explore-label">Classification</label>
                </div>
                
                <div className="explore-datasets-type no-margin"> 
                    <input className="explore-datasets-checkbox" type="checkbox" id="area" name="area" checked={showArea} onChange={() => {
                        setShowArea(!showArea)
                    }}/> 
                    <label htmlFor="area" className="explore-label">Area</label>
                </div>
                       
            </div>
            
        </div>
        <div className="explore-non-sidebar">
            <div>
                <div className="explore-datasets-title-container">
                    <h2 className="explore-datasets-title">Public Datasets</h2>

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
                        ((dataset.datatype == "classification" ? showClassification : showArea) ? <DatasetElement dataset={dataset} key={dataset.id} isPublic={true} /> : "")
                    ))}

                    {loading && datasets.length == 0 && [...Array(4)].map((e, i) => (
                        <DatasetElementLoading key={i} isPublic={true}/>
                    ))}
                </div>
                
            </div>
        </div>
        

        
    </div>
}

export default Explore