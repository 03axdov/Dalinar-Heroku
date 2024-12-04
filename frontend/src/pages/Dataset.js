import React, {useEffect, useState} from "react"
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"

// The default page. Login not required.
function Dataset() {

    const { id } = useParams();
    const [dataset, setDataset] = useState(null)
    const [elements, setElements] = useState([])
    const [labels, setLabels] = useState([])

    const [elementsIndex, setElementsIndex] = useState(0)

    const [loading, setLoading] = useState(true)


    const navigate = useNavigate()

    useEffect(() => {
        getDataset()
    }, [])


    useEffect(() => {
        const handleKeyDown = (event) => {

            if (loading) {return};
            
            if (event.key === "ArrowDown" || event.key == "ArrowRight") {    
                setElementsIndex(Math.max(Math.min(elementsIndex + 1, elements.length - 1), 0))
            } else if (event.key === "ArrowUp" || event.key == "ArrowLeft") {
                setElementsIndex(Math.max(elementsIndex - 1, 0))  
            }
        };
    
        // Attach the event listener
        window.addEventListener("keydown", handleKeyDown);
    }, [loading, elements])


    function getDataset() {
        axios({
            method: 'GET',
            url: window.location.origin + '/api/datasets/' + id,
        })
        .then((res) => {
            setDataset(res.data)
            setElements(res.data.elements)
            setLabels(res.data.labels)

            setLoading(false)
        }).catch((err) => {
            navigate("/")
            alert("An error occured when loading dataset with id " + id + ".")

            console.log(err)
            setLoading(false)
        })
    }


    const IMAGE_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"])
    const TEXT_FILE_EXTENSIONS = new Set(["txt", "doc", "docx"])

    function getPreviewElement(element) {
        const extension = element.file.split(".").pop()
        
        if (IMAGE_FILE_EXTENSIONS.has(extension)) {
            return <img className="dataset-element-view-image" src={window.location.origin + element.file} />
        } else if (TEXT_FILE_EXTENSIONS.has(extension)) {
            return <p className="dataset-element-view-text"></p>
        } else {
            return <div className="extension-not-found">File of type .{extension} could not be rendered.</div>
        }
    }


    return (
        <div className="dataset-container">
            <div className="dataset-elements">
                <p className="dataset-sidebar-title">Elements</p>
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button">+ Upload files</button>
                </div>
                {elements.map((element, idx) => (
                    <div className={"dataset-sidebar-element " + (idx == elementsIndex ? "dataset-sidebar-element-selected" : "")} 
                    key={element.id} 
                    onClick={() => setElementsIndex(idx)}>{element.name}</div>
                ))}
            </div>

            <div className="dataset-main">
                {(elements.length == 0 && !loading) && <button type="button" className="dataset-upload-button">Upload files</button>}
                {elements.length != 0 && <div className="dataset-element-view-container">
                    {getPreviewElement(elements[elementsIndex])}
                </div>}
            </div>

            <div className="dataset-labels">
                <p className="dataset-sidebar-title">Labels</p>
                <div className="dataset-sidebar-button-container">
                    <button type="button" className="sidebar-button">+ Add label</button>
                </div>
                
                {labels.map((label) => (
                    <div className="dataset-sidebar-element" key={label.id} style={{color: (label.color ? label.color : "#ffffff")}}>{label.name}</div>
                ))}
            </div>
        </div>
    )

    
}

export default Dataset