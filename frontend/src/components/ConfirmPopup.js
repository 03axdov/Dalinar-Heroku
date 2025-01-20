import React from "react"

function ConfirmPopup({setShowConfirmPopup, message, onConfirm}) {

    return (
        <div className="popup" onClick={() => setShowConfirmPopup(false)}>
            <div className="confirm-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <p className="confirm-popup-message">{message}</p>

                <div className="confirm-popup-buttons">
                    <button className="confirm-popup-cancel" onClick={() => setShowConfirmPopup(false)}>Cancel</button>

                    <button className="confirm-popup-confirm" onClick={() => {
                        onConfirm()
                        setShowConfirmPopup(false)
                    }}>Confirm</button>
                </div>
                
            </div>
        </div>
    )
}


export default ConfirmPopup