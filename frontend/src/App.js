import React, { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import AccountPopup from "./components/AccountPopup"
import Home from "./pages/Home"
import Landing from "./pages/Landing"
import CreateDataset from "./pages/CreateDataset"
import EditDataset from "./pages/EditDataset"
import Dataset from "./pages/Dataset"
import axios from "axios"
import Explore from "./pages/Explore"
import PublicDataset from "./pages/PublicDataset"


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
        axios({
            method: 'GET',
            url: window.location.origin + '/api/current-profile/',
        })
        .then((res) => {
            if (res.data) {
                setCurrentProfile(res.data)
            }
            
            setLoadingCurrentProfile(false)
        }).catch((err) => {
            alert("An error occured while loading the user.")
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
                    <Route path="/explore" element={<Explore />}/>
                    <Route path="/home" element={<Home />}/>
                    <Route path="/create-dataset" element={<CreateDataset />}/>
                    <Route path="/edit-dataset/:id" element={<EditDataset />}/>
                    <Route path="/datasets/:id" element={<Dataset />}/>
                    <Route path="/datasets/public/:id" element={<PublicDataset />}/>
                </Routes>
            </div>
            

        </div>
    )
}