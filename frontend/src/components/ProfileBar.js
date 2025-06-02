import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function ProfileBar({currentProfile, setShowProfileBar, BACKEND_URL}) {
    const navigate = useNavigate()
    const [animateIn, setAnimateIn] = useState(false)

    useEffect(() => {
        // Trigger animation on mount
        setAnimateIn(true)
    }, [])

    return (<div className="profile-bar-container" onClick={(e) => {
        setShowProfileBar(false)
    }}>
        <div className={"profile-bar " + (animateIn ? "slide-in" : "")} onClick={(e) => e.stopPropagation()}>
            <div className="profile-bar-title">
                <img className="profile-bar-icon profile-bar-cross" onClick={() => setShowProfileBar(false)} src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" />
            </div>

            <div className="profile-bar-profile" title={"Signed in as " + currentProfile.name} onClick={() => {
                setShowProfileBar(false)
                navigate("/accounts/" + currentProfile.name)
            }}>
                {!currentProfile.image && <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/profile.svg"} alt="Profile" />}
                {currentProfile.image && <img className="profile-bar-icon-large" src={currentProfile.image} alt="Profile" />}
                {currentProfile.name}
            </div>

            <div className="profile-bar-line"></div>

            <div className="profile-bar-row" onClick={() => {
                setShowProfileBar(false)
                navigate("/home")
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/databaseGray.svg"} alt="Database" />
                Your datasets
            </div>
            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/home?start=models"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/modelGray.svg"} alt="Model" />
                Your models
            </div>
            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/home?start=saved"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/starGray.svg"} alt="Star" />
                Saved
            </div>

            <div className="profile-bar-line" style={{marginTop: "10px"}}></div>

            <div className="profile-bar-row" onClick={() => {
                setShowProfileBar(false)
                navigate("/create-dataset")
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/databaseGray.svg"} alt="Plus" />
                Create dataset
            </div>
            <div className="profile-bar-row" onClick={() => {
                setShowProfileBar(false)
                navigate("/create-model")
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/modelGray.svg"} alt="Plus" />
                Create model
            </div>

            <div className="profile-bar-line" style={{marginTop: "auto"}}></div>

            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/accounts/email/"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/email.svg"} alt="Email" />
                Email settings
            </div>

            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/accounts/password/change/"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/change-password.svg"} alt="Change password" />
                Change password
            </div>

            <div className="profile-bar-row" onClick={() => {
                window.location.href = window.location.origin + "/accounts/logout/"
            }}>
                <img className="profile-bar-icon" src={BACKEND_URL + "/static/images/logout.webp"} alt="Sign out" />
                Sign out
            </div>
        </div>
    </div>)
}

export default ProfileBar
