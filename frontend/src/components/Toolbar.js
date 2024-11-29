import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar({currentProfile, loadingCurrentProfile, setShowAccountPopup}) {
    const navigate = useNavigate()

    console.log(currentProfile)

    return (
        <nav id="toolbar">
            <img id="toolbar-logo" src="static/images/logoWhite.svg" onClick={() => navigate("/")}/>
            <p className="toolbar-text" onClick={() => navigate("/")}>Solutions</p>
            <p className="toolbar-text" onClick={() => {
                if (!loadingCurrentProfile && currentProfile.user !== "") {
                    console.log(currentProfile)
                    navigate("/home")
                } else if (!loadingCurrentProfile) {
                    setShowAccountPopup(true)
                }
                
            }}>Home</p>

            {!loadingCurrentProfile && currentProfile.user === "" &&
                <div className="toolbar-auth">
                    <p className="toolbar-text" onClick={() => {
                        window.location.href = window.location.origin + "/accounts/login/"
                    }}>Sign in</p>
                    <button className="toolbar-button toolbar-register" onClick={() => {
                        window.location.href = window.location.origin + "/accounts/signup/"
                    }}>Register</button>
                </div>
            }
            {!loadingCurrentProfile && currentProfile.user !== "" &&
                <div className="toolbar-auth">
                    <p className="toolbar-text" onClick={() => {
                        window.location.href = window.location.origin + "/accounts/logout/"
                    }}>Sign out</p>
                </div>
            }
            

        </nav>
    )
}

export default Toolbar
