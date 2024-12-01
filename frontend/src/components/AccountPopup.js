import React from "react"

function AccountPopup({setShowAccountPopup, message}) {

    return (
        <div className="popup" onClick={() => setShowAccountPopup(false)}>
            <div className="account-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <p className="account-popup-message">{message}</p>
                <button className="account-popup-button account-popup-login" onClick={() => {
                    window.location.href = window.location.origin + "/accounts/login/"
                }}>Sign in</button>

                <button className="account-popup-button account-popup-cancel" onClick={() => {
                    setShowAccountPopup(false)
                }}>Cancel</button>
            </div>
        </div>
    )
}


export default AccountPopup