import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import { useNavigate } from "react-router-dom"
import axios from 'axios'

function Explore() {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/',
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
        <div className="explore-sidebar">
            <button className="sidebar-button" onClick={() => {
                navigate("/create-dataset")
            }}>+ Create dataset</button>
        </div>
        <div className="explore-non-sidebar">
            <div>
                <h2 className="explore-datasets-title">Public Datasets</h2>
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