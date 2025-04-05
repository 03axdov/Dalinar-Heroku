import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function ProfileBar({currentProfile, setShowProfileBar, BACKEND_URL}) {
    const navigate = useNavigate()

    console.log(currentProfile)

    return (<div className="profile-bar-container" onClick={(e) => {
        setShowProfileBar(false)
    }}>
        <div className="profile-bar" onClick={(e) => e.stopPropagation()}>
            <div className="profile-bar-title">
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/profile.svg"} />
                {currentProfile.name}
            </div>

            <div className="profile-bar-row" style={{marginTop: "auto"}} onClick={() => {
                window.location.href = window.location.origin + "/accounts/logout/"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/logout.webp"} />
                Sign out
            </div>
        </div>
    </div>)
}

export default ProfileBar
