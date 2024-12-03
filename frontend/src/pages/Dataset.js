import React, {useEffect, useState} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Dataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])
    const [labels, setLabels] = useState([])

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
            setDataset(res.data)
            setElements(res.data.elements)
            setLabels(res.data.labels)

        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)
        })
    }

    console.log(elements)

    return (
        <div className="dataset-container">
            <div className="dataset-elements">
                <p className="dataset-sidebar-title">Elements</p>
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button">+ Upload files</button>
                </div>
                {elements.map((element) => (
                    <div className="dataset-sidebar-element" key={element.id}>{element.name}</div>
                ))}
            </div>

            <div className="dataset-main">
                {elements.length == 0 && <button type="button" className="dataset-upload-button">Upload files</button>}
            </div>

            <div className="dataset-labels">
                <p className="dataset-sidebar-title">Labels</p>
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button">+ Add label</button>
                </div>
                
                {labels.map((label) => (
                    <div className="dataset-sidebar-element" key={label.id}>{label.name}</div>
                ))}
            </div>
        </div>
    )

    
}

export default Dataset