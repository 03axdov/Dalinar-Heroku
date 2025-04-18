import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import AccountPopup from "./popups/AccountPopup"
import ConfirmPopup from "./popups/ConfirmPopup"
import Home from "./pages/Home"
import Landing from "./pages/Landing"
import CreateDataset from "./pages/CreateDataset"
import EditDataset from "./pages/EditDataset"
import Dataset from "./pages/Dataset"
import axios from "axios"
import Guide from "./pages/Guide"
import Notification from "./components/Notification"
import CreateModel from "./pages/CreateModel"
import Model from "./pages/Model"
import EditModel from "./pages/EditModel"
import { TaskProvider } from "./contexts/TaskContext"
import ProfileBar from "./components/ProfileBar"


// Local: "http://127.0.0.1:8000"
// Production: "https://dalinar.s3.eu-north-1.amazonaws.com"
const BACKEND_URL = "https://dalinar.s3.eu-north-1.amazonaws.com"   // no dash


export default function App() {

    const navigate = useNavigate()
    const [currentProfile, setCurrentProfile] = useState({
        "user": "",
        "name": ""
    })
    const [loadingCurrentProfile, setLoadingCurrentProfile] = useState(true)
    const [updateProfile, setUpdateProfile] = useState(0) // Increase by 1 whenever currentProfile must be updated

    const [showAccountPopup, setShowAccountPopup] = useState(false)
    const [showProfileBar, setShowProfileBar] = useState(false)

    const [showConfirmPopup, setShowConfirmPopup] = useState(false)
    const [confirmPopupOnConfirm, setConfirmPopupOnConfirm] = useState(() => {})
    const [confirmPopupMessage, setConfirmPopupMessage] = useState("")
    const [confirmPopupColor, setConfirmPopupColor] = useState("red")

    const [showNotification, setShowNotification] = useState(false)
    const [notificationMessage, setNotificationMessage] = useState("")
    const [notificationType, setNotificationType] = useState("")    // "", "success", or "failure"
    const notificationTimeoutRef = useRef(null);
    const notificationHover = useRef(false)


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

    function activateConfirmPopup(message, onConfirm, color="red") {
        setConfirmPopupMessage(message)
        setConfirmPopupOnConfirm(() => onConfirm)
        setConfirmPopupColor(color)
        setShowConfirmPopup(true)
    }

    function checkLoggedIn(toNavigate) {
        if (!loadingCurrentProfile && currentProfile.user !== "") {
            navigate(toNavigate)
        } else if (!loadingCurrentProfile) {
            setShowAccountPopup(true)
        }
    }

    function notification(message, type, delay=5000) {
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }

        setShowNotification(true)
        setNotificationMessage(message)
        setNotificationType(type)

        notificationTimeoutRef.current = setInterval(() => {
            if (!notificationHover.current) {
                setShowNotification(false)
                clearInterval(notificationTimeoutRef.current)
                notificationTimeoutRef.current = null;
            }
        }, delay)
    }

    return (
        <div id="main">
            <TaskProvider>
            <Notification show={showNotification} message={notificationMessage} type={notificationType} notificationHover={notificationHover} BACKEND_URL={BACKEND_URL}/>

            {showAccountPopup && <AccountPopup setShowAccountPopup={setShowAccountPopup} message={"Please sign in to access this functionality."}/>}
            <Toolbar currentProfile={currentProfile} loadingCurrentProfile={loadingCurrentProfile} checkLoggedIn={checkLoggedIn} BACKEND_URL={BACKEND_URL} setShowProfileBar={setShowProfileBar}></Toolbar>
            {showProfileBar && <ProfileBar currentProfile={currentProfile} setShowProfileBar={setShowProfileBar} BACKEND_URL={BACKEND_URL}></ProfileBar>}
            {showConfirmPopup && <ConfirmPopup color={confirmPopupColor} setShowConfirmPopup={setShowConfirmPopup} message={confirmPopupMessage} onConfirm={confirmPopupOnConfirm} />}

            <div id="app">
                <Routes>
                    <Route path="/" element={<Landing BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/explore" element={<Home currentProfile={null} 
            notification={notification} 
            BACKEND_URL={BACKEND_URL} 
            checkLoggedIn={checkLoggedIn} 
            is_explore={true}/>}/>
                    <Route path="/guide" element={<Guide BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/home" element={<Home currentProfile={currentProfile} notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/create-dataset" element={<CreateDataset notification={notification} BACKEND_URL={BACKEND_URL} activateConfirmPopup={activateConfirmPopup}/>}/>
                    <Route path="/create-model" element={<CreateModel notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/edit-dataset/:id" element={<EditDataset activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/datasets/:id" element={<Dataset currentProfile={currentProfile} activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/datasets/public/:id" element={<Dataset currentProfile={currentProfile} activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL} isPublic={true}/>}/>
                    <Route path="/models/:id" element={<Model currentProfile={currentProfile} activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                    <Route path="/models/public/:id" element={<Model currentProfile={currentProfile} activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL} checkLoggedIn={checkLoggedIn} isPublic={true}/>}/>
                    <Route path="/edit-model/:id" element={<EditModel activateConfirmPopup={activateConfirmPopup} notification={notification} BACKEND_URL={BACKEND_URL}/>}/>
                </Routes>
            </div>
            
            </TaskProvider>
        </div>
    )
}