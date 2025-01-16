import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import { useNavigate } from "react-router-dom"
import axios from 'axios'

function Explore() {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])

    const [sort, setSort] = useState("downloads")
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

        }).catch((err) => {
            alert("An error occured while loading your datasets.")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })

    }

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
                    
                    <input type="text" className="explore-datasets-search" value={search} placeholder="Search datasets" onChange={(e) => {
                            setSearch(e.target.value)
                    }} /> 


                    
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