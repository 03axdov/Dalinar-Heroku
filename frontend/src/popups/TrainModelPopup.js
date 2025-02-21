import React, {useState} from "react"

function TrainModelPopup({setShowTrainModelPopup, BACKEND_URL}) {

    const [datasets, setDatasets] = useState([])
    const [publicDatasets, setPublicDatasets] = useState([])

    const [loading, setLoading] = useState(false)
    const [sortDatasets, setSortDatasets] = useState("downloads")

    useEffect(() => {
        getDatasets()
    }, [])

    function getDatasets() {
        setLoading(true)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/my-datasets/' + (search ? "?search=" + search : ""),
        })
        .then((res) => {
            if (res.data) {
                setDatasets(sort_datasets(res.data))
            } else {
                setDatasets([])
            }

        }).catch((err) => {
            notification("An error occured while loading your datasets.", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
    }

    function sort_datasets(ds) {
        let tempDatasets = [...ds]

        tempDatasets.sort((d1, d2) => {
            if (sortDatasets == "downloads") {
                if (d1.downloaders.length != d2.downloaders.length) {
                    return d2.downloaders.length - d1.downloaders.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sortDatasets == "alphabetical") {
                return d1.name.localeCompare(d2.name)
            } else if (sortDatasets == "date") {
                return new Date(d2.created_at) - new Date(d1.created_at)
            } else if (sortDatasets == "elements") {
                if (d1.elements.length != d2.elements.length) {
                    return d2.elements.length - d1.elements.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            } else if (sortDatasets == "labels") {
                if (d1.labels.length != d2.labels.length) {
                    return d2.labels.length - d1.labels.length
                } else {
                    return d1.name.localeCompare(d2.name)
                }
                
            }
        })

        return tempDatasets

    }
    
    useEffect(() => {
        if (!loading) {
            setDatasets(sort_datasets(datasets))
        }
    }, [sortDatasets])


    const firstSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoading(true)
        const handler = setTimeout(() => {
            getDatasets()
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [search]);


    return (
        <div className="popup train-model-popup" onClick={() => setShowTrainModelPopup(false)}>
             <div className="train-model-popup-container" onClick={(e) => {
                e.stopPropagation()
            }}>
                <h1 className="create-layer-popup-title">Train model</h1>
                <p className="create-layer-popup-description">
                    Building a model generates the actual model file. The model can then be trained and downloaded. 
                    Note that rebuilding the model will reset it, i.e. updates from training will be erased. A model can be rebuilt as many times as wanted.
                </p>
                
            </div>
        </div>
    )
}


export default TrainModelPopup