import React, { useState, useEffect } from "react"
import { Routes, Route } from "react-router-dom"

import Toolbar from "./components/Toolbar"
import Home from "./pages/Home"
import Landing from "./pages/Landing"

export default function App() {
    return (
        <div id="main">

            <Toolbar></Toolbar>

            <div id="app">
                <Routes>
                    <Route path="/" element={<Landing />}/>
                    <Route path="/home" element={<Home />}/>
                </Routes>
            </div>
            

        </div>
    )
}