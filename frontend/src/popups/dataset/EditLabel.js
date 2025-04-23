import React, { useState, useEffect } from "react"

function EditLabel({setShowEditLabel, editingLabel, editLabelOnSubmit, labelKeybinds,
                        inputOnFocus, inputOnBlur, loadingLabelEdit, loadingLabelDelete,
                        getUserPressKeycode, notification, BACKEND_URL, deleteLabel
}) {

    const [editingLabelName, setEditingLabelName] = useState(editingLabel.name)
    const [editingLabelColor, setEditingLabelColor] = useState(editingLabel.color)
    const [editingLabelKeybind, setEditingLabelKeybind] = useState(editingLabel.keybind)

    const [animateIn, setAnimateIn] = useState(false)
    useEffect(() => {
            // Trigger animation on mount
            setAnimateIn(true)
    }, [])

    const INVALID_KEYBINDS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace", "Delete"])

    const handleKeyDown = (event, type="creating-label") => {
        event.preventDefault(); // Prevent default behavior
    
        if (INVALID_KEYBINDS.has(event.key)) {
            notification("This keybind is not allowed.", "failure")
            return;
        }
        if (labelKeybinds[event.key] != null) {
            notification("This keybind is already in use.", "failure")
            return;
        }

        setEditingLabelKeybind(getUserPressKeycode(event));

    };

    return (
        <div className="dataset-bar-container" onClick={() => setShowEditLabel(false)}>
            <div className={"dataset-create-label-container " + (animateIn ? "slide-in" : "")} 
                onClick={(e) => e.stopPropagation()}>
                <h1 className="create-layer-popup-title">Edit label</h1>
                <p className="create-layer-popup-description">
                    Labels are used to identify different elements.
                    They can, for example, be types of objects such as airplanes, cats, and dogs.
                    An element can be labelled by clicking the label element or by pressing the keybind associated with a label.
                </p>

                <form className="dataset-create-label-form" style={{marginTop: "40px"}} onSubmit={(e) => {
                    e.preventDefault()
                    editLabelOnSubmit(editingLabelName, editingLabelColor, editingLabelKeybind)
                }}>
                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="label-name-inp">Name</label>
                        <input id="label-name-inp" className="dataset-create-label-inp" type="text" placeholder="Name" value={editingLabelName} onChange={(e) => {
                            setEditingLabelName(e.target.value)
                        }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                    </div>
                    
                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="label-color-inp">Color</label>
                        <div className="create-label-color-container" style={{background: editingLabelColor}}>
                            <input id="label-color-inp" className="dataset-create-label-color" type="color" value={editingLabelColor} onChange={(e) => {
                                setEditingLabelColor(e.target.value)
                            }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                        </div>
                    </div>

                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="keybinding">Keybind</label>
                        <input
                            id="keybinding"
                            className="dataset-create-label-inp"
                            type="text"
                            value={editingLabelKeybind}
                            onKeyDown={(e) => {handleKeyDown(e, "editing-label")}}
                            placeholder="Press keys..."
                            onFocus={inputOnFocus} onBlur={inputOnBlur}
                            readOnly
                        />
                    </div>

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" style={{marginRight: "auto"}} onClick={() => setShowEditLabel(false)}>Cancel</button>
                        <button type="button" className="create-layer-popup-submit edit-label-delete" onClick={deleteLabel}>
                            {loadingLabelDelete && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!loadingLabelDelete ? "Delete label" : "Processing...")}
                        </button>
                        <button type="submit" className="create-layer-popup-submit">
                            {loadingLabelEdit && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!loadingLabelEdit ? "Save changes" : "Processing...")}
                        </button>
                    </div>
                    
                </form>
            </div>
        </div>
    )
}


export default EditLabel