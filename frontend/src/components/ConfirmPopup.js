import React from "react"

function ConfirmPopup({setShowConfirmPopup, message}) {

    return (
        <div className="popup" onClick={() => setShowAccountPopup(false)}>
            <div className="confirm-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <p className="confirm-popup-message">{message}</p>

                <div className="confirm-popup-buttons">
                    <button className="confirm-popup-cancel">Cancel</button>

                    <button className="confirm-popup-confirm">Confirm</button>
                </div>
                
            </div>
        </div>
    )
}


export default ConfirmPopup