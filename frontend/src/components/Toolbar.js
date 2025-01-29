import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar({currentProfile, loadingCurrentProfile, checkLoggedIn}) {
    const navigate = useNavigate()

    function externalLink(link) {
        const URL = window.location.origin + link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    console.log(window.location.pathname)

    return (
        <nav id="toolbar">
            <img id="toolbar-logo" src={window.location.origin + "/static/images/logoWhite.svg"} onClick={() => navigate("/")}/>
            <p className="toolbar-text toolbar-title" onClick={() => navigate("/")}>Dalinar</p>

            <p className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "home" ? "toolbar-text-activated" : "")} onClick={() => {
                checkLoggedIn("/home")
            }}>Home</p>

            <p className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "explore" ? "toolbar-text-activated" : "")} onClick={() => {
                navigate("/explore") 
            }}>Explore</p>

            <p className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "guide" ? "toolbar-text-activated" : "")} onClick={() => {
                externalLink("/guide")
            }}>Guide <img className="toolbar-icon" src={window.location.origin + "/static/images/external.png"}/></p>

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
