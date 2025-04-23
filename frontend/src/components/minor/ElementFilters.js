import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"

function ElementFilters({show, setShow, isModel, sort, setSort,
                        imageDimensions, setImageDimensions, search, setSearch, setLoading, 
                        BACKEND_URL, savedTypeShown, setSavedTypeShown, setSearchParams, startParam,
                        showModelType, setShowModelType}) {

    const [imageWidth, setImageWidth] = useState("")
    const [imageHeight, setImageHeight] = useState("")

    const firstCall = useRef(true)
    useEffect(() => {
        if (firstCall.current) {
            firstCall.current = false; // Set to false after first render
            return;
        }
        const handler = setTimeout(() => {
            let prevDims = [...imageDimensions]
            prevDims[0] = imageWidth
            prevDims[1] = imageHeight
            setImageDimensions(prevDims)
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [imageWidth, imageHeight])

    return (
        <div className="title-forms">
            {savedTypeShown && <select title="Type shown " className="explore-datasets-sort" value={savedTypeShown} onChange={(e) => {
                let temp = {
                        start: startParam,
                        type: e.target.value
                    }
                    setSearchParams(temp)
                    setSavedTypeShown(e.target.value)
                }}>
                <option value="datasets">Datasets</option>
                <option value="models">Models</option>
            </select>}


            {setShow && !isModel && <select title="Show which types" className="explore-datasets-sort" value={show} onChange={(e) => {
                    setShow(e.target.value)
                }}>
                <option value="all">All types</option>
                <option value="image">Image</option>
                <option value="text">Text</option>
            </select>}
            {setShowModelType && <select title="Show which types" className="explore-datasets-sort" value={showModelType} onChange={(e) => {
                    setShowModelType(e.target.value)
                }}>
                <option value="all">All types</option>
                <option value="image">Image</option>
                <option value="text">Text</option>
            </select>}
            {setShow && isModel && <select title="Show which types" className="explore-datasets-sort" value={show} onChange={(e) => {
                    setShow(e.target.value)
                }}>
                <option value="all">All</option>
                <option value="built">Built</option>
                <option value="not-built">Not built</option>
            </select>}

            {!isModel && <select title="Sort by" className="explore-datasets-sort" value={sort} onChange={(e) => {
                setSort(e.target.value)
            }}>
                <option value="downloads">Downloads</option>
                <option value="elements">Elements</option>
                <option value="labels">Labels</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="date">Created</option>
            </select>}
            {isModel && <select title="Sort by" className="explore-datasets-sort" value={sort} onChange={(e) => {
                setSort(e.target.value)
            }}>
                <option value="downloads">Downloads</option>
                <option value="layers">Layers</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="date">Created</option>
            </select>}

            {show == "image" && imageDimensions && setImageDimensions && <div className="image-dimensions-filter-container">
                <input type="number" title="Image width" placeholder="Width" className="image-dimensions-filter" value={imageWidth} onChange={(e) => {
                    setImageWidth(e.target.value)
                }}/>
                <input type="number" title="Image height" placeholder="Height" className="image-dimensions-filter" value={imageHeight} onChange={(e) => {
                    setImageHeight(e.target.value)
                }}/>
            </div>}
            
            <div className="explore-datasets-search-container">
                <input title="Will search names and keywords." type="text" className="explore-datasets-search" value={search} placeholder={"Search " + (isModel ? "models" : "datasets")} onChange={(e) => {
                        setLoading(true)
                        setSearch(e.target.value)
                }} /> 
                <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} alt="Search" />
            </div>
        </div>
    )
}


export default ElementFilters