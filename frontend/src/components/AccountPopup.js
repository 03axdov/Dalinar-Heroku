import React from "react"

function AccountPopup({setShowAccountPopup}) {

    return (
        <div className="popup" onClick={() => setShowAccountPopup(false)}>
            <div className="account-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>

            </div>
        </div>
    )
}


export default AccountPopup