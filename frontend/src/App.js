import React, { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import Home from "./pages/Home"
import Landing from "./pages/Landing"

export default function App() {

    const [currentProfile, setCurrentProfile] = useState({
        "user": "",
        "name": ""
    })
    const [loadingCurrentProfile, setLoadingCurrentProfile] = useState(true)
    const [updateProfile, setUpdateProfile] = useState(0) // Increase by 1 whenever currentProfile must be updated


    useEffect(() => {
        getCurrentProfile()
    }, [updateProfile])


    function getCurrentProfile() {
        fetch("api/current-profile")
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

            <Toolbar currentProfile={currentProfile} loadingCurrentProfile={loadingCurrentProfile}></Toolbar>

            <div id="app">
                <Routes>
                    <Route path="/" element={<Landing />}/>
                    <Route path="/home" element={<Home />}/>
                </Routes>
            </div>
            

        </div>
    )
}