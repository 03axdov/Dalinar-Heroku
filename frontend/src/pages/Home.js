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

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/my-datasets/',
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

    return <div className="home-container">
        
        <div className="home-sidebar">
            <button className="sidebar-button" onClick={() => {
                navigate("/create-dataset")
            }}>+ Create dataset</button>

        </div>
        <div className="home-non-sidebar">
            <div>
                <h2 className="my-datasets-title">My Datasets</h2>
                <div className="my-datasets-container">
                    {datasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} />
                    ))}
                    {!loading && datasets.length == 0 && <p>You don't have any datasets. Click <span className="link" onClick={() => {
                        navigate("/create-dataset")
                    }}>here</span> to create one.</p>}
                    {loading && currentProfile.datasetsCount !== null && [...Array(currentProfile.datasetsCount)].map((e, i) => (
                        <DatasetElementLoading key={i}/>
                    ))}
                </div>
                
            </div>
        </div>
        

        
    </div>
}

export default Home