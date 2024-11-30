import React from "react"
import {useNavigate} from "react-router-dom"


function CreateDataset() {

    const navigate = useNavigate()

    function formOnSubmit() {
        
    }

    return (
        <div className="create-dataset-container">
            <form className="create-dataset-form" onSubmit={formOnSubmit}>
                <h1 className="create-dataset-title">Create a dataset</h1>
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="name">Dataset name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" name="name" type="text" required/>
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="description">Description</label>
                    <input className="create-dataset-inp create-dataset-full-width" name="description" type="text"/>
                </div>

                <button type="submit" className="create-dataset-submit">Create dataset</button>
            
            </form>
        </div>
    )
}

export default CreateDataset