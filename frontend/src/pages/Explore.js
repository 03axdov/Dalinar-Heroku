import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import { useNavigate } from "react-router-dom"
import axios from 'axios'

function Explore() {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])

    const [sort, setSort] = useState("")
    const [search, setSearch] = useState("")

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
        <div className="explore-non-sidebar">
            <div>
                <div className="explore-datasets-title-container">
                    <h2 className="explore-datasets-title">Public Datasets</h2>

                    <select title="Sort by" className="explore-datasets-sort" value={sort} onChange={(e) => {
                        setSort(e.target.value)
                    }}>
                        <option value="downloads">Downloads</option>
                        <option value="alphabetical">Alphabetical</option>
                        <option value="date">Date</option>
                    </select>
                    
                    <div className="explore-datasets-search-container">
                        <input type="text" className="explore-datasets-search" value={search} placeholder="Search datasets" onChange={(e) => {
                                setSearch(e.target.value)
                        }} /> 
                        <img className="explore-datasets-search-icon" src={window.location.origin + "/static/images/search.png"} />
                    </div>
                    


                    
                </div>
                
                <div className="my-datasets-container">
                    {datasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} isPublic={true} />
                    ))}
                </div>
                
            </div>
        </div>
        

        
    </div>
}

export default Explore