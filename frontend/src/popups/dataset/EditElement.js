import React, { useState, useEffect } from "react"

function EditElement({setEditingElement, editingElementNameOriginal, editingElementIndexOriginal, updateElement,
                        loadingElementEdit, loadingElementDelete, deleteElement,
                        inputOnFocus, inputOnBlur, BACKEND_URL
}) {

    const [editingElementName, setEditingElementName] = useState(editingElementNameOriginal)
    const [editingElementIndex, setEditingElementIndex] = useState(editingElementIndexOriginal)

    const [animateIn, setAnimateIn] = useState(false)
    useEffect(() => {
            // Trigger animation on mount
            setAnimateIn(true)
    }, [])

    return (
        <div className="dataset-bar-container" onClick={() => setEditingElement(null)}>
            <div className={"dataset-edit-element-container " + (animateIn ? "slide-in" : "")} 
                onClick={(e) => e.stopPropagation()}>
                <h1 className="create-layer-popup-title">Edit element</h1>
                <p className="create-layer-popup-description">
                    Elements represent files, such as image, and can be assigned labels.
                    You can identify elements by their names, and also see assigned labels in the sidebar to the left.
                </p>

                <form className="dataset-edit-element-form" style={{marginTop: "40px"}} onSubmit={(e) => {
                        updateElement(e, editingElementName, (editingElementIndex === "" ? editingElementIndexOriginal : editingElementIndex))
                    }}>
                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="element-name-inp">Name</label>
                        <input id="element-name-inp" className="dataset-create-label-inp" type="text" value={editingElementName} onChange={(e) => {
                            setEditingElementName(e.target.value)
                        }} onClick={(e) => {
                            e.stopPropagation()
                        }} onFocus={inputOnFocus} onBlur={() => {
                            inputOnBlur()
                        }}></input>
                    </div>

                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="element-name-inp">Element index</label>
                        <input id="element-name-inp" className="dataset-create-label-inp" type="number" 
                        placeholder={editingElementIndexOriginal} 
                        value={editingElementIndex} 
                        onChange={(e) => {
                            setEditingElementIndex(e.target.value)
                        }} 
                        onClick={(e) => {
                            e.stopPropagation()
                        }} 
                        onFocus={inputOnFocus} onBlur={() => {
                            inputOnBlur()
                        }}
                        style={{width: "100px"}}></input>
                    </div>

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" style={{marginRight: "auto"}} onClick={() => setEditingElement(null)}>Cancel</button>
                        <button type="button" className="create-layer-popup-submit edit-label-delete" onClick={deleteElement}>
                            {loadingElementDelete && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!loadingElementDelete ? "Delete element" : "Processing...")}
                        </button>
                        <button type="submit" className="create-layer-popup-submit">
                            {loadingElementEdit && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!loadingElementEdit ? "Save changes" : "Processing...")}
                        </button>
                    </div>
                </form>     
            </div>
        </div>
    )
}


export default EditElement