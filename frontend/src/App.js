import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import AccountPopup from "./components/AccountPopup"
import ConfirmPopup from "./components/ConfirmPopup"
import Home from "./pages/Home"
import Landing from "./pages/Landing"
import CreateDataset from "./pages/CreateDataset"
import EditDataset from "./pages/EditDataset"
import Dataset from "./pages/Dataset"
import axios from "axios"
import Explore from "./pages/Explore"
import Guide from "./pages/Guide"
import PublicDataset from "./pages/PublicDataset"
import Notification from "./components/Notification"


export default function App() {

    const navigate = useNavigate()
    const [currentProfile, setCurrentProfile] = useState({
        "user": "",
        "name": ""
    })
    const [loadingCurrentProfile, setLoadingCurrentProfile] = useState(true)
    const [updateProfile, setUpdateProfile] = useState(0) // Increase by 1 whenever currentProfile must be updated

    const [showAccountPopup, setShowAccountPopup] = useState(false)

    const [showConfirmPopup, setShowConfirmPopup] = useState(false)
    const [confirmPopupOnConfirm, setConfirmPopupOnConfirm] = useState(() => {})
    const [confirmPopupMessage, setConfirmPopupMessage] = useState("")

    const [showNotification, setShowNotification] = useState(false)
    const [notificationMessage, setNotificationMessage] = useState("")
    const [notificationType, setNotificationType] = useState("")    // "", "success", or "failure"
    const notificationTimeoutRef = useRef(null);


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


    function activateConfirmPopup(message, onConfirm) {
        setConfirmPopupMessage(message)
        setConfirmPopupOnConfirm(() => onConfirm)
        setShowConfirmPopup(true)
    }

    function checkLoggedIn(toNavigate) {
        if (!loadingCurrentProfile && currentProfile.user !== "") {
            navigate(toNavigate)
        } else if (!loadingCurrentProfile) {
            setShowAccountPopup(true)
        }
    }

    function notification(message, type, delay=3000) {
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }

        setShowNotification(true)
        setNotificationMessage(message)
        setNotificationType(type)

        notificationTimeoutRef.current = setTimeout(() => {
            setShowNotification(false)
            notificationTimeoutRef.current = null;
        }, delay)
    }


    return (
        <div id="main">
            <Notification show={showNotification} message={notificationMessage} type={notificationType}/>

            {showAccountPopup && <AccountPopup setShowAccountPopup={setShowAccountPopup} message={"Please sign in to access this functionality."}/>}
            <Toolbar currentProfile={currentProfile} loadingCurrentProfile={loadingCurrentProfile} checkLoggedIn={checkLoggedIn}></Toolbar>
            {showConfirmPopup && <ConfirmPopup setShowConfirmPopup={setShowConfirmPopup} message={confirmPopupMessage} onConfirm={confirmPopupOnConfirm} />}

            <div id="app">
                <Routes>
                    <Route path="/" element={<Landing />}/>
                    <Route path="/explore" element={<Explore checkLoggedIn={checkLoggedIn}/>}/>
                    <Route path="/guide" element={<Guide />}/>
                    <Route path="/home" element={<Home currentProfile={currentProfile} notification={notification}/>}/>
                    <Route path="/create-dataset" element={<CreateDataset notification={notification}/>}/>
                    <Route path="/edit-dataset/:id" element={<EditDataset activateConfirmPopup={activateConfirmPopup} notification={notification} />}/>
                    <Route path="/datasets/:id" element={<Dataset currentProfile={currentProfile} activateConfirmPopup={activateConfirmPopup} notification={notification}/>}/>
                    <Route path="/datasets/public/:id" element={<PublicDataset />}/>
                </Routes>
            </div>
            

        </div>
    )
}