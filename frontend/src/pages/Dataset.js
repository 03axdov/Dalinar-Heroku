import React, {useEffect, useState} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Dataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])

    const navigate = useNavigate()

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
            setDataset(res.data["dataset"])
            setElements(res.data["elements"])

        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)
        })
    }

    return (
        <div className="dataset-container">
            <div className="dataset-elements">
                <p className="dataset-sidebar-title">Elements</p>
            </div>

            <div className="dataset-main">

            </div>

            <div className="dataset-labels">
                <p className="dataset-sidebar-title">Labels</p>
                <button type="button" className="sidebar-button">+ Add label</button>
            </div>
        </div>
    )

    
}

export default Dataset