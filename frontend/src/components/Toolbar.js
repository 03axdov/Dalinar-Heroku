import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar({currentProfile, loadingCurrentProfile, checkLoggedIn, BACKEND_URL}) {
    const navigate = useNavigate()

    function externalLink(link) {
        const URL = window.location.origin + link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <nav id="toolbar">
            <img id="toolbar-logo" src={BACKEND_URL + "/static/images/logoWhite.svg"} onClick={() => navigate("/")}/>
            <a href="/" className="toolbar-text toolbar-title" onClick={(e) => {
                e.preventDefault()
                navigate("/")
            }}>Dalinar</a>

            <a href="/home" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "home" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                checkLoggedIn("/home")
            }}>Home</a>

            <a href="/explore" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "explore" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                navigate("/explore") 
            }}>Explore</a>

            <a href="/guide" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "guide" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                externalLink("/guide")
            }}>Guide <img className="toolbar-icon" src={BACKEND_URL + "/static/images/external.png"}/></a>

            {!loadingCurrentProfile && currentProfile.user === "" &&
                <div className="toolbar-auth">
                    <a className="toolbar-text"  onClick={() => {
                        window.location.href = window.location.origin + "/accounts/signup/"
                    }}>Register</a>
                    <button href="/accounts/login" className="toolbar-button toolbar-register" onClick={(e) => {
                        e.preventDefault()
                        window.location.href = window.location.origin + "/accounts/login/"
                    }}>Sign in</button>

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
