import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function ProfileBar({currentProfile, setShowProfileBar, BACKEND_URL}) {
    const navigate = useNavigate()

    return (<div className="profile-bar-container" onClick={(e) => {
        setShowProfileBar(false)
    }}>
        <div className="profile-bar" onClick={(e) => e.stopPropagation()}>
            <div className="profile-bar-title">
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/profile.svg"} />
                {currentProfile.name}
            </div>
            <div className="profile-bar-row" onClick={() => {
                setShowProfileBar(false)
                navigate("/home")
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/databaseGray.svg"} />
                Your datasets
            </div>
            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/home?start=models"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/modelGray.svg"} />
                Your models
            </div>
            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/home?start=saved"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/starGray.svg"} />
                Saved
            </div>

            <div className="profile-bar-line" style={{marginTop: "auto"}}></div>

            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/accounts/logout/"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/logout.webp"} />
                Sign out
            </div>
        </div>
    </div>)
}

export default ProfileBar
