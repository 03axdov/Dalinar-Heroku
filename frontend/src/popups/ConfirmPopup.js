import React from "react"

function ConfirmPopup({setShowConfirmPopup, message, onConfirm, color}) {

    return (
        <div className="popup confirm-popup" onClick={() => setShowConfirmPopup(false)}>
            <div className="confirm-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <p className="confirm-popup-message">{message}</p>

                <div className="confirm-popup-buttons">
                    <button className={"confirm-popup-confirm confirm-popup-confirm-" + color} onClick={() => {
                        onConfirm()
                        setShowConfirmPopup(false)
                    }}>Confirm</button>

                    <button className="confirm-popup-cancel" onClick={() => setShowConfirmPopup(false)}>Cancel</button>
                </div>
                
            </div>
        </div>
    )
}


export default ConfirmPopup