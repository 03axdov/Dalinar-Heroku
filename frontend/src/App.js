import React, { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import AccountPopup from "./components/AccountPopup"
import Home from "./pages/Home"
import Landing from "./pages/Landing"


export default function App() {

    const [currentProfile, setCurrentProfile] = useState({
        "user": "",
        "name": ""
    })
    const [loadingCurrentProfile, setLoadingCurrentProfile] = useState(true)
    const [updateProfile, setUpdateProfile] = useState(0) // Increase by 1 whenever currentProfile must be updated

    const [showAccountPopup, setShowAccountPopup] = useState(false)


    useEffect(() => {
        getCurrentProfile()
    }, [updateProfile])


    function getCurrentProfile() {
        fetch(window.location.origin + "/api/current-profile")
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                setCurrentProfile(data)
            }
            
            setLoadingCurrentProfile(false)
        }).catch((err) => {
            console.log(err)
        })
    }


    return (
        <div id="main">
            {showAccountPopup && <AccountPopup setShowAccountPopup={setShowAccountPopup} message={"Please sign in to access the homepage."}/>}
            <Toolbar currentProfile={currentProfile} loadingCurrentProfile={loadingCurrentProfile} setShowAccountPopup={setShowAccountPopup}></Toolbar>

            <div id="app">
                <Routes>
                    <Route path="/" element={<Landing />}/>
                    <Route path="/home" element={<Home />}/>
                </Routes>
            </div>
            

        </div>
    )
}