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
        fetch("/api/datasets")
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                setDatasets(data)
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
        <h2>Create a Dataset</h2>
        <form>
            <label htmlFor="name">Name:</label>
            <br/>
            <input 
                type="text" 
                id="name" 
                name="name" 
                required 
                onChange={(e) => {setName(e.target.value)}} 
                value={name}
            />
            <label htmlFor="description">Description</label>
            <br />
            <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => {setDescription(e.target.value)}}
            ></textarea>
            <br />
            <input 
                type="submit" 
                value="Submit"
            />
        </form>
    </div>
}

export default Home