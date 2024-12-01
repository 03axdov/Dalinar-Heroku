import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"
import { useNavigate } from "react-router-dom"

// This is the personal view. /home
function Home() {
    const navigate = useNavigate()

    const [datasets, setDatasets] = useState([])
    const [description, setDescription] = useState("")
    const [name, setName] = useState("")

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        fetch(window.location.origin + "/api/my-datasets")
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                setDatasets(data)
            } else {
                setDatasets([])
            }

        }).catch((err) => {
            console.log(err)
        })

    }

    return <div className="home-container">
        <div className="home-sidebar">
            <button className="home-create-dataset" onClick={() => {
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
                </div>
                
            </div>
        </div>
        

        
    </div>
}

export default Home