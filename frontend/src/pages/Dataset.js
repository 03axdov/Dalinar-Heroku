import React, {useEffect, useState} from "react"
import { useParams } from "react-router-dom";

// The default page. Login not required.
function Dataset() {

    const { name } = useParams();

    useEffect(() => {
        getDataset()
    }, [])

    function getDataset() {
        
    }

    return (
        <div className="dataset-container">
            
        </div>
    )
}

export default Dataset