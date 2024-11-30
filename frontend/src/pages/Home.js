import React, { useState, useEffect } from "react"
import DatasetElement from "../components/DatasetElement"

// This is the personal view. /home
function Home() {

    const [datasets, setDatasets] = useState([])
    const [description, setDescription] = useState("")
    const [name, setName] = useState("")

    useEffect(() => {
        getDatasets()
    }, [])

    const getDatasets = () => {
        fetch(window.location.origin + "/api/datasets")
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

    return <div>
        <div>
            <h2>Datasets</h2>
            {datasets.map((dataset) => (
                <DatasetElement dataset={dataset} key={dataset.id} />
            ))}
        </div>
        <button className="home-create-dataset">+ Create dataset</button>
        
    </div>
}

export default Home