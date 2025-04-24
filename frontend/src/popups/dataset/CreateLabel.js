import React, { useState, useEffect } from "react"

function CreateLabel({setShowCreateLabel, createLabelSubmit, labelKeybinds,
                        inputOnFocus, inputOnBlur, loadingLabelCreate, 
                        getUserPressKeycode, notification, BACKEND_URL
}) {

    const [createLabelName, setCreateLabelName] = useState("")
    const [createLabelColor, setCreateLabelColor] = useState("#07E5E9")
    const [createLabelKeybind, setCreateLabelKeybind] = useState("")

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

        setCreateLabelKeybind(getUserPressKeycode(event));

    };

    return (
        <div className="dataset-bar-container" style={{justifyContent: "start"}} onClick={() => setShowCreateLabel(false)}>
            <div className={"dataset-create-label-container " + (animateIn ? "slide-in" : "")} 
                onClick={(e) => e.stopPropagation()}>
                <h1 className="create-layer-popup-title">Create label</h1>
                <p className="create-layer-popup-description">
                    Labels are used to identify different elements.
                    They can, for example, be types of objects such as airplanes, cats, and dogs.
                    An element can be labelled by clicking the label element or by pressing the keybind associated with a label.
                </p>

                <form className="dataset-create-label-form" onSubmit={(e) => {
                    e.preventDefault()
                    setCreateLabelName("")
                    setCreateLabelColor("#07E5E9")
                    setCreateLabelKeybind("")
                    createLabelSubmit(createLabelName, createLabelColor, createLabelKeybind)
                }}>

                    <div className="dataset-create-label-row" style={{marginTop: "40px"}}>
                        <label className="dataset-create-label-label" htmlFor="label-create-name-inp">Name</label>
                        <input id="label-create-name-inp" className="dataset-create-label-inp" type="text"
                            value={createLabelName} onChange={(e) => {
                            setCreateLabelName(e.target.value)
                        }} onFocus={inputOnFocus} onBlur={inputOnBlur} required/>
                    </div>
                    
                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="label-create-color-inp">Color</label>
                        <div className="create-label-color-container" style={{background: createLabelColor}}>
                            <input id="label-create-color-inp" className="dataset-create-label-color" type="color" required value={createLabelColor} onChange={(e) => {
                                setCreateLabelColor(e.target.value)
                            }} onFocus={inputOnFocus} onBlur={inputOnBlur}/>
                        </div>
                    </div>

                    <div className="dataset-create-label-row">
                        <label className="dataset-create-label-label" htmlFor="label-create-keybinding">Keybind</label>
                        <input
                            id="label-create-keybinding"
                            className="dataset-create-label-inp"
                            type="text"
                            value={createLabelKeybind}
                            onKeyDown={handleKeyDown}
                            placeholder="Press keys..."
                            onFocus={inputOnFocus} onBlur={inputOnBlur}
                            readOnly
                        />
                    </div>

                    <div className="create-layer-popup-buttons">
                        <button type="button" className="create-layer-popup-cancel" onClick={() => setShowCreateLabel(false)}>Cancel</button>
                        <button type="submit" className="create-layer-popup-submit">
                            {loadingLabelCreate && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                            {(!loadingLabelCreate ? "Create label" : "Processing...")}
                        </button>
                    </div>
                    
                </form>
            </div>
        </div>
    )
}


export default CreateLabel