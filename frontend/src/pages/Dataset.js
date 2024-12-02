import React, {useEffect, useState} from "react"
import { useParams } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Dataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])

    useEffect(() => {
        getDataset()
    }, [])

    function getDataset() {
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + id,
        })
        .then((res) => {
            console.log(res.data)
            setDataset(res.data)
        }).catch((err) => {
            alert("An error occured when loading dataset with id " + id + ".")
            console.log(err)
        })
    }

    if (dataset) {
        return (
            <div className="dataset-container">
                
            </div>
        )
    } else {
        return
    }
    
}

export default Dataset