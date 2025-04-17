import React, { useState, useEffect, useRef } from "react"
import DatasetElement from "../components/DatasetElement"
import ModelElement from "../components/ModelElement"
import DatasetElementLoading from "../components/DatasetElementLoading"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from 'axios'
import ElementFilters from "../components/minor/ElementFilters"
import Home from "./Home"

function Explore({checkLoggedIn, BACKEND_URL, notification}) {
    return <>
        <Home currentProfile={null} 
            notification={notification} 
            BACKEND_URL={BACKEND_URL} 
            checkLoggedIn={checkLoggedIn} 
            is_explore={true}></Home>
    </>
}

export default Explore